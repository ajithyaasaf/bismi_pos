import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Edit2, TrendingUp, DollarSign } from 'lucide-react';
import { apiClient } from '../../services/api.js';
import { Product } from '../../types/index.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { Input } from '../common/Input.js';
import { useUiStore } from '../../store/uiStore.js';
import sound from '../../services/soundService.js';

export const ProductManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast, requestPinAuth } = useUiStore();

  const [selectedProductForRate, setSelectedProductForRate] = useState<Product | null>(null);
  const [newSellingRate, setNewSellingRate] = useState<string>('');
  const [newCostRate, setNewCostRate] = useState<string>('');
  const [rateChangeReason, setRateChangeReason] = useState<string>('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products');
      return res.data?.data || [];
    },
  });

  // Price Rate Update Mutation
  const updateRateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/pricing/update-rate', payload);
      return res.data;
    },
    onSuccess: (data) => {
      sound.playTap();
      showToast('success', data.message || 'Price rate updated successfully.');
      setSelectedProductForRate(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      showToast('danger', err.response?.data?.message || 'Price update failed.');
    },
  });

  const handleOpenRateModal = (prod: Product) => {
    setSelectedProductForRate(prod);
    setNewSellingRate(prod.currentSellingPrice.toString());
    setNewCostRate(prod.currentCostPrice.toString());
    setRateChangeReason('');
  };

  const handleSaveRate = () => {
    if (!selectedProductForRate) return;
    requestPinAuth('Update Price Rate', () => {
      updateRateMutation.mutate({
        productId: selectedProductForRate.id,
        newSellingPrice: parseFloat(newSellingRate),
        newCostPrice: parseFloat(newCostRate),
        reason: rateChangeReason || 'Daily poultry market rate update',
        pin: '1111', // Approved by manager pin auth
      });
    });
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] p-3 md:p-6 pb-24 md:pb-6 bg-surface-muted/30 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-ink-primary">Product Catalog & Daily Rates</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Manage selling rates, cost prices, cutting options, and anomaly thresholds
          </p>
        </div>
      </div>

      {/* Product List Table */}
      <div className="flex-1 bg-surface border border-border rounded-2xl shadow-card my-4 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-muted border-b border-border sticky top-0 font-bold text-ink-secondary">
              <tr>
                <th className="p-3.5 pl-6">Code</th>
                <th className="p-3.5">Product Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Pricing Unit</th>
                <th className="p-3.5">Cost Price</th>
                <th className="p-3.5">Selling Rate</th>
                <th className="p-3.5">Cutting Options</th>
                <th className="p-3.5 pr-6 text-right">Update Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-ink-muted">Loading product catalog...</td>
                </tr>
              ) : (
                products?.map((prod: Product) => (
                  <tr key={prod.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="p-3.5 pl-6 font-mono font-bold text-brand-600">
                      {prod.code}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-ink-primary text-sm">{prod.name}</div>
                      {prod.nameLocal && (
                        <div className="text-[11px] text-ink-muted">{prod.nameLocal}</div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="bg-surface-muted border border-border px-2 py-1 rounded-md text-[11px] font-semibold text-ink-secondary">
                        {prod.category}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-ink-secondary">
                      {prod.pricingType === 'WEIGHT_BASED' ? 'WEIGHT (KG)' : 'QUANTITY (Units)'}
                    </td>
                    <td className="p-3.5 font-semibold text-ink-muted">
                      ₹{prod.currentCostPrice.toFixed(2)}
                    </td>
                    <td className="p-3.5 font-extrabold text-ink-primary text-sm">
                      ₹{prod.currentSellingPrice.toFixed(2)} / {prod.unit}
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {prod.options?.map((opt) => (
                          <span
                            key={opt.id}
                            className="bg-brand-50 border border-brand-100 text-brand-700 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                          >
                            {opt.name} {opt.extraCharge > 0 ? `(+₹${opt.extraCharge})` : ''}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 pr-6 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenRateModal(prod)}
                        leftIcon={<TrendingUp size={14} className="text-brand-600" />}
                      >
                        Update Rate
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Rate Updater Modal */}
      {selectedProductForRate && (
        <Modal
          isOpen={!!selectedProductForRate}
          onClose={() => setSelectedProductForRate(null)}
          title={`Update Live Rate: ${selectedProductForRate.name}`}
          subtitle="Updates immediate POS checkout price and preserves historical price audit."
          maxWidth="md"
        >
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-brand-50 rounded-xl border border-brand-100 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-brand-700">Current Selling Rate</span>
                <div className="text-2xl font-black text-brand-800">
                  ₹{selectedProductForRate.currentSellingPrice.toFixed(2)} / {selectedProductForRate.unit}
                </div>
              </div>
              <DollarSign size={28} className="text-brand-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="New Selling Price (₹)"
                type="number"
                value={newSellingRate}
                onChange={(e) => setNewSellingRate(e.target.value)}
                autoFocus
              />

              <Input
                label="Cost / Procurement Price (₹)"
                type="number"
                value={newCostRate}
                onChange={(e) => setNewCostRate(e.target.value)}
              />
            </div>

            <Input
              label="Reason for Rate Change"
              placeholder="e.g. Daily market mandi hike / Festival demand"
              value={rateChangeReason}
              onChange={(e) => setRateChangeReason(e.target.value)}
            />

            <div className="flex items-center gap-3 pt-3 border-t border-border">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setSelectedProductForRate(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSaveRate}
                isLoading={updateRateMutation.isPending}
              >
                Apply New Rate
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
