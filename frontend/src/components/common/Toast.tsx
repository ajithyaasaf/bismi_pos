import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useUiStore, ToastMessage } from '../../store/uiStore.js';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUiStore();

  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle2 size={18} className="text-status-success flex-shrink-0" />,
    warning: <AlertTriangle size={18} className="text-status-warning flex-shrink-0" />,
    danger: <XCircle size={18} className="text-status-danger flex-shrink-0" />,
    info: <Info size={18} className="text-status-info flex-shrink-0" />,
  };

  const bgStyles = {
    success: 'border-emerald-200 bg-white text-ink-primary',
    warning: 'border-amber-200 bg-white text-ink-primary',
    danger: 'border-brand-200 bg-white text-ink-primary',
    info: 'border-blue-200 bg-white text-ink-primary',
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast: ToastMessage) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border shadow-lg transition-all duration-200 animate-in slide-in-from-top-2 ${bgStyles[toast.type]}`}
        >
          <div className="flex items-center gap-2.5">
            {icons[toast.type]}
            <p className="text-xs font-semibold">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 rounded text-ink-muted hover:text-ink-primary transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
