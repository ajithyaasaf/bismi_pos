import React from 'react';
import clsx from 'clsx';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  icon,
  children,
  size = 'md',
  className,
}) => {
  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-brand-50 text-brand-700 border-brand-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-surface-muted text-ink-secondary border-border',
    brand: 'bg-brand-50 text-brand-600 border-brand-100 font-bold',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5 font-semibold',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md border font-medium select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
