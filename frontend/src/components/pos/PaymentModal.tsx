import React, { useState, useEffect } from 'react';
import { Banknote, QrCode, CreditCard, Users, Check, AlertCircle } from 'lucide-react';
import { usePosStore } from '../../store/posStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { Numpad } from '../common/Numpad.js';
import sound from '../../services/soundService.js';

export interface PaymentModalProps {
  onConfirmPayment: (payments: any[]) => void;
  isLoading?: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ onConfirmPayment, isLoading }) => {
  const { isPaymentModalOpen, setPaymentModalOpen } = useUiStore();
  const { getTotals, selectedCustomer } = usePosStore();

  const { netTotal } = getTotals();

  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'SPLIT'>('CASH');
  const [cashReceivedInput, setCashReceivedInput] = useState<string>(netTotal.toString());
  const [upiAmount, setUpiAmount] = useState<string>('0');
  const [cardAmount, setCardAmount] = useState<string>('0');

  useEffect(() => {
    if (isPaymentModalOpen) {
      setCashReceivedInput(netTotal.toString());
      setUpiAmount('0');
      setCardAmount('0');
    }
  }, [isPaymentModalOpen, netTotal]);

  const parsedCash = parseFloat(cashReceivedInput) || 0;
  const cashChange = Math.max(0, parsedCash - netTotal);
  const remainingDue = Math.max(0, netTotal - parsedCash);

  const cashNotes = [100, 200, 500, 1000, 2000];

  const handleSetCashNote = (amount: number) => {
    sound.playTap();
    setCashReceivedInput(amount.toString());
  };

  const handleSubmit = () => {
    if (paymentMode === 'CASH') {
      onConfirmPayment([
        {
          method: 'CASH',
          amount: netTotal,
          cashReceived: parsedCash,
          cashChange,
        },
      ]);
    } else if (paymentMode === 'UPI') {
      onConfirmPayment([
        {
          method: 'UPI',
          amount: netTotal,
        },
      ]);
    } else if (paymentMode === 'CARD') {
      onConfirmPayment([
        {
          method: 'CARD',
          amount: netTotal,
        },
      ]);
    } else if (paymentMode === 'CREDIT') {
      onConfirmPayment([
        {
          method: 'CREDIT',
          amount: netTotal,
        },
      ]);
    }
    setPaymentModalOpen(false);
  };

  return (
    <Modal
      isOpen={isPaymentModalOpen}
      onClose={() => setPaymentModalOpen(false)}
      title="Settle Bill Payment"
      subtitle={`Total Net Payable: ₹${netTotal.toFixed(2)}`}
      maxWidth="2xl"
    >
      <div className="flex flex-col gap-4">
        {/* Payment Method Selector Tabs */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'CASH', label: '💵 Cash', icon: <Banknote size={16} /> },
            { id: 'UPI', label: '📱 UPI QR', icon: <QrCode size={16} /> },
            { id: 'CARD', label: '💳 Card', icon: <CreditCard size={16} /> },
            { id: 'CREDIT', label: '📝 Udhaar', icon: <Users size={16} /> },
          ].map((tab) => {
            const isSelected = paymentMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  sound.playTap();
                  setPaymentMode(tab.id as any);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all touch-active gap-1 ${
                  isSelected
                    ? 'bg-brand-500 text-white border-brand-500 shadow-brand'
                    : 'bg-surface hover:bg-surface-muted border-border text-ink-primary'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* CASH PAYMENT UI */}
        {paymentMode === 'CASH' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="flex flex-col gap-3">
              {/* Change Indicator Card */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                  Change to Return Customer
                </span>
                <div className="text-3xl font-extrabold text-emerald-700 mt-0.5">
                  ₹{cashChange.toFixed(2)}
                </div>
                {remainingDue > 0 && (
                  <span className="text-xs font-bold text-amber-700 block mt-1">
                    ⚠ Remaining: ₹{remainingDue.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Quick Note Presets */}
              <div>
                <label className="text-xs font-bold text-ink-secondary mb-1.5 block">
                  Quick Cash Notes
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetCashNote(netTotal)}
                    className="py-2.5 px-2 rounded-xl bg-surface hover:bg-surface-muted border border-border text-xs font-bold text-brand-600 touch-active"
                  >
                    Exact (₹{netTotal})
                  </button>
                  {cashNotes.map((note) => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => handleSetCashNote(note)}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all touch-active ${
                        parsedCash === note
                          ? 'bg-brand-50 border-brand-500 text-brand-700'
                          : 'bg-surface hover:bg-surface-muted border-border text-ink-primary'
                      }`}
                    >
                      ₹{note}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Cash Received Numpad */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-ink-secondary">
                  Cash Received Amount
                </label>
                <span className="text-sm font-extrabold text-ink-primary">
                  ₹{cashReceivedInput || '0'}
                </span>
              </div>
              <Numpad
                onDigit={(d) => {
                  if (cashReceivedInput === '0' && d !== '.') {
                    setCashReceivedInput(d);
                  } else {
                    setCashReceivedInput(cashReceivedInput + d);
                  }
                }}
                onBackspace={() => {
                  if (cashReceivedInput.length > 1) {
                    setCashReceivedInput(cashReceivedInput.slice(0, -1));
                  } else {
                    setCashReceivedInput('0');
                  }
                }}
                onClear={() => setCashReceivedInput('0')}
                allowDecimal={false}
              />
            </div>
          </div>
        )}

        {/* UPI QR PAYMENT UI */}
        {paymentMode === 'UPI' && (
          <div className="flex flex-col items-center justify-center p-6 bg-surface-muted rounded-2xl border border-border text-center">
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-border mb-3">
              {/* Dynamic QR Code representation */}
              <div className="w-44 h-44 bg-surface flex flex-col items-center justify-center border-2 border-dashed border-ink-muted rounded-xl p-2 relative overflow-hidden">
                <QrCode size={120} className="text-ink-primary" />
                <span className="text-[10px] font-bold text-brand-600 mt-1">
                  PAY ₹{netTotal.toFixed(2)}
                </span>
              </div>
            </div>
            <h4 className="text-sm font-bold text-ink-primary">
              Scan UPI QR with any App (GPay / PhonePe / Paytm)
            </h4>
            <p className="text-xs text-ink-muted mt-1">
              Ask customer to verify ₹{netTotal.toFixed(2)} on their mobile screen.
            </p>
          </div>
        )}

        {/* CREDIT / UDHAAR PAYMENT UI */}
        {paymentMode === 'CREDIT' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  Customer Udhaar Credit Ledger
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  {selectedCustomer
                    ? `Bill of ₹${netTotal.toFixed(2)} will be added to ${selectedCustomer.name}'s credit balance.`
                    : 'Please select a registered customer to attach credit debt.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-3 border-t border-border mt-2">
          <Button
            variant="secondary"
            className="flex-1 min-h-[50px]"
            onClick={() => setPaymentModalOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            className="flex-[2] min-h-[50px] text-base"
            onClick={handleSubmit}
            isLoading={isLoading}
            leftIcon={<Check size={20} />}
          >
            Complete Payment (₹{netTotal.toFixed(2)})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
