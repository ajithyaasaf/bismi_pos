import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import sound from '../../services/soundService.js';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  showCloseButton = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        sound.playTap();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/50 backdrop-blur-sm animate-in fade-in duration-100">
      <div
        className={clsx(
          'w-full bg-surface rounded-2xl shadow-modal border border-border overflow-hidden flex flex-col max-h-[90vh]',
          maxWidthStyles[maxWidth]
        )}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h3 className="text-lg font-bold text-ink-primary leading-tight">{title}</h3>
            {subtitle && <p className="text-xs font-medium text-ink-muted mt-0.5">{subtitle}</p>}
          </div>
          {showCloseButton && (
            <button
              onClick={() => {
                sound.playTap();
                onClose();
              }}
              className="p-2 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-muted transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
