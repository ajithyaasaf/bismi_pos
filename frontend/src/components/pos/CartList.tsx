import React, { useState } from 'react';
import { ShoppingBag, User, PauseCircle, Send, Trash2, Tag, Undo2 } from 'lucide-react';
import { usePosStore } from '../../store/posStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { CartItem } from './CartItem.js';
import { Button } from '../common/Button.js';
import { QuickPayBar } from './QuickPayBar.js';
import sound from '../../services/soundService.js';

export interface CartListProps {
  onQuickCheckout: (payments: any[]) => void;
  onSendToPrep: () => void;
}

export const CartList: React.FC<CartListProps> = ({ onQuickCheckout, onSendToPrep }) => {
  const {
    cart,
    selectedCustomer,
    discountAmount,
    lastRemovedItem,
    getTotals,
    setDiscount,
    clearCart,
    undoRemove,
  } = usePosStore();

  const { setHeldDrawerOpen } = useUiStore();
  const [isDiscountInputOpen, setIsDiscountInputOpen] = useState(false);
  const [tempDiscount, setTempDiscount] = useState('');

  const { subtotal, discount, rounding, netTotal, totalItemsCount } = getTotals();
  const isCartEmpty = cart.length === 0;

  const handleApplyDiscount = () => {
    const val = parseFloat(tempDiscount) || 0;
    setDiscount(val);
    setIsDiscountInputOpen(false);
    sound.playTap();
  };

  const handleQuickCashPay = (received: number) => {
    const change = Math.max(0, received - netTotal);
    onQuickCheckout([
      {
        method: 'CASH',
        amount: netTotal,
        cashReceived: received,
        cashChange: change,
      },
    ]);
  };

  const handleQuickUpiPay = () => {
    onQuickCheckout([
      {
        method: 'UPI',
        amount: netTotal,
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-2xl p-4 shadow-card">
      {/* Cart Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
            <ShoppingBag size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink-primary">Current Bill</h3>
            <span className="text-[11px] font-semibold text-ink-muted">
              {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} in order
            </span>
          </div>
        </div>

        {/* Customer Pill */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-muted hover:bg-surface-subtle border border-border text-xs font-semibold text-ink-secondary transition-colors"
          >
            <User size={14} className="text-ink-muted" />
            <span className="truncate max-w-[110px]">
              {selectedCustomer?.name || 'Walk-in'}
            </span>
          </button>

          {!isCartEmpty && (
            <button
              onClick={() => {
                sound.playTap();
                clearCart();
              }}
              className="p-1.5 rounded-lg text-ink-muted hover:text-brand-600 hover:bg-brand-50 transition-colors"
              title="Clear Cart"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Undo Banner if item recently removed */}
      {lastRemovedItem && (
        <div className="flex items-center justify-between p-2 mt-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium animate-in fade-in">
          <span>Removed "{lastRemovedItem.item.name}"</span>
          <button
            onClick={undoRemove}
            className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 underline"
          >
            <Undo2 size={13} /> Undo
          </button>
        </div>
      )}

      {/* Cart Items Scroll Area */}
      <div className="flex-1 overflow-y-auto my-2 pr-1 space-y-2">
        {isCartEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-ink-muted py-12">
            <div className="p-3 rounded-full bg-surface-muted border border-border mb-2 text-ink-light">
              <ShoppingBag size={24} />
            </div>
            <p className="text-xs font-bold text-ink-secondary">Your cart is empty</p>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Tap a product or speak to start billing
            </p>
          </div>
        ) : (
          cart.map((item, idx) => (
            <CartItem key={item.id} item={item} index={idx} />
          ))
        )}
      </div>

      {/* Summary Calculation Block */}
      <div className="pt-3 border-t border-border flex-shrink-0 space-y-1.5">
        <div className="flex justify-between text-xs text-ink-secondary font-medium">
          <span>Subtotal</span>
          <span className="font-semibold text-ink-primary">₹{subtotal.toFixed(2)}</span>
        </div>

        {/* Discount Row */}
        <div className="flex justify-between items-center text-xs text-ink-secondary">
          <button
            type="button"
            onClick={() => {
              setIsDiscountInputOpen(!isDiscountInputOpen);
              setTempDiscount(discountAmount > 0 ? discountAmount.toString() : '');
            }}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
          >
            <Tag size={13} />
            {discount > 0 ? `Discount (-₹${discount.toFixed(2)})` : '+ Add Discount'}
          </button>
          {discount > 0 && (
            <span className="font-bold text-brand-600">-₹{discount.toFixed(2)}</span>
          )}
        </div>

        {isDiscountInputOpen && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-muted border border-border animate-in fade-in">
            <input
              type="number"
              placeholder="Discount ₹"
              value={tempDiscount}
              onChange={(e) => setTempDiscount(e.target.value)}
              className="w-full text-xs bg-surface border border-border rounded px-2 py-1 outline-none focus:border-brand-500"
              autoFocus
            />
            <Button size="sm" onClick={handleApplyDiscount}>Apply</Button>
            <button
              onClick={() => setIsDiscountInputOpen(false)}
              className="text-xs text-ink-muted hover:text-ink-primary font-semibold"
            >
              Cancel
            </button>
          </div>
        )}

        {rounding !== 0 && (
          <div className="flex justify-between text-[11px] text-ink-muted">
            <span>Round Off</span>
            <span>{rounding > 0 ? `+₹${rounding.toFixed(2)}` : `-₹${Math.abs(rounding).toFixed(2)}`}</span>
          </div>
        )}

        {/* Grand Total Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-border/80">
          <div>
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wider block">
              Total Payable
            </span>
            <span className="text-[11px] text-ink-muted">Includes all cutting charges</span>
          </div>
          <span className="text-3xl font-extrabold text-ink-primary tracking-tight">
            ₹{netTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Secondary Action: Send to Prep Queue / Hold Bill */}
      <div className="grid grid-cols-2 gap-2 pt-2.5">
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            onSendToPrep();
          }}
          disabled={isCartEmpty}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 disabled:opacity-40 text-blue-700 font-bold text-xs border border-blue-200 transition-all touch-active"
        >
          <Send size={14} />
          <span>Send to Prep Queue</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setHeldDrawerOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-surface-muted hover:bg-surface-subtle border border-border text-ink-secondary hover:text-ink-primary font-bold text-xs transition-all touch-active"
        >
          <PauseCircle size={14} />
          <span>Hold Bill (F3)</span>
        </button>
      </div>

      {/* Quick Pay Bar */}
      <QuickPayBar onQuickCash={handleQuickCashPay} onQuickUpi={handleQuickUpiPay} />
    </div>
  );
};
