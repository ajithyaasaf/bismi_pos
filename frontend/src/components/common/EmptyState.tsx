import React from 'react';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-border bg-surface-muted/50 my-4">
      <div className="p-4 rounded-2xl bg-surface border border-border text-brand-600 mb-3 shadow-sm">
        {icon}
      </div>
      <h4 className="text-sm font-bold text-ink-primary">{title}</h4>
      {description && (
        <p className="text-xs text-ink-muted max-w-xs mt-1 mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
