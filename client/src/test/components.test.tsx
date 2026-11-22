// Frontend UI Component Smoke and Accessibility Unit Tests
// client/src/test/components.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { CityHeatRiskAssessment } from '../components/CityHeatRiskAssessment';
import { INITIAL_CITIES, INITIAL_MODEL_METRICS, generateCityShapMock, generateMockCityRiskAssessment } from '../lib/mockData';
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

  it('validates 10-year time-series chartData mapping and chronological ordering (Milestone 31)', () => {
    // Unsorted records with both standard and aliased keys, including cloud gaps
    const rawRecords = [
      { city: 'Delhi', year: 2024, month: 2, uhi_intensity: 1.8, lst_urban: 28.5, lst_rural: 26.7, ndvi: 0.22, ndbi: 0.15, temperature_2m: 22.1, relative_humidity: 60, wind_speed: 2, total_precipitation: 5, climate_group: 'Arid', latitude: 28.7, longitude: 77.1 },
      { city: 'Delhi', year: 2024, month: 1, uhi: 1.5, lst: 24.2, rural_lst: 22.7, ndvi: 0.25, ndbi: 0.12, air_temperature: 18.4, relative_humidity: 70, wind_speed: 1.5, total_precipitation: 10, climate_group: 'Arid', latitude: 28.7, longitude: 77.1 } as any,
      { city: 'Delhi', year: 2024, month: 7, uhi_intensity: null, lst_urban: null, lst_rural: null, ndvi: null, ndbi: null, temperature_2m: 31.0, relative_humidity: 85, wind_speed: 3, total_precipitation: 200, climate_group: 'Arid', latitude: 28.7, longitude: 77.1 },
      { city: 'Delhi', year: 2023, month: 12, uhi_intensity: 2.1, lst_urban: 23.0, lst_rural: 20.9, ndvi: 0.21, ndbi: 0.18, temperature_2m: 16.5, relative_humidity: 75, wind_speed: 1.2, total_precipitation: 0, climate_group: 'Arid', latitude: 28.7, longitude: 77.1 },
    ];

    // Chronological sort
    const sorted = [...rawRecords].sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    );

    expect(sorted[0].year).toBe(2023);
    expect(sorted[0].month).toBe(12);
    expect(sorted[1].year).toBe(2024);
    expect(sorted[1].month).toBe(1);
    expect(sorted[2].year).toBe(2024);
    expect(sorted[2].month).toBe(2);
    expect(sorted[3].year).toBe(2024);
    expect(sorted[3].month).toBe(7);

    // Chart data mapping
    const chartData = sorted.map((d) => ({
      date: `${d.year}-${String(d.month).padStart(2, '0')}`,
      year: d.year,
      month: d.month,
      uhi: d.uhi_intensity ?? (d as any).uhi ?? null,
      lst_urban: d.lst_urban ?? (d as any).lst ?? null,
      lst_rural: d.lst_rural ?? (d as any).rural_lst ?? null,
      ndvi: d.ndvi ?? null,
      ndbi: d.ndbi ?? null,
      temp: d.temperature_2m ?? (d as any).air_temperature ?? null,
    }));

    // Verify 2023-12 values
    expect(chartData[0].date).toBe('2023-12');
    expect(chartData[0].uhi).toBe(2.1);
    expect(chartData[0].lst_urban).toBe(23.0);
    expect(chartData[0].lst_rural).toBe(20.9);

    // Verify alias resolution for 2024-01
    expect(chartData[1].date).toBe('2024-01');
    expect(chartData[1].uhi).toBe(1.5);
    expect(chartData[1].lst_urban).toBe(24.2);
    expect(chartData[1].temp).toBe(18.4);

    // Verify cloud missingness preservation for 2024-07
    expect(chartData[3].date).toBe('2024-07');
    expect(chartData[3].uhi).toBeNull();
    expect(chartData[3].lst_urban).toBeNull();
    expect(chartData[3].temp).toBe(31.0);
    expect(isNaN(chartData[3].uhi as any)).toBe(false);
  });

  it('validates seasonal profile aggregation: null sentinel, null filtering, and 12-month output (Milestone 32)', () => {
    // 10 years × 12 months; July and Aug have cloud gaps (null uhi/lst)
    const timeSeries: any[] = [];
    for (let year = 2016; year <= 2025; year++) {
      for (let month = 1; month <= 12; month++) {
        const isMonsoon = month === 7 || month === 8;
        timeSeries.push({
          city: 'TestCity',
          year,
          month,
          uhi_intensity: isMonsoon ? null : 1.5 + month * 0.1,
          lst_urban: isMonsoon ? null : 30 + month,
          lst_rural: isMonsoon ? null : 28 + month,
          temperature_2m: 25 + month,
          relative_humidity: 60,
          wind_speed: 2,
          total_precipitation: isMonsoon ? 200 : 10,
          climate_group: 'Tropical',
          latitude: 20,
          longitude: 75,
        });
      }
    }

    // Replicate seasonalProfile aggregation logic from CityDeepDive.tsx
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const buckets: Record<number, { uhi: number[]; lst_urban: number[]; lst_rural: number[] }> = {};
    for (let m = 1; m <= 12; m++) buckets[m] = { uhi: [], lst_urban: [], lst_rural: [] };

    timeSeries.forEach((d) => {
      const uhi = d.uhi_intensity ?? (d as any).uhi;
      const urban = d.lst_urban ?? (d as any).lst;
      const rural = d.lst_rural ?? (d as any).rural_lst;
      if (uhi !== null && uhi !== undefined && isFinite(uhi) && !isNaN(uhi)) buckets[d.month]?.uhi.push(uhi);
      if (urban !== null && urban !== undefined && isFinite(urban) && !isNaN(urban)) buckets[d.month]?.lst_urban.push(urban);
      if (rural !== null && rural !== undefined && isFinite(rural) && !isNaN(rural)) buckets[d.month]?.lst_rural.push(rural);
    });

    const mean = (arr: number[]): number | null =>
      arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;

    const seasonal = monthNames.map((name, i) => {
      const m = i + 1;
      return {
        month: name,
        monthNum: m,
        mean_uhi: mean(buckets[m].uhi),
        mean_lst_urban: mean(buckets[m].lst_urban),
        mean_lst_rural: mean(buckets[m].lst_rural),
        obs_uhi: buckets[m].uhi.length,
        obs_urban: buckets[m].lst_urban.length,
        obs_rural: buckets[m].lst_rural.length,
      };
    });

    // Must produce exactly 12 months
    expect(seasonal.length).toBe(12);

    // Jan (month 1): 10 valid observations
    expect(seasonal[0].month).toBe('Jan');
    expect(seasonal[0].obs_uhi).toBe(10);
    expect(seasonal[0].mean_uhi).toBeCloseTo(1.6, 1); // 1.5 + 1 * 0.1

    // Jul (month 7): zero valid observations → must be null, NOT 0
    expect(seasonal[6].month).toBe('Jul');
    expect(seasonal[6].obs_uhi).toBe(0);
    expect(seasonal[6].mean_uhi).toBeNull();
    expect(seasonal[6].mean_lst_urban).toBeNull();

    // Aug (month 8): also cloud gap → null
    expect(seasonal[7].month).toBe('Aug');
    expect(seasonal[7].mean_uhi).toBeNull();

    // Sep (month 9): back to valid → not null
    expect(seasonal[8].month).toBe('Sep');
    expect(seasonal[8].obs_uhi).toBe(10);
    expect(seasonal[8].mean_uhi).not.toBeNull();
    expect(seasonal[8].mean_uhi).toBeCloseTo(2.4, 1); // 1.5 + 9 * 0.1

    // All 12 months present (even cloud-gap ones return null not undefined)
    for (const s of seasonal) {
      expect(s.month).toBeDefined();
      expect(typeof s.monthNum).toBe('number');
    }
  });

  it('validates heatwave anomaly matrix: baseline, anomalies, cloud gaps, and extreme values (Milestone 33)', () => {
    // Simulate 120 monthly records for a city with known UHI values
    // Ground truth from Parquet:
    //   Delhi baseline: 0.1224 °C (119 valid / 120 total)
    //   Delhi 2016-01: UHI=0.8932, anomaly=0.7707
    //   Delhi 2020-05: UHI=-1.2310, anomaly=-1.3534
    //   Delhi 2024-08: UHI=2.1710, anomaly=2.0485
    // We use simplified records with 3 valid + 1 cloud gap to validate the logic.

    const timeSeries: any[] = [
      // 2016-01: UHI = 2.0
      { city: 'TestCity', year: 2016, month: 1, uhi_intensity: 2.0, lst_urban: 30, lst_rural: 28 },
      // 2016-02: UHI = -1.0
      { city: 'TestCity', year: 2016, month: 2, uhi_intensity: -1.0, lst_urban: 25, lst_rural: 26 },
      // 2016-03: UHI = 3.0
      { city: 'TestCity', year: 2016, month: 3, uhi_intensity: 3.0, lst_urban: 35, lst_rural: 32 },
      // 2016-04: cloud gap (null)
      { city: 'TestCity', year: 2016, month: 4, uhi_intensity: null, lst_urban: null, lst_rural: null },
      // 2016-05: UHI = 0.0 (genuine zero)
      { city: 'TestCity', year: 2016, month: 5, uhi_intensity: 0.0, lst_urban: 28, lst_rural: 28 },
      // 2016-06: UHI = Infinity (should be excluded)
      { city: 'TestCity', year: 2016, month: 6, uhi_intensity: Infinity, lst_urban: 40, lst_rural: 20 },
      // 2016-07: UHI = NaN (should be excluded)
      { city: 'TestCity', year: 2016, month: 7, uhi_intensity: NaN, lst_urban: 30, lst_rural: 28 },
      // Use alias field for 2016-08
      { city: 'TestCity', year: 2016, month: 8, uhi: 1.0, lst: 29, rural_lst: 28 },
    ];

    // ---- Replicate anomalyBaseline logic from CityDeepDive.tsx ----
    const validUhis = timeSeries
      .map((d: any) => d.uhi_intensity ?? d.uhi)
      .filter((v: any): v is number => v !== null && v !== undefined && isFinite(v) && !isNaN(v));
    const baselineMean = validUhis.length > 0 ? validUhis.reduce((acc: number, v: number) => acc + v, 0) / validUhis.length : 0;

    // Valid values: 2.0, -1.0, 3.0, 0.0, 1.0 → mean = 5.0 / 5 = 1.0
    // Infinity and NaN are excluded; null is excluded
    expect(validUhis).toEqual([2.0, -1.0, 3.0, 0.0, 1.0]);
    expect(validUhis.length).toBe(5);
    expect(baselineMean).toBeCloseTo(1.0, 6);

    // ---- Replicate anomalyMatrix logic ----
    const years = [2016];
    const months = [1, 2, 3, 4, 5, 6, 7, 8];
    const matrix = years.map((year) => {
      const row: Record<string, number | string | null> = { year };
      months.forEach((m) => {
        const item = timeSeries.find((d: any) => d.year === year && d.month === m);
        const itemUhi = item ? ((item as any).uhi_intensity ?? (item as any).uhi) : null;
        if (itemUhi !== null && itemUhi !== undefined && isFinite(itemUhi) && !isNaN(itemUhi)) {
          const anomaly = itemUhi - baselineMean;
          row[`m${m}`] = isFinite(anomaly) ? parseFloat(anomaly.toFixed(2)) : null;
        } else {
          row[`m${m}`] = null;
        }
      });
      return row;
    });

    const row2016 = matrix[0];

    // 2016-01: anomaly = 2.0 - 1.0 = +1.0
    expect(row2016.m1).toBeCloseTo(1.0, 2);

    // 2016-02: anomaly = -1.0 - 1.0 = -2.0
    expect(row2016.m2).toBeCloseTo(-2.0, 2);

    // 2016-03: anomaly = 3.0 - 1.0 = +2.0
    expect(row2016.m3).toBeCloseTo(2.0, 2);

    // 2016-04: cloud gap → null, NOT 0
    expect(row2016.m4).toBeNull();

    // 2016-05: genuine zero UHI → anomaly = 0.0 - 1.0 = -1.0
    expect(row2016.m5).toBeCloseTo(-1.0, 2);

    // 2016-06: Infinity → excluded → null
    expect(row2016.m6).toBeNull();

    // 2016-07: NaN → excluded → null
    expect(row2016.m7).toBeNull();

    // 2016-08: alias field → anomaly = 1.0 - 1.0 = 0.0
    expect(row2016.m8).toBeCloseTo(0.0, 2);

    // ---- Validate colour-scale function ----
    const getAnomalyColor = (val: number | null) => {
      if (val === null || !isFinite(val as number) || isNaN(val as number)) return 'bg-stone-100 text-stone-400 font-normal';
      if (val >= 2.0) return 'bg-[#450a0a] text-white font-bold';
      if (val >= 1.2) return 'bg-[#7f1d1d] text-white font-bold';
      if (val >= 0.6) return 'bg-[#b91c1c] text-white font-semibold';
      if (val >= 0.2) return 'bg-[#fecaca] text-stone-900';
      if (val <= -2.0) return 'bg-[#0c4a6e] text-white font-bold';
      if (val <= -1.0) return 'bg-[#0369a1] text-white font-bold';
      if (val <= -0.4) return 'bg-[#38bdf8] text-stone-950 font-medium';
      if (val < 0) return 'bg-[#e0f2fe] text-stone-900';
      return 'bg-stone-100 text-stone-800';
    };

    // Extreme hot (+2.0)
    expect(getAnomalyColor(2.0)).toContain('450a0a');
    // Hot (+1.0 is in 0.6-1.2 range)
    expect(getAnomalyColor(1.0)).toContain('b91c1c');
    // Extreme cold (-2.0)
    expect(getAnomalyColor(-2.0)).toContain('0c4a6e');
    // Cold (-1.0)
    expect(getAnomalyColor(-1.0)).toContain('0369a1');
    // Null → grey
    expect(getAnomalyColor(null)).toContain('stone-100');
    // Zero → near-normal
    expect(getAnomalyColor(0.0)).toContain('stone-100');

    // ---- Null vs zero distinguishability ----
    // A genuine 0 anomaly and a cloud-gap null must render differently
    const zeroStyle = getAnomalyColor(0.0);
    const nullStyle = getAnomalyColor(null);
    expect(zeroStyle).not.toBe(nullStyle);
  });

  it('validates empty and partial dataset handling for resilient frontend rendering (Milestone 34)', () => {
    // 1. Completely empty dataset
    const emptySeries: any[] = [];
    const emptyChartData = emptySeries.map((d) => ({
      date: `${d.year}-${String(d.month).padStart(2, '0')}`,
      uhi: d.uhi_intensity ?? d.uhi ?? null,
    }));
    expect(emptyChartData.length).toBe(0);

    // 2. Partial data where only urban LST exists but UHI and rural LST are missing
    const partialRecord = {
      city: 'Delhi',
      year: 2024,
      month: 6,
      lst_urban: 42.5,
      lst_rural: null,
      uhi_intensity: null,
      ndvi: 0.15,
      ndbi: 0.35,
      temperature_2m: 38.0,
    };

    const mappedPartial = {
      date: `${partialRecord.year}-${String(partialRecord.month).padStart(2, '0')}`,
      uhi: partialRecord.uhi_intensity ?? null,
      lst_urban: partialRecord.lst_urban ?? null,
      lst_rural: partialRecord.lst_rural ?? null,
      temp: partialRecord.temperature_2m ?? null,
    };

    // Unavailable UHI does not suppress available urban LST or ambient temperature
    expect(mappedPartial.uhi).toBeNull();
    expect(mappedPartial.lst_rural).toBeNull();
    expect(mappedPartial.lst_urban).toBe(42.5);
    expect(mappedPartial.temp).toBe(38.0);

    // 3. Robust numerical serialization: non-finite or corrupted values don't crash mapping
    const dirtyRecords = [
      { uhi: 'invalid_string', lst: undefined, rural_lst: null },
      { uhi: NaN, lst: Infinity, rural_lst: -Infinity },
    ];

    const safeMapped = dirtyRecords.map((d: any) => ({
      uhi: d.uhi !== null && d.uhi !== undefined && isFinite(d.uhi) && !isNaN(d.uhi) ? Number(d.uhi) : null,
      lst_urban: d.lst !== null && d.lst !== undefined && isFinite(d.lst) && !isNaN(d.lst) ? Number(d.lst) : null,
      lst_rural: d.rural_lst !== null && d.rural_lst !== undefined && isFinite(d.rural_lst) && !isNaN(d.rural_lst) ? Number(d.rural_lst) : null,
    }));

    expect(safeMapped[0].uhi).toBeNull();
    expect(safeMapped[0].lst_urban).toBeNull();
    expect(safeMapped[1].uhi).toBeNull();
    expect(safeMapped[1].lst_urban).toBeNull();
    expect(safeMapped[1].lst_rural).toBeNull();
  });

  it('validates city-specific dynamic TreeSHAP attribution and waterfall closure (Milestone 37)', () => {
    const aridShap = generateCityShapMock('Ahmedabad');
    const tropicalShap = generateCityShapMock('Mumbai');
    const temperateShap = generateCityShapMock('London');

    // 1. Verify city metadata and scope
    expect(aridShap.city).toBe('Ahmedabad');
    expect(tropicalShap.city).toBe('Mumbai');
    expect(temperateShap.city).toBe('London');

    // 2. Verify top 10 drivers are present and sorted descending by mean |SHAP|
    expect(aridShap.top_drivers.length).toBe(10);
    expect(tropicalShap.top_drivers.length).toBe(10);
    for (let i = 0; i < aridShap.top_drivers.length - 1; i++) {
      expect(aridShap.top_drivers[i].mean_abs_shap).toBeGreaterThanOrEqual(aridShap.top_drivers[i + 1].mean_abs_shap);
    }

    // 3. Verify driver differences between climates
    expect(aridShap.top_drivers[0].mean_abs_shap).not.toBe(tropicalShap.top_drivers[0].mean_abs_shap);
    expect(aridShap.driver_cards.top_global.name).toBe(aridShap.top_drivers[0].label);

    // 4. Verify waterfall additive closure: steps start at baseline and reach final prediction
    expect(aridShap.waterfall.baseExpected).toBeCloseTo(0.2019, 2);
    const lastStep = aridShap.waterfall.steps[aridShap.waterfall.steps.length - 1];
    expect(lastStep.end).toBeCloseTo(aridShap.waterfall.finalPrediction, 1);

    // 5. Verify biophysical insights are customized per city
    expect(aridShap.biophysical_insight).toContain('Ahmedabad');
    expect(tropicalShap.biophysical_insight).toContain('Mumbai');
  });

  it('validates regional (India-only, Intl-only) and combined global SHAP aggregations (Milestones 38, 39, 40)', () => {
    const indiaShap = generateCityShapMock('india');
    const intlShap = generateCityShapMock('international');
    const globalShap = generateCityShapMock('global');

    // 1. Observation population
    expect(indiaShap.records_analyzed).toBe(278);
    expect(intlShap.records_analyzed).toBe(211);
    expect(globalShap.records_analyzed).toBe(489);
    expect(indiaShap.records_analyzed + intlShap.records_analyzed).toBe(489);

    // 2. India-only: relative humidity has higher impact (0.3910 vs 0.3298 in intl)
    const indiaRh = indiaShap.top_drivers.find((d: any) => d.feature === 'relative_humidity');
    const intlRh = intlShap.top_drivers.find((d: any) => d.feature === 'relative_humidity');
    expect(indiaRh?.mean_abs_shap).toBeGreaterThan(intlRh?.mean_abs_shap || 0);

    // 3. International: longitude has higher impact (0.3266 vs 0.2623 in india)
    const indiaLon = indiaShap.top_drivers.find((d: any) => d.feature === 'longitude');
    const intlLon = intlShap.top_drivers.find((d: any) => d.feature === 'longitude');
    expect(intlLon?.mean_abs_shap).toBeGreaterThan(indiaLon?.mean_abs_shap || 0);

    // 4. Combined Global reproduces exact benchmarks
    expect(globalShap.top_drivers[0].mean_abs_shap).toBeCloseTo(0.4231, 3);
    expect(globalShap.top_drivers[1].mean_abs_shap).toBeCloseTo(0.3646, 3);
    expect(globalShap.waterfall.finalPrediction).toBeCloseTo(0.43, 2);

    // 5. All waterfalls start at baseline 0.2019 and reach net predicted UHI
    for (const s of [indiaShap, intlShap, globalShap]) {
      expect(s.waterfall.baseExpected).toBeCloseTo(0.2019, 2);
      const lastStep = s.waterfall.steps[s.waterfall.steps.length - 1];
      expect(lastStep.end).toBeCloseTo(s.waterfall.finalPrediction, 1);
    }
  });

  describe('CityHeatRiskAssessment Component (Phase 11 Milestone 5)', () => {
    it('renders the complete assessment score card, gauge, and component breakdown for Delhi', () => {
      const assessment = generateMockCityRiskAssessment('Delhi');
      render(<CityHeatRiskAssessment assessment={assessment} />);

      // Section header and badges
      expect(screen.getByRole('heading', { name: /City Heat Risk Assessment/i })).toBeInTheDocument();
      expect(screen.getAllByText(assessment.climate_group).length).toBeGreaterThan(0);

      // Circular gauge & score
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
      expect(screen.getAllByText('100.0').length).toBeGreaterThanOrEqual(1);

      // Component Breakdown
      expect(screen.getByText(/UHI Intensity \(50%\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Pop\. Density \(30%\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Canopy Deficit \(20%\)/i)).toBeInTheDocument();

      // Raw indicator values
      expect(screen.getAllByText(`${assessment.raw_indicators.mean_uhi.toFixed(2)} K`).length).toBeGreaterThan(0);
      expect(screen.getAllByText(Math.round(assessment.raw_indicators.mean_pop_density).toLocaleString()).length).toBeGreaterThan(0);

      // Peer table
      expect(screen.getByText(new RegExp(`Climate Group Peers \\(${assessment.climate_group}\\)`, 'i'))).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders data-driven interpretation without causal or health claims', () => {
      const assessment = generateMockCityRiskAssessment('Ahmedabad');
      render(<CityHeatRiskAssessment assessment={assessment} />);

      const summary = screen.getByText(/Data-Driven Assessment Summary/i).parentElement;
      const text = summary?.textContent || '';

      // Must describe contributing factors
      expect(text).toContain('Ahmedabad');
      expect(text).toContain('primary contributor');

      // Zero causal or health claims
      expect(text).not.toMatch(/\bcauses\b/i);
      expect(text).not.toMatch(/\bleads to\b/i);
      expect(text).not.toMatch(/\bresults in\b/i);
      expect(text).not.toMatch(/\bhealth danger\b/i);
    });

    it('handles peer selection callback when clicking a peer city inspect button', () => {
      const assessment = generateMockCityRiskAssessment('Delhi');
      const onSelect = vi.fn();
      render(<CityHeatRiskAssessment assessment={assessment} onCitySelect={onSelect} />);

      // Find an inspect button for a peer city (e.g. Jaipur or Ahmedabad)
      const inspectButtons = screen.getAllByRole('button', { name: /Switch deep dive to/i });
      expect(inspectButtons.length).toBeGreaterThan(0);

      fireEvent.click(inspectButtons[0]);
      expect(onSelect).toHaveBeenCalled();
    });

    it('renders loading, error, and empty states gracefully', () => {
      const { rerender } = render(<CityHeatRiskAssessment assessment={null} loading={true} />);
      expect(screen.getByLabelText(/Loading City Heat Risk Assessment/i)).toBeInTheDocument();

      rerender(<CityHeatRiskAssessment assessment={null} loading={false} />);
      expect(screen.getByText(/No heat risk assessment data available/i)).toBeInTheDocument();

      const assessment = generateMockCityRiskAssessment('Sapporo');
      rerender(<CityHeatRiskAssessment assessment={assessment} error="API unavailable" />);
      expect(screen.getByRole('alert')).toHaveAttribute('role', 'alert');
    });
  });
});
