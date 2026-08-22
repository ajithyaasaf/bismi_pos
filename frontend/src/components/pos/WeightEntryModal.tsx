import React, { useMemo, useEffect } from 'react';
import { Scale, Check, Plus, AlertTriangle } from 'lucide-react';
import { usePosStore } from '../../store/posStore.js';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { Numpad } from '../common/Numpad.js';

export const WeightEntryModal: React.FC = () => {
  const {
    selectedProduct,
    selectedOption,
    currentWeightInput,
    selectOption,
    setPresetWeight,
    appendWeightDigit,
    clearWeightInput,
    addItemToCart,
  } = usePosStore();

  const isOpen = !!selectedProduct;
  const isWeightBased = selectedProduct?.pricingType === 'WEIGHT_BASED';

  const weightPresets = [
    { label: '250g', val: 0.25 },
    { label: '500g', val: 0.5 },
    { label: '750g', val: 0.75 },
    { label: '1.0 KG', val: 1.0 },
    { label: '1.25 KG', val: 1.25 },
    { label: '1.50 KG', val: 1.5 },
    { label: '1.75 KG', val: 1.75 },
    { label: '2.0 KG', val: 2.0 },
    { label: '2.50 KG', val: 2.5 },
    { label: '3.0 KG', val: 3.0 },
  ];

  const qtyPresets = [1, 2, 3, 4, 5, 6, 10, 12, 24, 30];

  const numericVal = parseFloat(currentWeightInput) || 0;

  const liveCalculation = useMemo(() => {
    if (!selectedProduct) return { base: 0, cutCharge: 0, total: 0 };
    const rate = selectedProduct.currentSellingPrice;
    const cutCharge = selectedOption?.extraCharge || 0;
    const base = numericVal * rate;
    return {
      base,
      cutCharge,
      total: base + cutCharge,
    };
  }, [selectedProduct, selectedOption, numericVal]);

  const isAnomaly = useMemo(() => {
    if (!selectedProduct || !isWeightBased) return false;
    return numericVal > (selectedProduct.warningWeightLimit || 5.0);
  }, [selectedProduct, isWeightBased, numericVal]);

  const handleAdd = () => {
    if (!selectedProduct || numericVal <= 0) return;
    addItemToCart(selectedProduct, numericVal, selectedOption);
  };

  // Keyboard Enter shortcut to add
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedProduct, numericVal, selectedOption]);

  if (!selectedProduct) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => usePosStore.setState({ selectedProduct: null })}
      title={`${selectedProduct.name}`}
      subtitle={`Rate: ₹${selectedProduct.currentSellingPrice.toFixed(0)} / ${selectedProduct.unit}`}
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4">
        {/* Weight / Amount Highlight Box */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-brand-50/60 border border-brand-100">
          <div>
            <span className="text-xs font-bold text-brand-700 uppercase tracking-wide">
              {isWeightBased ? 'Enter Weight (KG)' : 'Enter Quantity (Units)'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-extrabold text-brand-700">
                {currentWeightInput || '0'}
              </span>
              <span className="text-sm font-bold text-brand-600">
                {selectedProduct.unit}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wide">
              Calculated Amount
            </span>
            <div className="text-3xl font-extrabold text-ink-primary mt-0.5">
              ₹{liveCalculation.total.toFixed(2)}
            </div>
            {liveCalculation.cutCharge > 0 && (
              <span className="text-[11px] font-semibold text-brand-600">
                (includes +₹{liveCalculation.cutCharge} cut charge)
              </span>
            )}
          </div>
        </div>

        {/* Anomaly Alert Warning */}
        {isAnomaly && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
            <span>
              {numericVal.toFixed(3)} KG is unusually high for {selectedProduct.name}. Please confirm with customer.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column: Weight Presets & Cutting Options */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-bold text-ink-secondary mb-1.5 block">
                ⚡ Quick Presets
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {isWeightBased
                  ? weightPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setPresetWeight(preset.val)}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all touch-active ${
                          numericVal === preset.val
                            ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                            : 'bg-surface hover:bg-surface-muted text-ink-primary border-border'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))
                  : qtyPresets.map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => usePosStore.getState().setWeightInput(qty.toString())}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all touch-active ${
                          numericVal === qty
                            ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                            : 'bg-surface hover:bg-surface-muted text-ink-primary border-border'
                        }`}
                      >
                        {qty}
                      </button>
                    ))}
              </div>
            </div>

            {/* Cutting Options */}
            {selectedProduct.options && selectedProduct.options.length > 0 && (
              <div>
                <label className="text-xs font-bold text-ink-secondary mb-1.5 block">
                  ✂️ Cutting & Preparation Option
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedProduct.options.map((opt) => {
                    const isSelected = selectedOption?.id === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => selectOption(opt)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all touch-active flex items-center justify-between ${
                          isSelected
                            ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm'
                            : 'bg-surface hover:bg-surface-muted border-border text-ink-primary'
                        }`}
                      >
                        <span>{opt.name}</span>
                        {opt.extraCharge > 0 ? (
                          <span className="text-[10px] font-extrabold text-brand-600 bg-brand-100/70 px-1.5 py-0.5 rounded">
                            +₹{opt.extraCharge}
                          </span>
                        ) : (
                          isSelected && <Check size={14} className="text-brand-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Touch Numpad */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-ink-secondary">
                🔢 Custom Numeric Entry
              </label>
              <button
                type="button"
                onClick={clearWeightInput}
                className="text-[11px] font-bold text-brand-600 hover:text-brand-700"
              >
                Clear (C)
              </button>
            </div>
            <Numpad
              onDigit={appendWeightDigit}
              onBackspace={() => {
                const current = currentWeightInput;
                if (current.length > 1) {
                  usePosStore.getState().setWeightInput(current.slice(0, -1));
                } else {
                  usePosStore.getState().setWeightInput('0');
                }
              }}
              onClear={clearWeightInput}
              allowDecimal={isWeightBased}
            />
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center gap-3 pt-3 border-t border-border mt-1">
          <Button
            variant="secondary"
            className="flex-1 min-h-[50px]"
            onClick={() => usePosStore.setState({ selectedProduct: null })}
          >
            Cancel (Esc)
          </Button>

          <Button
            variant="primary"
            className="flex-[2] min-h-[50px] text-base"
            onClick={handleAdd}
            disabled={numericVal <= 0}
            leftIcon={<Plus size={20} />}
          >
            Add to Bill (Enter) • ₹{liveCalculation.total.toFixed(2)}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
