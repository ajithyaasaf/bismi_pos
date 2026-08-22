import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, AlertTriangle, ArrowDownRight, Truck, RefreshCw } from 'lucide-react';
import { apiClient } from '../../services/api.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { Input } from '../common/Input.js';
import { useUiStore } from '../../store/uiStore.js';
import sound from '../../services/soundService.js';

export const InventoryView: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast, requestPinAuth } = useUiStore();

  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [wastageQty, setWastageQty] = useState('');
  const [wastageReason, setWastageReason] = useState('');

  // Purchase state
  const [supplierName, setSupplierName] = useState('');
  const [purchaseInvoice, setPurchaseInvoice] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');

  // Adjust state
  const [adjustPhysicalKg, setAdjustPhysicalKg] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory');
      return res.data?.data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products');
      return res.data?.data || [];
    },
  });

  // Record Wastage Mutation
  const wastageMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/inventory/wastage', payload);
      return res.data;
    },
    onSuccess: (data) => {
      sound.playTap();
      showToast('success', data.message || 'Wastage recorded.');
      setIsWastageModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: any) => {
      showToast('danger', err.response?.data?.message || 'Failed to record wastage.');
    },
  });

  // Record Purchase Mutation
  const purchaseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/purchases', payload);
      return res.data;
    },
    onSuccess: (data) => {
      sound.playTap();
      showToast('success', data.message || 'Inward poultry batch recorded.');
      setIsPurchaseModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: any) => {
      showToast('danger', err.response?.data?.message || 'Failed to record purchase.');
    },
  });

  // Record Stock Adjust Mutation
  const adjustMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/inventory/adjust', payload);
      return res.data;
    },
    onSuccess: (data) => {
      sound.playTap();
      showToast('success', data.message || 'Stock reconciled.');
      setIsAdjustModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: any) => {
      showToast('danger', err.response?.data?.message || 'Failed to reconcile stock.');
    },
  });

  const handleOpenWastage = () => {
    if (products && products.length > 0) setSelectedProductId(products[0].id);
    setWastageQty('');
    setWastageReason('');
    setIsWastageModalOpen(true);
  };

  const handleOpenPurchase = () => {
    if (products && products.length > 0) setSelectedProductId(products[0].id);
    setSupplierName('');
    setPurchaseInvoice('');
    setPurchaseQty('');
    setPurchaseCost('');
    setIsPurchaseModalOpen(true);
  };

  const handleOpenAdjust = (productId: string, currentStock: number) => {
    setSelectedProductId(productId);
    setAdjustPhysicalKg(currentStock.toString());
    setAdjustReason('');
    setIsAdjustModalOpen(true);
  };

  const handleSaveWastage = () => {
    const qty = parseFloat(wastageQty);
    if (qty > 2.0) {
      requestPinAuth('Wastage > 2 KG', () => {
        wastageMutation.mutate({
          productId: selectedProductId,
          quantityKg: qty,
          reason: wastageReason || 'Dressing yield loss / spoilage',
          pin: '1111',
        });
      });
    } else {
      wastageMutation.mutate({
        productId: selectedProductId,
        quantityKg: qty,
        reason: wastageReason || 'Dressing yield loss',
      });
    }
  };

  const handleSavePurchase = () => {
    const qty = parseFloat(purchaseQty);
    const cost = parseFloat(purchaseCost);
    const total = qty * cost;

    purchaseMutation.mutate({
      supplierName: supplierName || 'Local Farm Poultry Supplier',
      invoiceNo: purchaseInvoice || undefined,
      totalAmount: total,
      items: [
        {
          productId: selectedProductId,
          quantity: qty,
          unitCost: cost,
          unit: 'KG',
        },
      ],
    });
  };

  const handleSaveAdjust = () => {
    requestPinAuth('Stock Count Reconciliation', () => {
      adjustMutation.mutate({
        productId: selectedProductId,
        actualPhysicalKg: parseFloat(adjustPhysicalKg),
        reason: adjustReason || 'Physical stock audit',
        pin: '1111',
      });
    });
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] p-6 bg-surface-muted/30 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-ink-primary">Live Inventory & Stock Control</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Formula: Opening Stock + Inward Purchases - Sales - Wastage = Expected Physical Stock
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleOpenWastage}
            leftIcon={<ArrowDownRight size={16} className="text-amber-600" />}
          >
            Record Spoilage / Wastage
          </Button>

          <Button
            variant="primary"
            onClick={handleOpenPurchase}
            leftIcon={<Truck size={16} />}
          >
            Inward Poultry Batch
          </Button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="flex-1 bg-surface border border-border rounded-2xl shadow-card my-4 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-muted border-b border-border sticky top-0 font-bold text-ink-secondary">
              <tr>
                <th className="p-3.5 pl-6">Product</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Current Stock On Hand</th>
                <th className="p-3.5">Stock Status</th>
                <th className="p-3.5">Est. Asset Value</th>
                <th className="p-3.5 pr-6 text-right">Physical Reconcile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ink-muted">Loading inventory stock...</td>
                </tr>
              ) : (
                inventory?.map((item: any) => {
                  const isWeight = item.product.pricingType === 'WEIGHT_BASED';
                  const stockDisplay = isWeight ? `${item.currentStockKg.toFixed(2)} KG` : `${item.currentStockUnits} Pcs`;
                  const isLow = isWeight
                    ? item.currentStockKg <= item.lowStockThreshold
                    : item.currentStockUnits <= item.lowStockThreshold;

                  const assetValue = isWeight
                    ? item.currentStockKg * item.product.currentCostPrice
                    : item.currentStockUnits * item.product.currentCostPrice;

                  return (
                    <tr key={item.id} className="hover:bg-surface-muted/50 transition-colors">
                      <td className="p-3.5 pl-6">
                        <div className="font-bold text-ink-primary text-sm">{item.product.name}</div>
                        <span className="text-[11px] font-mono text-brand-600">{item.product.code}</span>
                      </td>
                      <td className="p-3.5 font-semibold text-ink-secondary">
                        {item.product.category}
                      </td>
                      <td className="p-3.5">
                        <span className="text-base font-black text-ink-primary">
                          {stockDisplay}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-md text-[11px] font-bold">
                            <AlertTriangle size={12} /> Low Stock (&lt;{item.lowStockThreshold}kg)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md text-[11px] font-bold">
                            ✓ Healthy
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-extrabold text-ink-primary">
                        ₹{Math.max(0, assetValue).toFixed(2)}
                      </td>
                      <td className="p-3.5 pr-6 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenAdjust(item.productId, isWeight ? item.currentStockKg : item.currentStockUnits)}
                          leftIcon={<RefreshCw size={13} />}
                        >
                          Reconcile
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wastage Modal */}
      <Modal
        isOpen={isWastageModalOpen}
        onClose={() => setIsWastageModalOpen(false)}
        title="Record Stock Wastage / Loss"
        subtitle="Log cleaning loss, spoilage, or damaged batches."
        maxWidth="md"
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-ink-secondary mb-1 block">Select Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full text-xs p-2.5 bg-surface border border-border rounded-xl outline-none"
            >
              {products?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>

          <Input
            label="Wastage Quantity (KG)"
            type="number"
            placeholder="e.g. 1.250"
            value={wastageQty}
            onChange={(e) => setWastageQty(e.target.value)}
            autoFocus
          />

          <Input
            label="Reason / Note"
            placeholder="e.g. Skinning dressing loss / end-of-day offal spoilage"
            value={wastageReason}
            onChange={(e) => setWastageReason(e.target.value)}
          />

          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <Button variant="secondary" className="flex-1" onClick={() => setIsWastageModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleSaveWastage} isLoading={wastageMutation.isPending}>
              Record Loss
            </Button>
          </div>
        </div>
      </Modal>

      {/* Inward Purchase Modal */}
      <Modal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title="Inward Poultry Purchase Batch"
        subtitle="Record crates/batches received from farm suppliers."
        maxWidth="md"
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Supplier / Farm Name"
            placeholder="e.g. ABC Broiler Farms / Suguna Mandi"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            autoFocus
          />

          <Input
            label="Supplier Delivery Challan / Invoice #"
            placeholder="e.g. DC-9941"
            value={purchaseInvoice}
            onChange={(e) => setPurchaseInvoice(e.target.value)}
          />

          <div>
            <label className="text-xs font-bold text-ink-secondary mb-1 block">Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full text-xs p-2.5 bg-surface border border-border rounded-xl outline-none"
            >
              {products?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Net Weight Received (KG)"
              type="number"
              placeholder="e.g. 100.0"
              value={purchaseQty}
              onChange={(e) => setPurchaseQty(e.target.value)}
            />

            <Input
              label="Unit Cost / KG (₹)"
              type="number"
              placeholder="e.g. 175.0"
              value={purchaseCost}
              onChange={(e) => setPurchaseCost(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <Button variant="secondary" className="flex-1" onClick={() => setIsPurchaseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleSavePurchase} isLoading={purchaseMutation.isPending}>
              Record Inward Stock
            </Button>
          </div>
        </div>
      </Modal>

      {/* Stock Reconcile Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Physical Stock Count Reconcile"
        subtitle="Adjust stock on hand to match physical scale count."
        maxWidth="md"
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Actual Physical Weight (KG)"
            type="number"
            value={adjustPhysicalKg}
            onChange={(e) => setAdjustPhysicalKg(e.target.value)}
            autoFocus
          />

          <Input
            label="Adjustment Reason"
            placeholder="e.g. Evening closing physical weigh-in"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
          />

          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <Button variant="secondary" className="flex-1" onClick={() => setIsAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleSaveAdjust} isLoading={adjustMutation.isPending}>
              Save Reconciliation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
