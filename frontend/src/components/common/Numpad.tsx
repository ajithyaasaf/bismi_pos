import React from 'react';
import { Delete } from 'lucide-react';
import sound from '../../services/soundService.js';

export interface NumpadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  className?: string;
  allowDecimal?: boolean;
}

export const Numpad: React.FC<NumpadProps> = ({
  onDigit,
  onBackspace,
  onClear,
  className = '',
  allowDecimal = true,
}) => {
  const handlePress = (digit: string) => {
    sound.playTap();
    onDigit(digit);
  };

  const handleBackspace = () => {
    sound.playTap();
    onBackspace();
  };

  const handleClear = () => {
    sound.playTap();
    onClear();
  };

  const btnStyle =
    'h-14 bg-surface hover:bg-surface-muted active:bg-surface-subtle border border-border rounded-xl text-xl font-bold text-ink-primary flex items-center justify-center transition-all duration-75 touch-active shadow-sm';

  return (
    <div className={`grid grid-cols-3 gap-2.5 ${className}`}>
      <button type="button" onClick={() => handlePress('7')} className={btnStyle}>7</button>
      <button type="button" onClick={() => handlePress('8')} className={btnStyle}>8</button>
      <button type="button" onClick={() => handlePress('9')} className={btnStyle}>9</button>

      <button type="button" onClick={() => handlePress('4')} className={btnStyle}>4</button>
      <button type="button" onClick={() => handlePress('5')} className={btnStyle}>5</button>
      <button type="button" onClick={() => handlePress('6')} className={btnStyle}>6</button>

      <button type="button" onClick={() => handlePress('1')} className={btnStyle}>1</button>
      <button type="button" onClick={() => handlePress('2')} className={btnStyle}>2</button>
      <button type="button" onClick={() => handlePress('3')} className={btnStyle}>3</button>

      {allowDecimal ? (
        <button type="button" onClick={() => handlePress('.')} className={btnStyle}>.</button>
      ) : (
        <button type="button" onClick={handleClear} className={`${btnStyle} text-sm font-semibold text-brand-600`}>CLR</button>
      )}

      <button type="button" onClick={() => handlePress('0')} className={btnStyle}>0</button>

      <button
        type="button"
        onClick={handleBackspace}
        className={`${btnStyle} bg-surface-muted hover:bg-surface-subtle text-ink-secondary`}
        title="Backspace"
      >
        <Delete size={22} />
      </button>
    </div>
  );
};
