import React, { useEffect } from 'react';
import { CheckCircle2, Printer, Share2, PlusCircle, ArrowRight } from 'lucide-react';
import { useUiStore } from '../../store/uiStore.js';
import { usePosStore } from '../../store/posStore.js';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { printManager } from '../../services/printService.js';
import sound from '../../services/soundService.js';

export const PaymentSuccessModal: React.FC = () => {
  const { isSuccessModalOpen, setSuccessModalOpen, lastCompletedSale, showToast } = useUiStore();
  const { clearCart } = usePosStore();

  const receipt = lastCompletedSale?.receipt;
  const cashChange = receipt?.data?.cashChange || 0;
  const grandTotal = lastCompletedSale?.grandTotal || receipt?.data?.grandTotal || 0;
  const invoiceNumber = lastCompletedSale?.invoiceNumber || 'INV-000';

  useEffect(() => {
    if (isSuccessModalOpen) {
      sound.playPaymentSuccess();
      // Auto print if enabled
      if (receipt) {
        printManager.printReceipt({
          plainText: receipt.plainText,
          rawEscPosBase64: receipt.rawEscPosBase64,
        });
      }
    }
  }, [isSuccessModalOpen, receipt]);

  const handleNextCustomer = () => {
    sound.playTap();
    clearCart();
    setSuccessModalOpen(false);
  };

  // Keyboard shortcut: Space or Enter resets for next customer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSuccessModalOpen && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        handleNextCustomer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSuccessModalOpen]);

  const handleReprint = async () => {
    if (receipt) {
      sound.playTap();
      const res = await printManager.printReceipt({
        plainText: receipt.plainText,
        rawEscPosBase64: receipt.rawEscPosBase64,
      });
      if (res.success) {
        showToast('success', 'Receipt sent to printer.');
      } else {
        showToast('warning', 'Printer unavailable. Check connection.');
      }
    }
  };

  const handleWhatsAppShare = () => {
    sound.playTap();
    if (!receipt) return;
    const text = encodeURIComponent(`*${receipt.data.shopName}*\nBill #${receipt.data.invoiceNumber}\nTotal: ₹${receipt.data.grandTotal.toFixed(2)}\n\nThank you for choosing Bismi Fresh Chicken!`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (!isSuccessModalOpen) return null;

  return (
    <Modal
      isOpen={isSuccessModalOpen}
      onClose={handleNextCustomer}
      title="Payment Successful"
      subtitle={`Invoice: ${invoiceNumber}`}
      maxWidth="xl"
      showCloseButton={false}
    >
      <div className="flex flex-col gap-4">
        {/* Success Banner */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <div className="p-2 rounded-xl bg-emerald-600 text-white">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-emerald-800">
              Payment Verified • ₹{grandTotal.toFixed(2)}
            </h4>
            <p className="text-xs font-semibold text-emerald-700">
              Sale completed and stock deducted successfully.
            </p>
          </div>
        </div>

        {/* Change Banner if cash change returned */}
        {cashChange > 0 && (
          <div className="p-4 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                Cash Change to Return
              </span>
              <div className="text-3xl font-extrabold text-brand-700 mt-0.5">
                ₹{cashChange.toFixed(2)}
              </div>
            </div>
            <span className="text-xs font-bold text-ink-muted bg-white px-3 py-1.5 rounded-lg border border-border">
              Returned to Customer
            </span>
          </div>
        )}

        {/* Thermal Receipt Preview */}
        {receipt && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-secondary">
                📄 Thermal Receipt Preview (80mm)
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ✓ Auto-Printed
              </span>
            </div>
            <div className="bg-surface-muted border border-border rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-[11px] leading-tight text-ink-primary select-text">
              <pre className="whitespace-pre-wrap">{receipt.plainText}</pre>
            </div>
          </div>
        )}

        {/* Action Buttons: Reprint / Share / Next Customer */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
          <Button
            variant="secondary"
            onClick={handleReprint}
            leftIcon={<Printer size={16} />}
            className="min-h-[48px]"
          >
            Reprint Receipt
          </Button>

          <Button
            variant="secondary"
            onClick={handleWhatsAppShare}
            leftIcon={<Share2 size={16} />}
            className="min-h-[48px]"
          >
            Share on WhatsApp
          </Button>
        </div>

        <Button
          variant="primary"
          onClick={handleNextCustomer}
          className="w-full min-h-[58px] text-base font-extrabold shadow-brand"
          rightIcon={<ArrowRight size={22} />}
        >
          Next Customer (Space / Enter)
        </Button>
      </div>
    </Modal>
  );
};
