import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { CartItem as CartItemType } from '../../types/index.js';
import { usePosStore } from '../../store/posStore.js';
import { useUiStore } from '../../store/uiStore.js';

export interface CartItemProps {
  item: CartItemType;
  index: number;
}

export const CartItem: React.FC<CartItemProps> = ({ item, index }) => {
  const { updateItemWeight, removeItem, undoRemove } = usePosStore();
  const { showToast } = useUiStore();

  const isWeight = item.pricingType === 'WEIGHT_BASED';
  const displayQty = item.finalWeight !== null && item.finalWeight !== undefined ? item.finalWeight : item.quantity;

  const handleIncrement = () => {
    const step = isWeight ? 0.25 : 1;
    updateItemWeight(item.id, Number((displayQty + step).toFixed(3)));
  };

  const handleDecrement = () => {
    const step = isWeight ? 0.25 : 1;
    if (displayQty > step) {
      updateItemWeight(item.id, Number((displayQty - step).toFixed(3)));
    } else {
      handleDelete();
    }
  };

  const handleDelete = () => {
    removeItem(item.id);
    showToast('info', `Removed ${item.name}`, 4000);
  };

  return (
    <div className="flex flex-col p-3 rounded-2xl bg-surface hover:bg-surface-muted/50 border border-border shadow-xs transition-all gap-2">
      {/* 1. Header Row: Number + Full Product Name + Line Total */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          <span className="text-xs font-bold text-ink-muted mt-0.5">{index + 1}.</span>
          <div className="min-w-0 flex-1">
            <h5 className="text-xs md:text-sm font-bold text-ink-primary leading-snug break-words">
              {item.name}
            </h5>
            {/* Rates & Cutting Badge Row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-[11px] font-semibold text-ink-secondary">
                ₹{item.unitPrice.toFixed(0)}/{item.unit}
              </span>
              {item.cuttingName && (
                <span className="text-[10px] md:text-[11px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100/80 inline-flex items-center gap-1">
                  <span>✂️</span>
                  <span>{item.cuttingName}</span>
                  {item.cuttingCharge > 0 && <span>(+₹{item.cuttingCharge})</span>}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Line Item Total */}
        <div className="text-right flex-shrink-0">
          <div className="text-xs md:text-sm font-extrabold text-ink-primary">
            ₹{item.totalPrice.toFixed(2)}
          </div>
        </div>
      </div>

      {/* 2. Actions Row: Remove Button on Left, Weight / Qty Incrementer on Right */}
      <div className="flex items-center justify-between pt-1.5 border-t border-dashed border-border/70">
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 text-[11px] font-semibold text-ink-muted hover:text-brand-600 active:scale-95 transition-all px-1.5 py-1 rounded-lg hover:bg-brand-50"
          title="Remove Item"
        >
          <Trash2 size={13} />
          <span>Remove</span>
        </button>

        {/* Weight / Qty Incrementer */}
        <div className="flex items-center bg-surface-muted rounded-xl border border-border p-0.5 shadow-xs">
          <button
            onClick={handleDecrement}
            className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-ink-secondary hover:bg-surface hover:text-ink-primary active:scale-95 transition-all"
            title="Decrease"
          >
            <Minus size={13} />
          </button>

          <span className="text-[11px] md:text-xs font-black text-ink-primary px-2 min-w-[58px] text-center">
            {displayQty.toFixed(isWeight ? 3 : 0)} {item.unit}
          </span>

          <button
            onClick={handleIncrement}
            className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-ink-secondary hover:bg-surface hover:text-ink-primary active:scale-95 transition-all"
            title="Increase"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
