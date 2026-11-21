// Unit and Smoke Tests for Express Server API Endpoints & Caching
// server/src/__tests__/api.test.ts

import { cacheService } from '../services/cache';
import { REPORT_PATHS, DATA_PATHS, loadJsonReport, readParquet } from '../services/dataLoader';
import { normalizeMonthlyRecord } from '../routes/monthly';
import { computeShapAttribution, INDIAN_CITIES } from '../routes/models';
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

  test('Milestone 37: City-specific SHAP attribution computation produces responsive rankings and closed waterfall', async () => {
    const delhiRecords = await readParquet<Record<string, any>>(DATA_PATHS.shapValues, {
      filters: { city: 'delhi' },
    });
    expect(delhiRecords.length).toBe(11);

    const delhiShap = computeShapAttribution(delhiRecords, 'Delhi');
    expect(delhiShap.city).toBe('Delhi');
    expect(delhiShap.records_analyzed).toBe(11);
    expect(delhiShap.top_drivers.length).toBe(10);
    expect(delhiShap.base_expected).toBeCloseTo(0.2019, 3);
    expect(delhiShap.waterfall.steps.length).toBeGreaterThan(0);
    expect(delhiShap.net_predicted_uhi).toBeCloseTo(0.12, 1);

    const ahmedabadRecords = await readParquet<Record<string, any>>(DATA_PATHS.shapValues, {
      filters: { city: 'ahmedabad' },
    });
    const ahmedabadShap = computeShapAttribution(ahmedabadRecords, 'Ahmedabad');
    expect(ahmedabadShap.city).toBe('Ahmedabad');
    expect(ahmedabadShap.records_analyzed).toBe(12);
    expect(ahmedabadShap.top_drivers[0].feature).toBe('Urban_Valid_LST_Pixel_Count');
    expect(ahmedabadShap.net_predicted_uhi).toBeCloseTo(0.49, 1);

    // Verify distinct drivers between Delhi and Ahmedabad
    expect(delhiShap.top_drivers[0].feature).not.toBe(ahmedabadShap.top_drivers[0].feature);
  }, 30000);

  test('Milestones 38-40: Dynamic Regional & Combined Global SHAP Aggregations', async () => {
    const allRecords = await readParquet<Record<string, any>>(DATA_PATHS.shapValues);
    expect(allRecords.length).toBe(489);

    // Milestone 38: India-only aggregation (24 metros, 278 observations)
    const indiaRecords = allRecords.filter((r) => INDIAN_CITIES.has(String(r.city).toLowerCase()));
    expect(indiaRecords.length).toBe(278);
    const indiaShap = computeShapAttribution(indiaRecords, 'Indian Cities Cohort (24 Metros)');
    expect(indiaShap.records_analyzed).toBe(278);
    expect(indiaShap.top_drivers.length).toBe(10);
    expect(indiaShap.top_drivers[0].feature).toBe('Urban_Valid_LST_Pixel_Count');
    expect(indiaShap.top_drivers[1].feature).toBe('relative_humidity');
    expect(indiaShap.top_drivers[1].mean_abs_shap).toBeCloseTo(0.391, 2);
    expect(indiaShap.net_predicted_uhi).toBeCloseTo(0.28, 2);

    // Milestone 39: International-only aggregation (18 metros, 211 observations)
    const intlRecords = allRecords.filter((r) => !INDIAN_CITIES.has(String(r.city).toLowerCase()));
    expect(intlRecords.length).toBe(211);
    const intlShap = computeShapAttribution(intlRecords, 'International Cities Cohort (18 Metros)');
    expect(intlShap.records_analyzed).toBe(211);
    expect(intlShap.top_drivers.length).toBe(10);
    expect(intlShap.top_drivers[0].feature).toBe('Urban_Valid_LST_Pixel_Count');
    expect(intlShap.top_drivers[1].feature).toBe('relative_humidity');
    expect(intlShap.top_drivers[2].feature).toBe('longitude');
    expect(intlShap.net_predicted_uhi).toBeCloseTo(0.63, 2);

    // Verify mutual exclusion and complete partitioning
    expect(indiaRecords.length + intlRecords.length).toBe(489);
    for (const r of indiaRecords) {
      expect(INDIAN_CITIES.has(String(r.city).toLowerCase())).toBe(true);
    }
    for (const r of intlRecords) {
      expect(INDIAN_CITIES.has(String(r.city).toLowerCase())).toBe(false);
    }

    // Milestone 40: Combined Global aggregation (42 metros, 489 observations)
    const globalShap = computeShapAttribution(allRecords, 'Global 42-City Cohort');
    expect(globalShap.records_analyzed).toBe(489);
    expect(globalShap.top_drivers.length).toBe(10);
    expect(globalShap.top_drivers[0].feature).toBe('Urban_Valid_LST_Pixel_Count');
    expect(globalShap.top_drivers[0].mean_abs_shap).toBeCloseTo(0.4231, 2);
    expect(globalShap.top_drivers[1].feature).toBe('relative_humidity');
    expect(globalShap.top_drivers[1].mean_abs_shap).toBeCloseTo(0.3646, 2);
    expect(globalShap.top_drivers[2].feature).toBe('longitude');
    expect(globalShap.top_drivers[2].mean_abs_shap).toBeCloseTo(0.2901, 2);
    expect(globalShap.top_drivers[3].feature).toBe('relative_humidity_lag1');
    expect(globalShap.top_drivers[3].mean_abs_shap).toBeCloseTo(0.2214, 2);
    expect(globalShap.top_drivers[4].feature).toBe('Rural_Valid_LST_Pixel_Count');
    expect(globalShap.top_drivers[4].mean_abs_shap).toBeCloseTo(0.1501, 2);
    expect(globalShap.net_predicted_uhi).toBeCloseTo(0.43, 2);

    // Verify waterfall additive closure across scopes
    for (const res of [indiaShap, intlShap, globalShap]) {
      expect(res.waterfall.baseExpected).toBeCloseTo(0.2019, 3);
      const last = res.waterfall.steps[res.waterfall.steps.length - 1];
      expect(last.end).toBeCloseTo(res.waterfall.finalPrediction, 1);
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
