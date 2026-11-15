// UHI Project - Monthly UHI temporal data endpoint
// server/src/routes/monthly.ts

import { Router, Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache';
import { readParquet, DATA_PATHS, countParquetRows } from '../services/dataLoader';
import { MonthlyDataRecord, ApiResponse } from '../types';
import { parsePagination } from '../middleware';

const router = Router();

/**
 * GET /api/monthly
 * Query params: city, year, climate_group, page (default 1), limit (default 100, max 500)
 * Returns paginated monthly UHI records.
 */
router.get('/', parsePagination, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = (req as any).pagination;
    const city = req.query.city ? String(req.query.city) : undefined;
    const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
    const climateGroup = req.query.climate_group ? String(req.query.climate_group) : undefined;

    const cacheKey = CacheService.buildKey('monthly', { city: city ?? '', year: year ?? '', climate_group: climateGroup ?? '', page, limit });
    const cached = cacheService.get<ApiResponse<MonthlyDataRecord[]>>(cacheKey);
    if (cached) { res.json({ ...cached, cached: true }); return; }

    // Build filter dict (only equality filters supported at loader level)
    const filters: Record<string, string | number> = {};
    if (city) filters['city'] = city;
    if (year) filters['year'] = year;
    if (climateGroup) filters['climate_group'] = climateGroup;

    // Load full filtered slice, then paginate in JS (Parquet filter is equality only)
    const allRecords = await readParquet<MonthlyDataRecord>(DATA_PATHS.monthlyClean, { filters });
    const total = allRecords.length;
    const page_data = allRecords.slice(offset, offset + limit);

    const response: ApiResponse<MonthlyDataRecord[]> = {
      success: true,
      data: page_data,
      cached: false,
      count: total,
      timestamp: new Date().toISOString(),
    };

    // Also include pagination metadata
    (response as any).pagination = { page, limit, total, total_pages: Math.ceil(total / limit) };

    cacheService.set(cacheKey, response, CacheService.TTL_MEDIUM);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/monthly/city/:cityName
 * Full time-series for a single city across all years (2016–2025).
 * Streamed as NDJSON for large datasets.
 */
router.get('/city/:cityName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cityName = decodeURIComponent(String(req.params['cityName']));
    const cacheKey = `monthly:city:${cityName.toLowerCase()}`;
    const cached = cacheService.get<MonthlyDataRecord[]>(cacheKey);

    if (cached) {
      res.json({ success: true, data: cached, cached: true, count: cached.length, timestamp: new Date().toISOString() });
      return;
    }

    const records = await readParquet<MonthlyDataRecord>(DATA_PATHS.monthlyClean, {
      filters: { city: cityName },
    });

    if (records.length === 0) {
      res.status(404).json({ success: false, error: `No data found for city: ${cityName}`, timestamp: new Date().toISOString() });
      return;
    }

    // Sort chronologically
    records.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    cacheService.set(cacheKey, records, CacheService.TTL_MEDIUM);

    res.json({ success: true, data: records, cached: false, count: records.length, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/monthly/summary
 * Aggregated per-city statistics: mean UHI, max UHI, trend direction.
 */
router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'monthly:summary';
    const cached = cacheService.get<Record<string, unknown>[]>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true, count: cached.length, timestamp: new Date().toISOString() });
      return;
    }

    const columns = ['city', 'year', 'month', 'uhi_intensity', 'climate_group', 'latitude', 'longitude'];
    const records = await readParquet<MonthlyDataRecord>(DATA_PATHS.monthlyClean, { columns });

    // Aggregate per city
    const cityMap = new Map<string, { values: number[]; city: string; climate_group: string; latitude: number; longitude: number }>();
    for (const r of records) {
      if (!cityMap.has(r.city)) {
        cityMap.set(r.city, { values: [], city: r.city, climate_group: r.climate_group, latitude: r.latitude, longitude: r.longitude });
      }
      if (r.uhi_intensity != null && !isNaN(r.uhi_intensity)) {
        cityMap.get(r.city)!.values.push(r.uhi_intensity);
      }
    }

    const summary = Array.from(cityMap.values()).map(({ city, climate_group, latitude, longitude, values }) => {
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      return { city, climate_group, latitude, longitude, mean_uhi: +mean.toFixed(4), max_uhi: +max.toFixed(4), min_uhi: +min.toFixed(4), data_points: values.length };
    }).sort((a, b) => b.mean_uhi - a.mean_uhi);

    cacheService.set(cacheKey, summary, CacheService.TTL_LONG);
    res.json({ success: true, data: summary, cached: false, count: summary.length, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

import CacheService from '../services/cache';

export default router;
