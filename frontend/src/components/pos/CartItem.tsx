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
    <div className="flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-surface-muted border border-border transition-colors gap-3">
      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink-muted">{index + 1}.</span>
          <h5 className="text-xs font-bold text-ink-primary truncate">{item.name}</h5>
        </div>

        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[11px] font-medium text-ink-secondary">
            ₹{item.unitPrice.toFixed(0)}/{item.unit}
          </span>
          {item.cuttingName && (
            <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100">
              ✂️ {item.cuttingName} {item.cuttingCharge > 0 ? `(+₹${item.cuttingCharge})` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Weight / Qty Incrementer */}
      <div className="flex items-center bg-surface-muted rounded-lg border border-border p-0.5 flex-shrink-0">
        <button
          onClick={handleDecrement}
          className="p-1.5 rounded-md text-ink-secondary hover:bg-surface hover:text-ink-primary active:scale-95 transition-all"
          title="Decrease"
        >
          <Minus size={14} />
        </button>

        <span className="text-xs font-bold text-ink-primary px-2 min-w-[54px] text-center">
          {displayQty.toFixed(isWeight ? 3 : 0)} {item.unit}
        </span>

        <button
          onClick={handleIncrement}
          className="p-1.5 rounded-md text-ink-secondary hover:bg-surface hover:text-ink-primary active:scale-95 transition-all"
          title="Increase"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Line Item Total & Delete */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-extrabold text-ink-primary min-w-[60px] text-right">
          ₹{item.totalPrice.toFixed(2)}
        </span>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg text-ink-muted hover:text-brand-600 hover:bg-brand-50 transition-colors"
          title="Remove Item"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
};
