import React from 'react';
import { X, Play, Clock, ShoppingBag } from 'lucide-react';
import { useUiStore } from '../../store/uiStore.js';
import { usePosStore } from '../../store/posStore.js';
import { Button } from '../common/Button.js';
import { EmptyState } from '../common/EmptyState.js';
import sound from '../../services/soundService.js';

export const HeldOrdersDrawer: React.FC = () => {
  const { isHeldDrawerOpen, setHeldDrawerOpen } = useUiStore();
  const { heldOrders, loadOrderToCart } = usePosStore();

  if (!isHeldDrawerOpen) return null;

  const handleResume = (order: any) => {
    sound.playTap();
    loadOrderToCart(order);
    setHeldDrawerOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-primary/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-surface h-full shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-ink-primary">Held Bills Queue</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              {heldOrders.length} {heldOrders.length === 1 ? 'bill' : 'bills'} on hold
            </p>
          </div>
          <button
            onClick={() => setHeldDrawerOpen(false)}
            className="p-2 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Orders List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {heldOrders.length === 0 ? (
            <EmptyState
              icon={<Clock size={28} />}
              title="No bills on hold"
              description="Bills you place on hold during customer pauses will appear here."
            />
          ) : (
            heldOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl border border-border bg-surface hover:border-brand-500/50 shadow-card transition-all flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-brand-600 bg-brand-50 px-2 py-1 rounded-md border border-brand-100">
                    Token #{order.dailyOrderNumber}
                  </span>
                  <span className="text-xs font-bold text-ink-muted">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-ink-primary">
                    {order.customerName || 'Walk-in Customer'}
                  </h4>
                  <p className="text-[11px] text-ink-secondary mt-0.5">
                    {order.items.map((i) => `${i.productName} (${i.requestedWeight || i.quantity} ${i.requestedWeight ? 'KG' : 'Pcs'})`).join(', ')}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <span className="text-sm font-extrabold text-ink-primary">
                    ₹{order.totalEstimatedAmount.toFixed(2)}
                  </span>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleResume(order)}
                    leftIcon={<Play size={14} />}
                  >
                    Resume Bill
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
