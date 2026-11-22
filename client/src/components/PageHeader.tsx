// Page Header component with Anthropic UI typographic hierarchy
// client/src/components/PageHeader.tsx

import React from 'react';

interface PageHeaderProps {
  badge?: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  badge,
  title,
  subtitle,
  actions,
}) => {
  return (
    <div className="mb-6 pb-5 border-b border-[#e9e8e4] flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div className="space-y-1.5 max-w-3xl">
        {badge && (
          <span className="inline-block text-[11px] font-mono uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-sm mb-1">
            {badge}
          </span>
        )}
        <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-stone-600 leading-relaxed">
          {subtitle}
        </p>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
