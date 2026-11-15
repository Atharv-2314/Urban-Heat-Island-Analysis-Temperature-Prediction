// UHI Project - Cities metadata endpoint
// server/src/routes/cities.ts

import { Router, Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache';
import { readParquet, DATA_PATHS } from '../services/dataLoader';
import { MonthlyDataRecord, ApiResponse, CityRecord } from '../types';

const router = Router();

/**
 * GET /api/cities
 * Returns the 42-city registry with coordinates, climate group, and region.
 * Derived by aggregating unique city metadata from the monthly clean dataset.
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'cities:all';
    const cached = cacheService.get<CityRecord[]>(cacheKey);

    if (cached) {
      const response: ApiResponse<CityRecord[]> = {
        success: true,
        data: cached,
        cached: true,
        count: cached.length,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
      return;
    }

    // Load minimal columns needed for city registry
    const columns = ['city', 'latitude', 'longitude', 'climate_group'];
    const records = await readParquet<MonthlyDataRecord>(DATA_PATHS.monthlyClean, { columns });

    // Deduplicate by city name, keep first occurrence
    const cityMap = new Map<string, CityRecord>();
    for (const r of records) {
      if (!cityMap.has(r.city)) {
        cityMap.set(r.city, {
          city: r.city,
          country: inferCountry(r.city),
          latitude: r.latitude,
          longitude: r.longitude,
          climate_group: r.climate_group,
          koppen_zone: inferKoppen(r.climate_group),
          region: inferRegion(r.latitude, r.longitude),
        });
      }
    }

    const cities = Array.from(cityMap.values()).sort((a, b) => a.city.localeCompare(b.city));
    cacheService.set(cacheKey, cities, CacheService.TTL_PERMANENT);

    const response: ApiResponse<CityRecord[]> = {
      success: true,
      data: cities,
      cached: false,
      count: cities.length,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cities/:cityName
 * Returns metadata for a single city.
 */
router.get('/:cityName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cityName = decodeURIComponent(String(req.params['cityName']));
    const cacheKey = `cities:single:${cityName.toLowerCase()}`;
    const cached = cacheService.get<CityRecord>(cacheKey);

    if (cached) {
      res.json({ success: true, data: cached, cached: true, timestamp: new Date().toISOString() });
      return;
    }

    const columns = ['city', 'latitude', 'longitude', 'climate_group'];
    const records = await readParquet<MonthlyDataRecord>(DATA_PATHS.monthlyClean, {
      columns,
      filters: { city: String(cityName) },
      limit: 1,
    });

    if (records.length === 0) {
      res.status(404).json({ success: false, error: `City not found: ${cityName}`, timestamp: new Date().toISOString() });
      return;
    }

    const r = records[0];
    const city: CityRecord = {
      city: r.city,
      country: inferCountry(r.city),
      latitude: r.latitude,
      longitude: r.longitude,
      climate_group: r.climate_group,
      koppen_zone: inferKoppen(r.climate_group),
      region: inferRegion(r.latitude, r.longitude),
    };

    cacheService.set(cacheKey, city, CacheService.TTL_PERMANENT);
    res.json({ success: true, data: city, cached: false, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// ── Helper functions ──────────────────────────────────────────────────────────

function inferCountry(city: string): string {
  const indianCities = new Set([
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
    'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Surat', 'Nagpur',
    'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad',
    'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Meerut',
  ]);
  return indianCities.has(city) ? 'India' : 'International';
}

function inferKoppen(climateGroup: string): string {
  const mapping: Record<string, string> = {
    'Tropical': 'Af/Am/Aw',
    'Arid': 'BWh/BWk/BSh',
    'Temperate': 'Cfa/Cfb/Cwa',
    'Continental': 'Dfa/Dfb/Dwa',
  };
  return mapping[climateGroup] ?? climateGroup;
}

function inferRegion(lat: number, lon: number): string {
  if (lat >= 5 && lat <= 37 && lon >= 68 && lon <= 97) return 'South Asia';
  if (lat >= 1 && lat <= 23 && lon >= 100 && lon <= 145) return 'Southeast Asia';
  if (lat >= 20 && lat <= 55 && lon >= 100 && lon <= 145) return 'East Asia';
  if (lat >= 35 && lat <= 72 && lon >= -10 && lon <= 45) return 'Europe';
  if (lat >= 24 && lat <= 72 && lon >= -130 && lon <= -60) return 'North America';
  if (lat >= -60 && lat <= 15 && lon >= -82 && lon <= -34) return 'South America';
  if (lat >= -40 && lat <= 38 && lon >= -18 && lon <= 52) return 'Africa';
  return 'Other';
}

// CacheService reference for TTL constant
import CacheService from '../services/cache';

export default router;
