// Unit and Smoke Tests for Express Server API Endpoints & Caching
// server/src/__tests__/api.test.ts

import { cacheService } from '../services/cache';
import { REPORT_PATHS, DATA_PATHS, loadJsonReport, readParquet } from '../services/dataLoader';
import { normalizeMonthlyRecord } from '../routes/monthly';
import fs from 'fs';

describe('Server Architecture & Data Serving Layer', () => {
  beforeEach(() => {
    cacheService.flush();
  });

  test('CacheService handles set, get, TTL and stats correctly', () => {
    expect(cacheService.get('nonexistent')).toBeUndefined();
    
    cacheService.set('test_city', { city: 'Delhi', uhi: 3.12 }, 60);
    const cached = cacheService.get<{ city: string; uhi: number }>('test_city');
    expect(cached).toBeDefined();
    expect(cached?.city).toBe('Delhi');
    expect(cached?.uhi).toBe(3.12);

    const stats = cacheService.stats();
    expect(stats.keys).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  test('normalizeMonthlyRecord reconciles schema naming and handles missing cloud observations', () => {
    const rawParquetRow = {
      city: 'Delhi',
      year: 2024,
      month: 6,
      uhi: 2.8543,
      lst: 42.1234,
      rural_lst: 39.2691,
      air_temperature: 36.5,
      ndvi: 0.182,
      ndbi: 0.354,
      ndwi: -0.15,
      relative_humidity: 45.2,
      wind_speed: 2.1,
      total_precipitation: 12.4,
      Mean_Landsat_Observations_Per_Pixel: 2.5,
      climate_group: 'Hot_SemiArid',
      latitude: 28.7041,
      longitude: 77.1025,
    };

    const normalized = normalizeMonthlyRecord(rawParquetRow);

    // Standard schema fields
    expect(normalized.city).toBe('Delhi');
    expect(normalized.year).toBe(2024);
    expect(normalized.month).toBe(6);
    expect(normalized.uhi_intensity).toBe(2.8543);
    expect(normalized.lst_urban).toBe(42.1234);
    expect(normalized.lst_rural).toBe(39.2691);
    expect(normalized.temperature_2m).toBe(36.5);
    expect(normalized.cloud_cover).toBe(2.5);

    // Aliases
    expect(normalized.uhi).toBe(2.8543);
    expect(normalized.lst).toBe(42.1234);
    expect(normalized.rural_lst).toBe(39.2691);
    expect(normalized.air_temperature).toBe(36.5);

    // Cloud missingness handling
    const rawCloudyRow = {
      city: 'Mumbai',
      year: 2024,
      month: 7,
      uhi: null,
      lst: null,
      rural_lst: null,
      air_temperature: 28.2,
      relative_humidity: 92.5,
      wind_speed: 5.4,
      total_precipitation: 650.0,
      Mean_Landsat_Observations_Per_Pixel: null,
      climate_group: 'Tropical_Monsoon',
      latitude: 19.076,
      longitude: 72.8777,
    };

    const cloudyNormalized = normalizeMonthlyRecord(rawCloudyRow);
    expect(cloudyNormalized.uhi_intensity).toBeNull();
    expect(cloudyNormalized.lst_urban).toBeNull();
    expect(cloudyNormalized.lst_rural).toBeNull();
    expect(cloudyNormalized.uhi).toBeNull();
    expect(cloudyNormalized.temperature_2m).toBe(28.2);
  });

  test('Monthly clean Parquet file loads with case-insensitive city matching and full data contract', async () => {
    const records = await readParquet<any>(DATA_PATHS.monthlyClean, {
      filters: { city: 'delhi' },
    });

    expect(records.length).toBe(120); // 10 years × 12 months

    const normalized = records.map(normalizeMonthlyRecord);
    for (const r of normalized) {
      expect(typeof r.year).toBe('number');
      expect(typeof r.month).toBe('number');
      expect(r.city.toLowerCase()).toBe('delhi');
      // If uhi_intensity exists, it must equal uhi alias
      if (r.uhi_intensity !== null) {
        expect(r.uhi_intensity).toBe(r.uhi);
        expect(typeof r.uhi_intensity).toBe('number');
      }
    }
  });

  test('Milestone 35: End-to-end multi-city monthly schema, chronological sorting, and seasonal consistency', async () => {
    const testCities = ['Delhi', 'Ahmedabad', 'Bengaluru', 'London'];
    const expectedBaselines: Record<string, { total: number; validMin: number; expectedMeanRange: [number, number] }> = {
      Delhi: { total: 120, validMin: 115, expectedMeanRange: [0.05, 0.20] },
      Ahmedabad: { total: 120, validMin: 115, expectedMeanRange: [0.45, 0.65] },
      Bengaluru: { total: 120, validMin: 100, expectedMeanRange: [-0.90, -0.65] },
      London: { total: 120, validMin: 105, expectedMeanRange: [0.35, 0.55] },
    };

    for (const cityName of testCities) {
      const records = await readParquet<any>(DATA_PATHS.monthlyClean, {
        filters: { city: cityName },
      });

      expect(records.length).toBe(120);

      // Verify strict chronological ordering or sortability
      const sorted = records
        .map(normalizeMonthlyRecord)
        .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));

      expect(sorted[0].year).toBe(2016);
      expect(sorted[0].month).toBe(1);
      expect(sorted[sorted.length - 1].year).toBe(2025);
      expect(sorted[sorted.length - 1].month).toBe(12);

      // Validate required columns & numeric types
      for (const r of sorted) {
        expect(typeof r.year).toBe('number');
        expect(typeof r.month).toBe('number');
        expect(r.month).toBeGreaterThanOrEqual(1);
        expect(r.month).toBeLessThanOrEqual(12);

        // Required physical bounded values
        if (r.temperature_2m !== null) {
          expect(typeof r.temperature_2m).toBe('number');
          expect(r.temperature_2m).toBeGreaterThan(-50);
          expect(r.temperature_2m).toBeLessThan(70);
        }
        if (r.uhi_intensity !== null) {
          expect(typeof r.uhi_intensity).toBe('number');
          expect(isFinite(r.uhi_intensity)).toBe(true);
        }
      }

      // Check baseline calculations against expected values
      const validUhis = sorted
        .map((r) => r.uhi_intensity)
        .filter((v): v is number => v !== null && isFinite(v));
      
      const config = expectedBaselines[cityName];
      expect(validUhis.length).toBeGreaterThanOrEqual(config.validMin);

      const meanUhi = validUhis.reduce((a, b) => a + b, 0) / validUhis.length;
      expect(meanUhi).toBeGreaterThanOrEqual(config.expectedMeanRange[0]);
      expect(meanUhi).toBeLessThanOrEqual(config.expectedMeanRange[1]);
    }
  }, 30000);

  test('Pre-generated scientific reports exist and have valid JSON schemas', () => {
    expect(fs.existsSync(REPORT_PATHS.modelMetrics)).toBe(true);
    expect(fs.existsSync(REPORT_PATHS.climateRisk)).toBe(true);
    expect(fs.existsSync(REPORT_PATHS.shapExplainability)).toBe(true);
    expect(fs.existsSync(REPORT_PATHS.counterfactual)).toBe(true);
    expect(fs.existsSync(REPORT_PATHS.weatherForecast)).toBe(true);

    const modelMetrics = loadJsonReport<any>(REPORT_PATHS.modelMetrics);
    expect(modelMetrics.best_model).toBe('Hist_Gradient_Boosting');
    expect(modelMetrics.Hist_Gradient_Boosting.test_2025.r2).toBeCloseTo(0.5848, 2);

    const counterfactual = loadJsonReport<any>(REPORT_PATHS.counterfactual);
    expect(counterfactual.scenario.name).toContain('Moderate');
    expect(counterfactual.global_average_cooling_celsius).toBeGreaterThan(0.2);

    // Phase 7 Rolling Window Report Paths
    expect(fs.existsSync(REPORT_PATHS.rollingMetrics)).toBe(true);
    expect(fs.existsSync(REPORT_PATHS.rollingComparison)).toBe(true);
    expect(fs.existsSync(REPORT_PATHS.rollingRobustness)).toBe(true);
    expect(fs.existsSync(REPORT_PATHS.rollingFoldsMeta)).toBe(true);

    const rollingMetrics = loadJsonReport<any>(REPORT_PATHS.rollingMetrics);
    expect(rollingMetrics.best_overall_model).toBe('Hist_Gradient_Boosting');
    expect(rollingMetrics.stability_metrics.Hist_Gradient_Boosting.mean_rmse).toBeCloseTo(1.7404, 2);
  });

  test('Deterministic cache key builder constructs sorted keys', () => {
    const key1 = cacheService.constructor ? (cacheService.constructor as any).buildKey('test', { b: 2, a: 1 }) : null;
    expect(key1).toBe('test:a=1&b=2');
  });
});
