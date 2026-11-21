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

/** GET /api/models/rolling/metrics — 5-Year Rolling Window Evaluation Metrics & Stability */
router.get('/rolling/metrics', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'models:rolling:metrics';
    const cached = cacheService.get<unknown>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true, timestamp: new Date().toISOString() });
      return;
    }
    const data = loadJsonReport<unknown>(REPORT_PATHS.rollingMetrics);
    cacheService.set(cacheKey, data, CacheService.TTL_LONG);
    res.json({ success: true, data, cached: false, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

/** GET /api/models/rolling/comparison — Fixed Split vs Rolling Window Comparative Report */
router.get('/rolling/comparison', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'models:rolling:comparison';
    const cached = cacheService.get<unknown>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true, timestamp: new Date().toISOString() });
      return;
    }
    const data = loadJsonReport<unknown>(REPORT_PATHS.rollingComparison);
    cacheService.set(cacheKey, data, CacheService.TTL_LONG);
    res.json({ success: true, data, cached: false, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

/** GET /api/models/rolling/robustness — Multidimensional Robustness Breakdown */
router.get('/rolling/robustness', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'models:rolling:robustness';
    const cached = cacheService.get<unknown>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true, timestamp: new Date().toISOString() });
      return;
    }
    const data = loadJsonReport<unknown>(REPORT_PATHS.rollingRobustness);
    cacheService.set(cacheKey, data, CacheService.TTL_LONG);
    res.json({ success: true, data, cached: false, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

/** GET /api/models/rolling/export/:type — Export CSV files for rolling metrics, comparisons, or predictions */
router.get('/rolling/export/:type', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    const fileMap: Record<string, string> = {
      'metrics': 'rolling_evaluation_metrics.csv',
      'stability': 'rolling_stability_summary.csv',
      'comparison': 'fixed_vs_rolling_comparison.csv',
      'city_robustness': 'rolling_city_robustness.csv',
      'regional_robustness': 'rolling_regional_robustness.csv',
      'climate_robustness': 'rolling_climate_robustness.csv',
      'seasonal_robustness': 'rolling_seasonal_robustness.csv',
      'temporal_trajectory': 'rolling_temporal_trajectory.csv',
    };

    const fileName = fileMap[type];
    if (!fileName) {
      res.status(400).json({ success: false, error: `Invalid export type: ${type}. Valid types: ${Object.keys(fileMap).join(', ')}` });
      return;
    }

    const filePath = require('path').join(__dirname, '..', '..', '..', 'data', 'processed', 'rolling_results', fileName);
    if (!require('fs').existsSync(filePath)) {
      res.status(404).json({ success: false, error: `File not found: ${fileName}` });
      return;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

export default router;
