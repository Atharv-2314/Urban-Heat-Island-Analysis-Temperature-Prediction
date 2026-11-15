// UHI Project - What-If Simulator proxy endpoint
// Calls the Python FastAPI microservice (python_api/main.py) for live model inference.
// server/src/routes/simulator.ts

import { Router, Request, Response, NextFunction } from 'express';
import axios, { AxiosError } from 'axios';
import { cacheService } from '../services/cache';
import { SimulationRequest, SimulationResult, ApiResponse } from '../types';
import CacheService from '../services/cache';

const router = Router();

const PYTHON_API_URL = process.env.PYTHON_API_URL ?? 'http://localhost:8001';

/**
 * POST /api/simulator/run
 * Body: { delta_ndvi?, delta_ndbi?, delta_ndwi?, city? }
 * Proxies to Python FastAPI for real-time model inference.
 */
router.post('/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body: SimulationRequest = req.body;

    // Validate parameter ranges
    if (body.delta_ndvi !== undefined && (body.delta_ndvi < -0.3 || body.delta_ndvi > 0.3)) {
      res.status(400).json({ success: false, error: 'delta_ndvi must be in [-0.30, 0.30]', timestamp: new Date().toISOString() });
      return;
    }
    if (body.delta_ndbi !== undefined && (body.delta_ndbi < -0.3 || body.delta_ndbi > 0.3)) {
      res.status(400).json({ success: false, error: 'delta_ndbi must be in [-0.30, 0.30]', timestamp: new Date().toISOString() });
      return;
    }
    if (body.delta_ndwi !== undefined && (body.delta_ndwi < -0.3 || body.delta_ndwi > 0.3)) {
      res.status(400).json({ success: false, error: 'delta_ndwi must be in [-0.30, 0.30]', timestamp: new Date().toISOString() });
      return;
    }

    // Cache key based on simulation params (short TTL – interactive)
    const cacheKey = CacheService.buildKey('simulator', {
      ndvi: body.delta_ndvi ?? 0,
      ndbi: body.delta_ndbi ?? 0,
      ndwi: body.delta_ndwi ?? 0,
      city: body.city ?? 'all',
    });
    const cached = cacheService.get<SimulationResult[]>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true, count: cached.length, timestamp: new Date().toISOString() });
      return;
    }

    // Proxy to FastAPI
    const pyResponse = await axios.post<{ results: SimulationResult[] }>(
      `${PYTHON_API_URL}/simulate`,
      body,
      { timeout: 30000 }
    );

    const results = pyResponse.data.results;
    cacheService.set(cacheKey, results, CacheService.TTL_SHORT);

    const response: ApiResponse<SimulationResult[]> = {
      success: true,
      data: results,
      cached: false,
      count: results.length,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axiosErr.code === 'ECONNREFUSED' || axiosErr.code === 'ENOTFOUND') {
      res.status(503).json({
        success: false,
        error: 'Python inference service is not running. Start it with: uvicorn python_api.main:app --port 8001',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next(err);
  }
});

/**
 * GET /api/simulator/benchmarks
 * Returns pre-computed simulation benchmarks from the Phase 3 report.
 */
router.get('/benchmarks', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'simulator:benchmarks';
    const cached = cacheService.get<unknown>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true, timestamp: new Date().toISOString() });
      return;
    }

    // Load from Parquet (pre-computed Phase 3 results)
    const { readParquet, DATA_PATHS } = await import('../services/dataLoader');
    const records = await readParquet<SimulationResult>(DATA_PATHS.simulationBenchmarks);
    cacheService.set(cacheKey, records, CacheService.TTL_LONG);
    res.json({ success: true, data: records, cached: false, count: records.length, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/simulator/health
 * Check if the Python FastAPI inference service is reachable.
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const pyRes = await axios.get(`${PYTHON_API_URL}/health`, { timeout: 5000 });
    res.json({ success: true, python_api: pyRes.data, timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({
      success: false,
      python_api: 'unreachable',
      message: 'Start with: uvicorn python_api.main:app --port 8001',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
