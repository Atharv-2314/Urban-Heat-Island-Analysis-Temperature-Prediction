// UHI Project - Sampled ~1 km Grid Spatial Data endpoint
// server/src/routes/spatial.ts

import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { cacheService } from '../services/cache';
import { readParquet, DATA_PATHS } from '../services/dataLoader';
import CacheService from '../services/cache';

const router = Router();

export interface GridPixelRecord {
  latitude: number;
  longitude: number;
  uhi: number;
  lst: number;
  ndvi: number;
  ndbi: number;
  ndwi: number;
  population_density: number;
  city: string;
  year?: number;
  month?: number;
}

/**
 * GET /api/spatial/grid/:cityName
 * Returns sampled ~1 km grid points for a given city (e.g. Delhi, Ahmedabad, London, Tokyo)
 * Allows query parameters: year, month, limit (default 250)
 */
router.get('/grid/:cityName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cityName = decodeURIComponent(String(req.params['cityName'])).toLowerCase().replace(/[\s_-]/g, '');
    const limit = Math.min(1000, Math.max(10, parseInt(String(req.query['limit'] ?? '300'), 10)));
    const year = req.query['year'] ? parseInt(String(req.query['year']), 10) : undefined;
    const month = req.query['month'] ? parseInt(String(req.query['month']), 10) : undefined;

    const cacheKey = CacheService.buildKey('spatial:grid', {
      city: cityName,
      limit,
      year: year ?? '',
      month: month ?? '',
    });

    const cached = cacheService.get<GridPixelRecord[]>(cacheKey);
    if (cached) {
      res.json({
        success: true,
        data: cached,
        cached: true,
        count: cached.length,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const gridFile = path.join(DATA_PATHS.pixelLevelDir, `uhi_grid_${cityName}.parquet`);
    if (!fs.existsSync(gridFile)) {
      res.status(404).json({
        success: false,
        error: `Grid spatial file not found for city: ${cityName}. Available cities include ahmedabad, beijing, delhi, tokyo, london, etc.`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const filters: Record<string, string | number> = {};
    if (year) filters['year'] = year;
    if (month) filters['month'] = month;

    const columns = [
      'latitude',
      'longitude',
      'uhi',
      'lst',
      'ndvi',
      'ndbi',
      'ndwi',
      'population_density',
      'city',
      'year',
      'month',
    ];

    const records = await readParquet<GridPixelRecord>(gridFile, {
      columns,
      filters,
      limit,
    });

    cacheService.set(cacheKey, records, CacheService.TTL_MEDIUM);

    res.json({
      success: true,
      data: records,
      cached: false,
      count: records.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/spatial/available-cities
 * Lists all cities with sampled ~1 km grid spatial datasets.
 */
router.get('/available-cities', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dir = DATA_PATHS.pixelLevelDir;
    if (!fs.existsSync(dir)) {
      res.json({ success: true, data: [], count: 0, timestamp: new Date().toISOString() });
      return;
    }

    const files = fs.readdirSync(dir);
    const cities = files
      .filter((f) => f.startsWith('uhi_grid_') && f.endsWith('.parquet'))
      .map((f) => f.replace('uhi_grid_', '').replace('.parquet', ''));

    res.json({
      success: true,
      data: cities,
      count: cities.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
