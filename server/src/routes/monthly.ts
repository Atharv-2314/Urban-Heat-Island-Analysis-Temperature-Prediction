// UHI Project - Monthly UHI temporal data endpoint
// server/src/routes/monthly.ts

import { Router, Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache';
import { readParquet, DATA_PATHS, countParquetRows } from '../services/dataLoader';
import { MonthlyDataRecord, ApiResponse } from '../types';
import { parsePagination } from '../middleware';
import CacheService from '../services/cache';

const router = Router();

/**
 * Normalizes a raw Parquet or database record into the standardized MonthlyDataRecord.
 * Reconciles schema naming differences:
 *   - uhi -> uhi_intensity
 *   - lst -> lst_urban
 *   - rural_lst -> lst_rural
 *   - air_temperature -> temperature_2m
 * Preserves aliases (uhi, lst, rural_lst, air_temperature) for bidirectional compatibility.
 * Explicitly preserves nulls for cloud-covered missing thermal satellite observations.
 */
export function normalizeMonthlyRecord(raw: any): MonthlyDataRecord {
  const cleanFloat = (val: any, decimals = 4): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'number' ? val : Number(val);
    if (!isFinite(num) || isNaN(num)) return null;
    return Number(num.toFixed(decimals));
  };

  const cleanRequiredFloat = (val: any, decimals = 4, fallback = 0): number => {
    if (val === null || val === undefined || val === '') return fallback;
    const num = typeof val === 'number' ? val : Number(val);
    if (!isFinite(num) || isNaN(num)) return fallback;
    return Number(num.toFixed(decimals));
  };

  const uhiVal = cleanFloat(raw.uhi_intensity ?? raw.uhi);
  const urbanLstVal = cleanFloat(raw.lst_urban ?? raw.lst);
  const ruralLstVal = cleanFloat(raw.lst_rural ?? raw.rural_lst);
  const airTempVal = cleanFloat(raw.temperature_2m ?? raw.air_temperature);
  const ndviVal = cleanFloat(raw.ndvi);
  const ndbiVal = cleanFloat(raw.ndbi);
  const ndwiVal = cleanFloat(raw.ndwi);
  const cloudVal = cleanFloat(raw.cloud_cover ?? raw.Mean_Landsat_Observations_Per_Pixel, 2);

  return {
    city: String(raw.city ?? ''),
    year: parseInt(String(raw.year), 10),
    month: parseInt(String(raw.month), 10),
    // Standard schema fields
    uhi_intensity: uhiVal,
    lst_urban: urbanLstVal,
    lst_rural: ruralLstVal,
    temperature_2m: airTempVal,
    ndvi: ndviVal,
    ndbi: ndbiVal,
    ndwi: ndwiVal,
    relative_humidity: cleanRequiredFloat(raw.relative_humidity, 2),
    wind_speed: cleanRequiredFloat(raw.wind_speed, 2),
    total_precipitation: cleanRequiredFloat(raw.total_precipitation, 2),
    cloud_cover: cloudVal,
    climate_group: String(raw.climate_group ?? ''),
    latitude: cleanRequiredFloat(raw.latitude, 4),
    longitude: cleanRequiredFloat(raw.longitude, 4),
    // Backwards and cross-compatibility aliases
    uhi: uhiVal,
    lst: urbanLstVal,
    rural_lst: ruralLstVal,
    air_temperature: airTempVal,
  };
}

/**
 * GET /api/monthly
 * Query params: city, year, climate_group, page (default 1), limit (default 100, max 500)
 * Returns paginated monthly UHI records with standardized schema.
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

    // Load full filtered slice, normalize, then paginate in JS
    const rawRecords = await readParquet<any>(DATA_PATHS.monthlyClean, { filters });
    const allRecords = rawRecords.map(normalizeMonthlyRecord);
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
 * Reconciled schema with both standard properties and aliases.
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

    const rawRecords = await readParquet<any>(DATA_PATHS.monthlyClean, {
      filters: { city: cityName },
    });

    if (rawRecords.length === 0) {
      res.status(404).json({ success: false, error: `No data found for city: ${cityName}`, timestamp: new Date().toISOString() });
      return;
    }

    const records = rawRecords.map(normalizeMonthlyRecord);

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
 * Aggregated per-city statistics: mean UHI, max UHI, min UHI, data points.
 */
router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'monthly:summary';
    const cached = cacheService.get<Record<string, unknown>[]>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true, count: cached.length, timestamp: new Date().toISOString() });
      return;
    }

    const columns = ['city', 'year', 'month', 'uhi', 'climate_group', 'latitude', 'longitude'];
    const records = await readParquet<any>(DATA_PATHS.monthlyClean, { columns });

    // Aggregate per city
    const cityMap = new Map<string, { values: number[]; city: string; climate_group: string; latitude: number; longitude: number }>();
    for (const r of records) {
      if (!cityMap.has(r.city)) {
        cityMap.set(r.city, {
          values: [],
          city: r.city,
          climate_group: r.climate_group,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
        });
      }
      const rawUhi = r.uhi != null && !isNaN(r.uhi) ? Number(r.uhi) : (r.uhi_intensity != null && !isNaN(r.uhi_intensity) ? Number(r.uhi_intensity) : null);
      if (rawUhi !== null && isFinite(rawUhi)) {
        cityMap.get(r.city)!.values.push(rawUhi);
      }
    }

    const summary = Array.from(cityMap.values()).map(({ city, climate_group, latitude, longitude, values }) => {
      const mean = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;
      const min = values.length > 0 ? Math.min(...values) : 0;
      return {
        city,
        climate_group,
        latitude: +latitude.toFixed(4),
        longitude: +longitude.toFixed(4),
        mean_uhi: +mean.toFixed(4),
        max_uhi: +max.toFixed(4),
        min_uhi: +min.toFixed(4),
        data_points: values.length,
      };
    }).sort((a, b) => b.mean_uhi - a.mean_uhi);

    cacheService.set(cacheKey, summary, CacheService.TTL_LONG);
    res.json({ success: true, data: summary, cached: false, count: summary.length, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

export default router;
