import React from 'react';
import clsx from 'clsx';
import sound from '../../services/soundService.js';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'subtle';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  onClick,
  disabled,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      sound.playTap();
      if (onClick) onClick(e);
    }
  };

  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-100 touch-active disabled:opacity-50 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-2 focus:ring-offset-1';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-[36px]',
    md: 'px-4 py-2.5 text-sm gap-2 min-h-[44px]',
    lg: 'px-6 py-3.5 text-base gap-2.5 min-h-[54px]',
    xl: 'px-8 py-4 text-lg gap-3 min-h-[64px]',
  };

  const variantStyles = {
    primary: 'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white shadow-brand focus:ring-brand-500',
    secondary: 'bg-surface hover:bg-surface-muted text-ink-primary border border-border hover:border-border-strong focus:ring-border-strong',
    danger: 'bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 focus:ring-brand-500',
    success: 'bg-status-success text-white hover:opacity-95 shadow-sm focus:ring-status-success',
    outline: 'bg-transparent border border-brand-500 text-brand-600 hover:bg-brand-50 focus:ring-brand-500',
    subtle: 'bg-surface-muted hover:bg-surface-subtle text-ink-secondary focus:ring-border',
  };

  return (
    <button
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      onClick={handleClick}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
