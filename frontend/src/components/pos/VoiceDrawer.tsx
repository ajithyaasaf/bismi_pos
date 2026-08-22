import React, { useState, useEffect } from 'react';
import { Mic, MicOff, AlertTriangle, Check, Plus, Trash2, Edit3, X } from 'lucide-react';
import { useUiStore } from '../../store/uiStore.js';
import { usePosStore } from '../../store/posStore.js';
import { Product, VoiceParsedItem } from '../../types/index.js';
import { voiceService, MeatShopLexiconParser } from '../../services/voiceService.js';
import { Button } from '../common/Button.js';
import sound from '../../services/soundService.js';

export interface VoiceDrawerProps {
  products: Product[];
}

export const VoiceDrawer: React.FC<VoiceDrawerProps> = ({ products }) => {
  const { isVoiceDrawerOpen, setVoiceDrawerOpen, showToast } = useUiStore();
  const { addItemToCart } = usePosStore();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedItems, setParsedItems] = useState<VoiceParsedItem[]>([]);
  const [parser] = useState(() => new MeatShopLexiconParser(products));

  useEffect(() => {
    parser.updateProducts(products);
  }, [products, parser]);

  useEffect(() => {
    if (isVoiceDrawerOpen) {
      startVoiceSession();
    } else {
      voiceService.stopListening();
      setIsListening(false);
      setTranscript('');
      setParsedItems([]);
    }
  }, [isVoiceDrawerOpen]);

  const startVoiceSession = () => {
    if (!voiceService.isSupported()) {
      showToast('warning', 'Voice recognition is not supported in this browser. Please use Chrome/Edge or manual entry.');
      return;
    }

    sound.playTap();
    setTranscript('');
    setParsedItems([]);

    voiceService.startListening(
      (result) => {
        setTranscript(result.transcript);
        const parsed = parser.parseTranscript(result.transcript);
        setParsedItems(parsed);
      },
      (error) => {
        showToast('warning', error);
        setIsListening(false);
      },
      (listening) => {
        setIsListening(listening);
      }
    );
  };

  const handleToggleListening = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
    } else {
      startVoiceSession();
    }
  };

  const handleConfirmAndAddAll = () => {
    if (parsedItems.length === 0) return;

    for (const item of parsedItems) {
      const qty = item.product.pricingType === 'WEIGHT_BASED' ? (item.weight || 1.0) : (item.quantity || 1);
      addItemToCart(item.product, qty, item.option);
    }

    showToast('success', `Added ${parsedItems.length} voice items to bill.`);
    setVoiceDrawerOpen(false);
  };

  const handleRemoveParsedItem = (index: number) => {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
    sound.playTap();
  };

  if (!isVoiceDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-surface rounded-2xl shadow-modal border border-border overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <Mic size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink-primary">Voice Order Input</h3>
              <p className="text-xs text-ink-muted">Speak product, weight, and cutting style</p>
            </div>
          </div>
          <button
            onClick={() => setVoiceDrawerOpen(false)}
            className="p-2 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* Microphone Animation Visualizer */}
          <div className="flex flex-col items-center justify-center p-6 bg-brand-50/50 rounded-2xl border border-brand-100">
            <button
              onClick={handleToggleListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all shadow-brand touch-active ${
                isListening
                  ? 'bg-brand-500 ring-8 ring-brand-100 animate-pulse'
                  : 'bg-ink-secondary hover:bg-ink-primary'
              }`}
            >
              {isListening ? <Mic size={36} /> : <MicOff size={36} />}
            </button>

            <p className="text-xs font-bold text-ink-primary mt-3">
              {isListening ? '🎙 Listening... Speak clearly' : 'Tap microphone to speak'}
            </p>
            <p className="text-[11px] text-ink-muted mt-0.5 text-center">
              Example: "Chicken one kilo two hundred grams curry cut, liver half kilo"
            </p>
          </div>

          {/* Real-time Spoken Transcript Box */}
          {transcript && (
            <div className="p-3.5 rounded-xl bg-surface-muted border border-border">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
                Heard Speech:
              </span>
              <p className="text-xs font-semibold text-ink-primary italic">
                "{transcript}"
              </p>
            </div>
          )}

          {/* Parsed Item Cards */}
          {parsedItems.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-ink-secondary">
                Interpreted Items ({parsedItems.length}):
              </span>

              {parsedItems.map((item, idx) => {
                const qty = item.product.pricingType === 'WEIGHT_BASED' ? item.weight || 1 : item.quantity || 1;
                const unitPrice = item.product.currentSellingPrice;
                const cutCharge = item.option?.extraCharge || 0;
                const total = (qty * unitPrice) + cutCharge;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      item.isAnomaly
                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                        : 'bg-surface border-border'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100">
                          {item.product.code}
                        </span>
                        <h5 className="text-xs font-bold text-ink-primary">{item.product.name}</h5>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-emerald-700">
                          {qty.toFixed(item.product.pricingType === 'WEIGHT_BASED' ? 3 : 0)} {item.product.unit}
                        </span>
                        {item.option && (
                          <span className="text-[10px] font-semibold text-ink-secondary bg-surface-muted px-1.5 py-0.5 rounded">
                            {item.option.name}
                          </span>
                        )}
                      </div>

                      {item.isAnomaly && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 mt-1">
                          <AlertTriangle size={12} className="text-amber-600 flex-shrink-0" />
                          <span>{item.anomalyReason}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-extrabold text-ink-primary">
                        ₹{total.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleRemoveParsedItem(idx)}
                        className="p-1 rounded text-ink-muted hover:text-brand-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-border bg-surface">
          <Button
            variant="secondary"
            className="flex-1 min-h-[48px]"
            onClick={() => setVoiceDrawerOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            className="flex-[2] min-h-[48px]"
            onClick={handleConfirmAndAddAll}
            disabled={parsedItems.length === 0}
            leftIcon={<Plus size={18} />}
          >
            Confirm & Add to Bill ({parsedItems.length})
          </Button>
        </div>
      </div>
    </div>
  );
};
