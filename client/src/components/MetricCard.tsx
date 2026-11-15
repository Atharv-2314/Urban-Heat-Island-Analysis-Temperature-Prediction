// Anthropic-styled Metric Card Component with WCAG 2.1 Accessibility
// client/src/components/MetricCard.tsx

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: 'positive' | 'negative' | 'neutral' | 'accent';
  };
  icon?: LucideIcon;
  mono?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  icon: Icon,
  mono = true,
}) => {
  const badgeClasses = {
    positive: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    negative: 'bg-rose-50 text-rose-900 border-rose-300 font-semibold',
    neutral: 'bg-stone-100 text-stone-800 border-stone-300',
    accent: 'bg-amber-50 text-amber-900 border-amber-300',
  }[badge?.variant ?? 'neutral'];

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={`${title}: ${value}. ${subtitle ?? ''}`}
      className="bg-white rounded-lg border border-[#e9e8e4] p-4.5 shadow-xs transition-all hover:border-stone-400 focus-visible:outline-2 focus-visible:outline-stone-900 focus-visible:outline-offset-2"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
          {title}
        </span>
        {Icon && <Icon className="w-4 h-4 text-stone-500" aria-hidden="true" />}
      </div>
      <div className="flex items-baseline gap-2.5">
        <span
          className={`text-2xl font-bold text-stone-900 tracking-tight ${
            mono ? 'font-mono' : ''
          }`}
        >
          {value}
        </span>
        {badge && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${badgeClasses}`}
          >
            {badge.text}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">{subtitle}</p>}
    </div>
  );
};
