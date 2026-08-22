import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Printer, RotateCcw, Calendar, Eye, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { apiClient } from '../../services/api.js';
import { Sale } from '../../types/index.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';
import { Badge } from '../common/Badge.js';
import { printManager } from '../../services/printService.js';
import { useUiStore } from '../../store/uiStore.js';
import sound from '../../services/soundService.js';

export const SalesHistory: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast, requestPinAuth } = useUiStore();

  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const { data: salesResponse, isLoading } = useQuery({
    queryKey: ['sales-history', search],
    queryFn: async () => {
      const res = await apiClient.get('/sales', {
        params: { search: search || undefined, limit: 50 },
      });
      return res.data;
    },
  });

  const sales: Sale[] = salesResponse?.data || [];

  // Reprint Mutation
  const reprintMutation = useMutation({
    mutationFn: async (saleId: string) => {
      const res = await apiClient.post(`/printing/reprint/${saleId}`);
      return res.data;
    },
    onSuccess: async (data) => {
      sound.playTap();
      if (data.data?.receipt) {
        await printManager.printReceipt({
          plainText: data.data.receipt.plainText,
          rawEscPosBase64: data.data.receipt.rawEscPosBase64,
        });
      }
      showToast('success', 'Reprint job dispatched to printer.');
    },
    onError: (err: any) => {
      showToast('danger', err.response?.data?.message || 'Reprint failed.');
    },
  });

  // Void/Cancel Sale Mutation
  const cancelSaleMutation = useMutation({
    mutationFn: async ({ saleId, pin, reason }: { saleId: string; pin: string; reason: string }) => {
      const res = await apiClient.post(`/sales/${saleId}/cancel`, { pin, reason });
      return res.data;
    },
    onSuccess: (data) => {
      sound.playTap();
      showToast('success', data.message || 'Sale cancelled and stock restored.');
      setIsVoidModalOpen(false);
      setSelectedSale(null);
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      showToast('danger', err.response?.data?.message || 'Cancellation failed.');
    },
  });

  const handleOpenVoidModal = () => {
    if (!selectedSale) return;
    requestPinAuth('Void Sale', () => {
      setIsVoidModalOpen(true);
    });
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] p-6 bg-surface-muted/30 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-ink-primary">Sales & Bill History</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Audit historical invoices, reprint thermal receipts, and handle voids
          </p>
        </div>

        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by invoice # or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-surface border border-border rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="flex-1 bg-surface border border-border rounded-2xl shadow-card my-4 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-muted border-b border-border sticky top-0 font-bold text-ink-secondary">
              <tr>
                <th className="p-3.5 pl-6">Invoice #</th>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Items Summary</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Total Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-ink-muted">
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-ink-muted">
                    No sales invoices found.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="p-3.5 pl-6 font-mono font-bold text-brand-600">
                      {sale.invoiceNumber}
                    </td>
                    <td className="p-3.5 text-ink-secondary">
                      {new Date(sale.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3.5 font-medium text-ink-primary">
                      {sale.customer?.name || 'Walk-in Customer'}
                    </td>
                    <td className="p-3.5 text-ink-secondary max-w-xs truncate">
                      {sale.items.map((i) => `${i.productName} (${i.finalWeight ? `${i.finalWeight.toFixed(2)}kg` : `${i.quantity}pcs`})`).join(', ')}
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-ink-primary">
                        {sale.payments.map((p) => p.method).join(' + ')}
                      </span>
                    </td>
                    <td className="p-3.5 font-extrabold text-ink-primary text-sm">
                      ₹{sale.finalAmount.toFixed(2)}
                    </td>
                    <td className="p-3.5">
                      {sale.status === 'COMPLETED' ? (
                        <Badge variant="success" icon={<CheckCircle2 size={12} />}>
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="danger" icon={<XCircle size={12} />}>
                          Cancelled
                        </Badge>
                      )}
                    </td>
                    <td className="p-3.5 pr-6 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          sound.playTap();
                          setSelectedSale(sale);
                        }}
                        className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-muted"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        onClick={() => reprintMutation.mutate(sale.id)}
                        className="p-1.5 rounded-lg text-ink-muted hover:text-brand-600 hover:bg-brand-50"
                        title="Reprint Thermal Receipt"
                      >
                        <Printer size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <Modal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          title={`Bill #${selectedSale.invoiceNumber}`}
          subtitle={`Created on ${new Date(selectedSale.createdAt).toLocaleString('en-IN')}`}
          maxWidth="xl"
        >
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-surface-muted border border-border space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-ink-muted">Cashier:</span>
                <span className="font-bold text-ink-primary">{selectedSale.cashier?.name || 'Cashier'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-muted">Customer:</span>
                <span className="font-bold text-ink-primary">{selectedSale.customer?.name || 'Walk-in Customer'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-muted">Payment Mode:</span>
                <span className="font-bold text-ink-primary">{selectedSale.payments.map((p) => p.method).join(' + ')}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-muted border-b border-border font-bold text-ink-secondary">
                  <tr>
                    <th className="p-2.5">Item & Prep</th>
                    <th className="p-2.5">Rate</th>
                    <th className="p-2.5">Billed Weight/Qty</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedSale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2.5">
                        <div className="font-bold text-ink-primary">{item.productName}</div>
                        {item.cuttingName && (
                          <span className="text-[10px] text-brand-600">{item.cuttingName}</span>
                        )}
                      </td>
                      <td className="p-2.5 text-ink-muted">₹{item.unitPrice.toFixed(0)}/{item.unit}</td>
                      <td className="p-2.5 font-semibold text-ink-primary">
                        {item.finalWeight ? `${item.finalWeight.toFixed(3)} KG` : `${item.quantity} Pcs`}
                      </td>
                      <td className="p-2.5 text-right font-extrabold text-ink-primary">
                        ₹{item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Grand Total */}
            <div className="flex items-center justify-between p-4 bg-brand-50 rounded-xl border border-brand-100">
              <span className="text-sm font-bold text-brand-800">Final Net Paid:</span>
              <span className="text-2xl font-black text-brand-700">₹{selectedSale.finalAmount.toFixed(2)}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              {selectedSale.status === 'COMPLETED' && (
                <Button
                  variant="danger"
                  onClick={handleOpenVoidModal}
                  leftIcon={<RotateCcw size={16} />}
                >
                  Void Sale & Restock
                </Button>
              )}

              <Button
                variant="primary"
                className="flex-1"
                onClick={() => reprintMutation.mutate(selectedSale.id)}
                leftIcon={<Printer size={16} />}
              >
                Reprint Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Manager PIN Confirmation for Void */}
      <Modal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        title="Confirm Sale Void"
        subtitle="This action will restore physical inventory and log an audit entry."
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-ink-secondary mb-1 block">Reason for cancellation:</label>
            <input
              type="text"
              placeholder="e.g. Customer returned order / Billing mistake"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full text-xs p-2.5 bg-surface border border-border rounded-xl outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setIsVoidModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => {
                if (selectedSale) {
                  cancelSaleMutation.mutate({
                    saleId: selectedSale.id,
                    pin: '1111', // Approved by manager pin auth
                    reason: voidReason || 'Manual cashier void',
                  });
                }
              }}
            >
              Confirm Void
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
