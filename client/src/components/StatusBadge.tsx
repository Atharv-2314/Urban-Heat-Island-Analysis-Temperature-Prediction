// Accessible Status and category badges for climate groups and risk tiers
// client/src/components/StatusBadge.tsx

import React from 'react';
import { ACCESSIBLE_CLIMATE_COLORS } from '../lib/palette';

interface StatusBadgeProps {
  label: string;
  type?: 'climate' | 'risk' | 'neutral';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, type = 'neutral' }) => {
  let style = 'bg-stone-100 text-stone-800 border-stone-300';
  let ariaLabel = `${label}`;

  if (type === 'climate') {
    const climateInfo = ACCESSIBLE_CLIMATE_COLORS[label];
    if (climateInfo) {
      style = `${climateInfo.bg} ${climateInfo.text} ${climateInfo.border} font-medium`;
      ariaLabel = `Climate classification: ${climateInfo.desc}`;
    } else {
      style = 'bg-stone-100 text-stone-800 border-stone-300';
    }
  } else if (type === 'risk') {
    if (label.includes('Extreme')) {
      style = 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
      ariaLabel = 'Risk Assessment: Extreme Risk (Score >= 90)';
    } else if (label.includes('High')) {
      style = 'bg-orange-100 text-orange-950 border-orange-300 font-semibold';
      ariaLabel = 'Risk Assessment: High Risk (Score 70-89)';
    } else if (label.includes('Moderate')) {
      style = 'bg-amber-100 text-amber-950 border-amber-300 font-medium';
      ariaLabel = 'Risk Assessment: Moderate Risk (Score 50-69)';
    } else {
      style = 'bg-emerald-100 text-emerald-950 border-emerald-300 font-medium';
      ariaLabel = 'Risk Assessment: Low Risk (Score < 50)';
    }
  }

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border focus:outline-hidden focus:ring-1 focus:ring-stone-600 ${style}`}
    >
      {label}
    </span>
  );
};
