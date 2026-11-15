// UHI Project - Model metrics, risk scores, SHAP, forecast endpoints
// server/src/routes/models.ts

import { Router, Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache';
import { loadJsonReport, readParquet, DATA_PATHS, REPORT_PATHS } from '../services/dataLoader';
import { ModelMetricsResponse, RiskScore, ShapValue, ForecastBenchmark, ApiResponse } from '../types';
import CacheService from '../services/cache';

const router = Router();

/** GET /api/models/metrics — All model RMSE/MAE/R² for 2024 val + 2025 test */
router.get('/metrics', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'models:metrics';
    const cached = cacheService.get<ModelMetricsResponse>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true, timestamp: new Date().toISOString() });
      return;
    }
    const data = loadJsonReport<ModelMetricsResponse>(REPORT_PATHS.modelMetrics);
    cacheService.set(cacheKey, data, CacheService.TTL_LONG);
    res.json({ success: true, data, cached: false, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

/** GET /api/models/risk — City-level UHI risk scores and tiers */
router.get('/risk', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'models:risk';
    const cached = cacheService.get<RiskScore[]>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true, count: cached.length, timestamp: new Date().toISOString() });
      return;
    }

    // Try JSON report first (fastest), fall back to Parquet
    try {
      const json = loadJsonReport<{ city_risk_scores: RiskScore[] }>(REPORT_PATHS.climateRisk);
      const data = json.city_risk_scores ?? (json as unknown as RiskScore[]);
      cacheService.set(cacheKey, data, CacheService.TTL_LONG);
      res.json({ success: true, data, cached: false, count: Array.isArray(data) ? data.length : 0, timestamp: new Date().toISOString() });
    } catch {
      const data = await readParquet<RiskScore>(DATA_PATHS.riskScores);
      cacheService.set(cacheKey, data, CacheService.TTL_LONG);
      res.json({ success: true, data, cached: false, count: data.length, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    next(err);
  }
});

/** GET /api/models/shap — SHAP feature importance (global summary) */
router.get('/shap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const city = req.query.city as string | undefined;
    const cacheKey = `models:shap:${city ?? 'all'}`;
    const cached = cacheService.get<unknown>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true, timestamp: new Date().toISOString() });
      return;
    }

    // Load from JSON report for global summary
    const json = loadJsonReport<Record<string, unknown>>(REPORT_PATHS.shapExplainability);

    if (city) {
      // Load per-city SHAP from Parquet
      const records = await readParquet<ShapValue>(DATA_PATHS.shapValues, {
        filters: { city },
      });
      const result = { global_summary: json, city_shap: records };
      cacheService.set(cacheKey, result, CacheService.TTL_MEDIUM);
      res.json({ success: true, data: result, cached: false, timestamp: new Date().toISOString() });
    } else {
      cacheService.set(cacheKey, json, CacheService.TTL_LONG);
      res.json({ success: true, data: json, cached: false, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    next(err);
  }
});

/** GET /api/models/forecast — Weather forecast benchmark scores */
router.get('/forecast', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'models:forecast';
    const cached = cacheService.get<unknown>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true, timestamp: new Date().toISOString() });
      return;
    }
    const data = loadJsonReport<unknown>(REPORT_PATHS.weatherForecast);
    cacheService.set(cacheKey, data, CacheService.TTL_LONG);
    res.json({ success: true, data, cached: false, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

/** GET /api/models/counterfactual — Counterfactual simulation benchmark report */
router.get('/counterfactual', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'models:counterfactual';
    const cached = cacheService.get<unknown>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true, timestamp: new Date().toISOString() });
      return;
    }
    const data = loadJsonReport<unknown>(REPORT_PATHS.counterfactual);
    cacheService.set(cacheKey, data, CacheService.TTL_LONG);
    res.json({ success: true, data, cached: false, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

export default router;
