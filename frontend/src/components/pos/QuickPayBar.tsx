import React from 'react';
import { Banknote, QrCode, CreditCard, ChevronRight } from 'lucide-react';
import { usePosStore } from '../../store/posStore.js';
import { useUiStore } from '../../store/uiStore.js';
import sound from '../../services/soundService.js';

export interface QuickPayBarProps {
  onQuickCash: (receivedAmount: number) => void;
  onQuickUpi: () => void;
}

export const QuickPayBar: React.FC<QuickPayBarProps> = ({ onQuickCash, onQuickUpi }) => {
  const { getTotals, cart } = usePosStore();
  const { setPaymentModalOpen } = useUiStore();

  const { netTotal } = getTotals();
  const isCartEmpty = cart.length === 0;

  // Calculate dynamic cash denominations above net total
  const cashPresets = React.useMemo(() => {
    if (netTotal <= 0) return [];
    const notes = [100, 200, 500, 1000, 2000];
    const higherNotes = notes.filter((n) => n > netTotal);
    // Take up to 3 relevant denominations
    return higherNotes.slice(0, 2);
  }, [netTotal]);

  return (
    <div className="flex flex-col gap-2 pt-3 border-t border-border mt-auto">
      {/* Primary 1-Tap Pay Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            onQuickCash(netTotal);
          }}
          disabled={isCartEmpty}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-sm transition-all touch-active"
        >
          <Banknote size={18} />
          <span>CASH EXACT (₹{netTotal})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            onQuickUpi();
          }}
          disabled={isCartEmpty}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-brand transition-all touch-active"
        >
          <QrCode size={18} />
          <span>UPI QR (₹{netTotal})</span>
        </button>
      </div>

      {/* Cash Notes & Split Pay */}
      <div className="flex items-center gap-1.5">
        {cashPresets.map((note) => (
          <button
            key={note}
            type="button"
            onClick={() => {
              sound.playTap();
              onQuickCash(note);
            }}
            disabled={isCartEmpty}
            className="flex-1 py-2 px-2 rounded-lg bg-surface hover:bg-surface-muted active:bg-surface-subtle border border-border disabled:opacity-40 text-xs font-bold text-ink-primary transition-all touch-active"
          >
            ₹{note} Cash
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            setPaymentModalOpen(true);
          }}
          disabled={isCartEmpty}
          className="flex-[1.5] py-2 px-2.5 rounded-lg bg-surface hover:bg-surface-muted active:bg-surface-subtle border border-border disabled:opacity-40 text-xs font-bold text-ink-secondary hover:text-ink-primary flex items-center justify-between transition-all touch-active"
        >
          <span className="flex items-center gap-1.5">
            <CreditCard size={14} className="text-ink-muted" />
            Split / Card (F8)
          </span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
