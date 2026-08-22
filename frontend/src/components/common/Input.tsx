import React from 'react';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-ink-secondary">{label}</label>}
      <div className="relative flex items-center">
        {leftIcon && <div className="absolute left-3 text-ink-muted pointer-events-none">{leftIcon}</div>}
        <input
          className={clsx(
            'w-full bg-surface border rounded-lg px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted transition-colors outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[44px]',
            error ? 'border-status-danger focus:ring-status-danger' : 'border-border',
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            className
          )}
          {...props}
        />
        {rightIcon && <div className="absolute right-3 text-ink-muted">{rightIcon}</div>}
      </div>
      {error && <span className="text-xs font-medium text-status-danger">{error}</span>}
    </div>
  );
};
