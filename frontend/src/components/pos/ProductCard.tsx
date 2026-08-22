import React from 'react';
import { Product } from '../../types/index.js';
import { usePosStore } from '../../store/posStore.js';
import sound from '../../services/soundService.js';

export interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { selectProduct } = usePosStore();

  const isLowStock =
    product.inventoryItem &&
    (product.pricingType === 'WEIGHT_BASED'
      ? product.inventoryItem.currentStockKg <= product.inventoryItem.lowStockThreshold
      : product.inventoryItem.currentStockUnits <= product.inventoryItem.lowStockThreshold);

  return (
    <button
      onClick={() => {
        sound.playTap();
        selectProduct(product);
      }}
      className="group relative bg-surface hover:bg-brand-50/40 active:bg-brand-100/50 border border-border hover:border-brand-500/50 rounded-2xl p-4 text-left flex flex-col justify-between transition-all duration-100 shadow-card hover:shadow-cardHover touch-active min-h-[110px]"
    >
      <div>
        <div className="flex items-start justify-between gap-1 mb-1">
          <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
            {product.code}
          </span>
          {isLowStock && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Low Stock
            </span>
          )}
        </div>
        <h4 className="text-sm font-bold text-ink-primary leading-tight line-clamp-1 group-hover:text-brand-600 transition-colors">
          {product.name}
        </h4>
        {product.nameLocal && (
          <p className="text-[11px] font-medium text-ink-muted mt-0.5 line-clamp-1">
            {product.nameLocal}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-border/60">
        <div className="flex items-baseline gap-1">
          <span className="text-base font-extrabold text-ink-primary">
            ₹{product.currentSellingPrice.toFixed(0)}
          </span>
          <span className="text-[11px] font-semibold text-ink-muted">
            / {product.unit}
          </span>
        </div>
        {product.options && product.options.length > 0 && (
          <span className="text-[10px] font-medium text-ink-muted bg-surface-muted px-1.5 py-0.5 rounded">
            {product.options.length} cuts
          </span>
        )}
      </div>
    </button>
  );
};
