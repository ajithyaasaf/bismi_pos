import React from 'react';
import { X, CheckCircle2, ShoppingBag } from 'lucide-react';
import { useUiStore } from '../../store/uiStore.js';
import { usePosStore } from '../../store/posStore.js';
import { Button } from '../common/Button.js';
import { EmptyState } from '../common/EmptyState.js';
import sound from '../../services/soundService.js';

export const ReadyOrdersDrawer: React.FC = () => {
  const { isReadyDrawerOpen, setReadyDrawerOpen } = useUiStore();
  const { readyOrders, loadOrderToCart } = usePosStore();

  if (!isReadyDrawerOpen) return null;

  const handleBillOrder = (order: any) => {
    sound.playTap();
    loadOrderToCart(order);
    setReadyDrawerOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-primary/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-surface h-full shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-emerald-50/50">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <h3 className="text-base font-bold text-emerald-950">
                Ready from Cutting Queue
              </h3>
            </div>
            <p className="text-xs text-emerald-800 mt-0.5">
              {readyOrders.length} {readyOrders.length === 1 ? 'order' : 'orders'} cut & weighed
            </p>
          </div>
          <button
            onClick={() => setReadyDrawerOpen(false)}
            className="p-2 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Orders List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {readyOrders.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={28} className="text-emerald-600" />}
              title="No ready orders"
              description="Orders completed by the preparation cutting worker will appear here."
            />
          ) : (
            readyOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-card transition-all flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-md border border-emerald-300">
                    Token #{order.dailyOrderNumber}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    ✓ Ready
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-ink-primary">
                    {order.customerName || 'Walk-in Customer'}
                  </h4>
                  <div className="space-y-1 mt-1.5">
                    {order.items.map((item) => (
                      <div key={item.id} className="text-xs flex justify-between">
                        <span className="font-semibold text-ink-primary">
                          {item.productName} {item.option?.name ? `(${item.option.name})` : ''}
                        </span>
                        <span className="font-extrabold text-emerald-700">
                          {item.finalWeight ? `${item.finalWeight.toFixed(3)} KG` : `${item.quantity} Pcs`}
                          {item.requestedWeight && item.finalWeight && item.requestedWeight !== item.finalWeight && (
                            <span className="text-[10px] text-ink-muted line-through ml-1">
                              {item.requestedWeight.toFixed(3)} KG
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60">
                  <div>
                    <span className="text-[10px] font-bold text-ink-muted uppercase block">
                      Actual Bill Total
                    </span>
                    <span className="text-base font-extrabold text-ink-primary">
                      ₹{order.totalFinalAmount.toFixed(2)}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleBillOrder(order)}
                    leftIcon={<ShoppingBag size={14} />}
                  >
                    Bill Now
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
