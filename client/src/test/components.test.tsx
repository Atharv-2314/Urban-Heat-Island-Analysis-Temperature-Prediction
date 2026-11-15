// Frontend UI Component Smoke and Accessibility Unit Tests
// client/src/test/components.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { INITIAL_CITIES, INITIAL_MODEL_METRICS } from '../lib/mockData';
import { getUhiViridisColor, getAccessibleTextColor } from '../lib/palette';

describe('Frontend UI Component Library & Accessibility Tests', () => {
  it('renders MetricCard with accessible ARIA label and value', () => {
    render(
      <MetricCard
        title="Global Mean UHI"
        value="+2.15 °C"
        subtitle="10-year observational average"
        badge={{ text: 'WARMING', variant: 'accent' }}
      />
    );

    expect(screen.getByText('Global Mean UHI')).toBeInTheDocument();
    expect(screen.getByText('+2.15 °C')).toBeInTheDocument();
    expect(screen.getByText('WARMING')).toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Global Mean UHI')
    );
  });

  it('renders StatusBadge with colorblind-safe climate contrast', () => {
    const { rerender } = render(<StatusBadge label="Arid" type="climate" />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Arid')
    );

    rerender(<StatusBadge label="Extreme Risk" type="risk" />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Extreme Risk')
    );
  });

  it('renders PageHeader with proper semantic h1 tag', () => {
    render(
      <PageHeader
        badge="Test Badge"
        title="Urban Heat Island Analysis"
        subtitle="42 global cities observational study"
      />
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Urban Heat Island Analysis');
  });

  it('validates 42 cities completeness in mock/initial registry', () => {
    expect(INITIAL_CITIES.length).toBe(42);
    const indianCities = INITIAL_CITIES.filter((c) => c.country === 'India');
    const intlCities = INITIAL_CITIES.filter((c) => c.country === 'International');
    expect(indianCities.length).toBe(24);
    expect(intlCities.length).toBe(18);
  });

  it('validates model metrics integrity matching Phase 3 benchmarks', () => {
    expect(INITIAL_MODEL_METRICS.best_model).toBe('Hist_Gradient_Boosting');
    const hgb = (INITIAL_MODEL_METRICS as any).Hist_Gradient_Boosting;
    expect(hgb.test_2025.r2).toBeCloseTo(0.5848, 3);
    expect(hgb.test_2025.rmse).toBeCloseTo(1.2794, 3);
  });

  it('verifies colorblind-safe Viridis palette interpolation and WCAG luminance', () => {
    const coolColor = getUhiViridisColor(0.5, 'viridis');
    const hotColor = getUhiViridisColor(3.5, 'viridis');
    expect(coolColor).toBe('#440154');
    expect(hotColor).toBe('#fde725');

    // Luminance contrast test
    expect(getAccessibleTextColor(coolColor)).toBe('#ffffff'); // Dark purple needs white text
    expect(getAccessibleTextColor(hotColor)).toBe('#1f1e1d'); // Bright yellow needs dark text
  });
});
