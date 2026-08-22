import React, { useState, useMemo, useEffect } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Product } from '../../types/index.js';
import { ProductCard } from './ProductCard.js';

export interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

const ORDERED_CATEGORIES = ['ALL', 'Fresh Meat', 'Offal', 'Prime Cuts', 'Eggs', 'Masala'];

export const ProductGrid: React.FC<ProductGridProps> = ({ products, isLoading }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = useMemo(() => {
    const productCats = new Set<string>();
    products.forEach((p) => {
      if (p.category) productCats.add(p.category);
    });

    // Show the requested 5 categories in exact order
    const ordered = ORDERED_CATEGORIES.filter((c) => c === 'ALL' || productCats.has(c));
    productCats.forEach((c) => {
      if (!ordered.includes(c)) ordered.push(c);
    });
    return ordered;
  }, [products]);

  // Global F1 search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        const searchInput = document.getElementById('product-search-input');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.nameLocal && p.nameLocal.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Category Pills & Search Bar */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-[70%]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-100 touch-active border ${
                selectedCategory === cat
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-surface hover:bg-surface-muted text-ink-secondary border-border'
              }`}
            >
              {cat === 'ALL' ? '🔥 All Products' : cat}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            id="product-search-input"
            type="text"
            placeholder="Search items (F1)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-border rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none text-ink-primary font-medium placeholder:text-ink-muted min-h-[36px]"
          />
        </div>
      </div>

      {/* Grid of Product Cards */}
      <div className="flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 bg-surface-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-ink-muted">
            <Sparkles size={28} className="text-ink-light mb-2" />
            <p className="text-xs font-semibold">No products found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
