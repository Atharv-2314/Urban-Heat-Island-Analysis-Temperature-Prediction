// Unit and Smoke Tests for Express Server API Endpoints & Caching
// server/src/__tests__/api.test.ts

import { cacheService } from '../services/cache';
import { REPORT_PATHS, loadJsonReport } from '../services/dataLoader';
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
  });

  test('Deterministic cache key builder constructs sorted keys', () => {
    const key1 = cacheService.constructor ? (cacheService.constructor as any).buildKey('test', { b: 2, a: 1 }) : null;
    expect(key1).toBe('test:a=1&b=2');
  });
});
