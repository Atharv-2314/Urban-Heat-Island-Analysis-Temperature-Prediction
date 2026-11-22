// UHI Project - Model metrics, risk scores, SHAP, forecast endpoints
// server/src/routes/models.ts

import { Router, Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache';
import { loadJsonReport, readParquet, DATA_PATHS, REPORT_PATHS } from '../services/dataLoader';
import { ModelMetricsResponse, RiskScore, ShapValue, ForecastBenchmark, ApiResponse, CityRiskAssessment, PeerCityRisk } from '../types';
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

/** Helper to retrieve and normalize all 42 city risk scores from JSON or Parquet with in-memory caching */
export async function getNormalizedRiskScores(): Promise<RiskScore[]> {
  const cacheKey = 'models:risk:all';
  const cached = cacheService.get<RiskScore[]>(cacheKey);
  if (cached) return cached;

  let rawList: any[] = [];
  try {
    const json = loadJsonReport<{ city_risk_scores?: any[] }>(REPORT_PATHS.climateRisk);
    if (json.city_risk_scores && Array.isArray(json.city_risk_scores) && json.city_risk_scores.length > 0) {
      rawList = json.city_risk_scores;
    }
  } catch {
    // fallback to parquet
  }

  if (!rawList || rawList.length === 0) {
    rawList = await readParquet<any>(DATA_PATHS.riskScores);
  }

  const normalized: RiskScore[] = rawList.map((r) => {
    const vScore = r.vulnerability_score ?? r.risk_score ?? 0;
    const meanUhi = r.mean_uhi ?? r.uhi_intensity ?? 0;
    return {
      city: r.city,
      risk_score: Number(Number(vScore).toFixed(1)),
      vulnerability_score: Number(Number(vScore).toFixed(1)),
      risk_tier: r.risk_tier || 'Moderate Risk',
      uhi_intensity: Number(Number(meanUhi).toFixed(4)),
      mean_uhi: Number(Number(meanUhi).toFixed(4)),
      max_uhi: r.max_uhi !== undefined ? Number(Number(r.max_uhi).toFixed(4)) : undefined,
      mean_air_temp: r.mean_air_temp !== undefined ? Number(Number(r.mean_air_temp).toFixed(2)) : undefined,
      mean_pop_density: r.mean_pop_density !== undefined ? Number(Number(r.mean_pop_density).toFixed(1)) : undefined,
      mean_ndvi: r.mean_ndvi !== undefined ? Number(Number(r.mean_ndvi).toFixed(4)) : undefined,
      mean_ndbi: r.mean_ndbi !== undefined ? Number(Number(r.mean_ndbi).toFixed(4)) : undefined,
      canopy_deficit: r.canopy_deficit !== undefined ? Number(Number(r.canopy_deficit).toFixed(4)) : (r.mean_ndvi !== undefined ? Number(Math.max(0, 1 - r.mean_ndvi).toFixed(4)) : undefined),
      uhi_percentile: r.uhi_percentile !== undefined ? Number(Number(r.uhi_percentile).toFixed(4)) : undefined,
      pop_percentile: r.pop_percentile !== undefined ? Number(Number(r.pop_percentile).toFixed(4)) : undefined,
      canopy_percentile: r.canopy_percentile !== undefined ? Number(Number(r.canopy_percentile).toFixed(4)) : undefined,
      climate_group: r.climate_group,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
    };
  });

  cacheService.set(cacheKey, normalized, CacheService.TTL_LONG);
  return normalized;
}

/** Helper to construct a comprehensive City Heat Risk Assessment with peer comparisons */
export function buildCityRiskAssessment(targetCity: string, allScores: RiskScore[]): CityRiskAssessment | null {
  const normTarget = targetCity.trim().toLowerCase();
  const found = allScores.find((c) => c.city.toLowerCase() === normTarget);
  if (!found) return null;

  const peers: PeerCityRisk[] = allScores
    .filter((c) => c.climate_group === found.climate_group)
    .sort((a, b) => b.vulnerability_score - a.vulnerability_score)
    .map((p) => ({
      city: p.city,
      climate_group: p.climate_group,
      vulnerability_score: p.vulnerability_score,
      risk_score: p.risk_score,
      risk_tier: p.risk_tier,
      mean_uhi: p.mean_uhi,
      mean_pop_density: p.mean_pop_density ?? 0,
      canopy_deficit: p.canopy_deficit ?? 0,
      uhi_percentile: p.uhi_percentile ?? 0,
      pop_percentile: p.pop_percentile ?? 0,
      canopy_percentile: p.canopy_percentile ?? 0,
      is_active: p.city.toLowerCase() === normTarget,
    }));

  return {
    city: found.city,
    climate_group: found.climate_group,
    vulnerability_score: found.vulnerability_score,
    risk_score: found.risk_score,
    risk_tier: found.risk_tier,
    raw_indicators: {
      mean_uhi: found.mean_uhi,
      mean_pop_density: found.mean_pop_density ?? 0,
      canopy_deficit: found.canopy_deficit ?? 0,
      mean_ndvi: found.mean_ndvi ?? (1 - (found.canopy_deficit ?? 0)),
      mean_air_temp: found.mean_air_temp ?? 0,
      max_uhi: found.max_uhi ?? found.mean_uhi,
    },
    percentiles: {
      uhi_percentile: found.uhi_percentile ?? 0,
      pop_percentile: found.pop_percentile ?? 0,
      canopy_percentile: found.canopy_percentile ?? 0,
    },
    weights: {
      uhi: 0.50,
      pop: 0.30,
      canopy: 0.20,
    },
    peer_cities: peers,
  };
}

/** GET /api/models/risk — All 42 city-level UHI risk scores (or single city assessment if ?city= is provided) */
router.get('/risk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allScores = await getNormalizedRiskScores();
    const cityParam = req.query['city'];

    if (cityParam && typeof cityParam === 'string' && cityParam.trim()) {
      const assessment = buildCityRiskAssessment(cityParam, allScores);
      if (!assessment) {
        res.status(404).json({ success: false, error: `Risk assessment not found for city: ${cityParam}`, timestamp: new Date().toISOString() });
        return;
      }
      res.json({ success: true, data: assessment, cached: false, timestamp: new Date().toISOString() });
      return;
    }

    res.json({ success: true, data: allScores, cached: false, count: allScores.length, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

/** GET /api/models/risk/city/:cityName — Single city heat risk assessment with climate-group peers */
router.get('/risk/city/:cityName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cityName = decodeURIComponent(String(req.params['cityName']));
    const allScores = await getNormalizedRiskScores();
    const assessment = buildCityRiskAssessment(cityName, allScores);

    if (!assessment) {
      res.status(404).json({ success: false, error: `Risk assessment not found for city: ${cityName}`, timestamp: new Date().toISOString() });
      return;
    }

    res.json({ success: true, data: assessment, cached: false, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

export const INDIAN_CITIES = new Set([
  'ahmedabad', 'bengaluru', 'bhopal', 'bhubaneswar', 'chennai', 'delhi',
  'gandhinagar', 'guwahati', 'hyderabad', 'indore', 'jaipur', 'jodhpur',
  'kanpur', 'kochi', 'kolkata', 'lucknow', 'mangaluru', 'mumbai',
  'mysuru', 'nagpur', 'patna', 'pune', 'siliguri', 'udaipur'
]);

interface ShapFeatureMeta {
  label: string;
  domain: 'Meteorology' | 'Morphology' | 'Remote Sensing' | 'Green Canopy' | 'Geospatial' | 'Temporal Memory';
  impact: string;
}

export const FEATURE_METADATA: Record<string, ShapFeatureMeta> = {
  Urban_Valid_LST_Pixel_Count: { label: 'Urban Valid LST Pixel Count', domain: 'Remote Sensing', impact: 'Direct satellite thermal detection fidelity' },
  Rural_Valid_LST_Pixel_Count: { label: 'Rural Valid LST Pixel Count', domain: 'Remote Sensing', impact: 'Rural background thermal baseline stability' },
  Mean_Landsat_Observations_Per_Pixel: { label: 'Mean Landsat Observations', domain: 'Remote Sensing', impact: 'Clear-sky composite observation density' },
  relative_humidity: { label: 'Relative Humidity (%)', domain: 'Meteorology', impact: 'Atmospheric boundary vapor thermal damping' },
  relative_humidity_lag1: { label: 'Relative Humidity (Lag 1M)', domain: 'Temporal Memory', impact: 'Antecedent boundary-layer moisture persistence' },
  relative_humidity_lag3: { label: 'Relative Humidity (Lag 3M)', domain: 'Temporal Memory', impact: 'Seasonal antecedent moisture memory' },
  relative_humidity_lag12: { label: 'Relative Humidity (Lag 12M)', domain: 'Temporal Memory', impact: 'Annual inter-seasonal moisture baseline' },
  air_temperature: { label: '2m Ambient Air Temp (°C)', domain: 'Meteorology', impact: 'Background synoptic macroclimate temperature' },
  air_temperature_lag1: { label: 'Air Temperature (Lag 1M)', domain: 'Temporal Memory', impact: 'Prior month ambient temperature persistence' },
  air_temperature_lag3: { label: 'Air Temperature (Lag 3M)', domain: 'Temporal Memory', impact: 'Quarterly seasonal thermal lag' },
  air_temperature_lag12: { label: 'Air Temperature (Lag 12M)', domain: 'Temporal Memory', impact: 'Annual inter-year macroclimate baseline' },
  wind_speed: { label: 'Wind Speed (m/s)', domain: 'Meteorology', impact: 'Advective dispersion of urban canopy heat' },
  wind_speed_lag1: { label: 'Wind Speed (Lag 1M)', domain: 'Temporal Memory', impact: 'Antecedent aerodynamic mixing' },
  wind_speed_lag3: { label: 'Wind Speed (Lag 3M)', domain: 'Temporal Memory', impact: 'Seasonal wind regime persistence' },
  wind_speed_lag12: { label: 'Wind Speed (Lag 12M)', domain: 'Temporal Memory', impact: 'Annual synoptic wind baseline' },
  solar_radiation: { label: 'Surface Solar Radiation', domain: 'Meteorology', impact: 'Direct shortwave insolation driver' },
  solar_radiation_lag1: { label: 'Solar Radiation (Lag 1M)', domain: 'Temporal Memory', impact: 'Antecedent surface radiative heating' },
  solar_radiation_lag3: { label: 'Solar Radiation (Lag 3M)', domain: 'Temporal Memory', impact: 'Seasonal insolation trajectory' },
  solar_radiation_lag12: { label: 'Solar Radiation (Lag 12M)', domain: 'Temporal Memory', impact: 'Annual solar cycle baseline' },
  total_precipitation: { label: 'Total Precipitation (mm)', domain: 'Meteorology', impact: 'Soil evaporative cooling and suppression' },
  total_precipitation_lag1: { label: 'Precipitation (Lag 1M)', domain: 'Temporal Memory', impact: 'Soil moisture thermal buffer persistence' },
  total_precipitation_lag3: { label: 'Precipitation (Lag 3M)', domain: 'Temporal Memory', impact: 'Quarterly cumulative moisture reservoir' },
  total_precipitation_lag12: { label: 'Precipitation (Lag 12M)', domain: 'Temporal Memory', impact: 'Annual hydroclimatic cycle' },
  chirps_rainfall: { label: 'CHIRPS Rainfall (mm)', domain: 'Meteorology', impact: 'Satellite gridded precipitation estimate' },
  ERA5_Rainfall_Approx_mm: { label: 'ERA5 Rainfall (mm)', domain: 'Meteorology', impact: 'Reanalysis precipitation proxy' },
  ERA5_Snow_Cover_Fraction: { label: 'ERA5 Snow Cover Fraction', domain: 'Meteorology', impact: 'High-albedo thermal suppression' },
  ERA5_Snow_Depth_m: { label: 'ERA5 Snow Depth (m)', domain: 'Meteorology', impact: 'Snow insulation and albedo cooling' },
  ERA5_Snowfall_mm: { label: 'ERA5 Snowfall (mm)', domain: 'Meteorology', impact: 'Winter cryospheric forcing' },
  ndbi: { label: 'Built-Up Index (NDBI)', domain: 'Morphology', impact: 'Direct sensible heat storage from impervious masonry' },
  ndvi: { label: 'Vegetation Index (NDVI)', domain: 'Green Canopy', impact: 'Canopy evapotranspirative cooling buffer' },
  ndvi_lag1: { label: 'NDVI Vegetation (Lag 1M)', domain: 'Temporal Memory', impact: 'Antecedent canopy phenological state' },
  ndvi_lag3: { label: 'NDVI Vegetation (Lag 3M)', domain: 'Temporal Memory', impact: 'Seasonal canopy growth trajectory' },
  ndvi_lag12: { label: 'NDVI Vegetation (Lag 12M)', domain: 'Temporal Memory', impact: 'Inter-annual greening/browning baseline' },
  ndwi: { label: 'Moisture Index (NDWI)', domain: 'Green Canopy', impact: 'Surface water retention and latent heat absorption' },
  built_veg_ratio: { label: 'Built-to-Vegetation Ratio', domain: 'Morphology', impact: 'Asymmetric thermal ratio of concrete vs greenery' },
  veg_moisture_interaction: { label: 'Veg-Moisture Interaction', domain: 'Green Canopy', impact: 'Coupled vegetative transpiration and moisture' },
  population_density: { label: 'Population Density', domain: 'Morphology', impact: 'Anthropogenic heat emissions and compact fabric' },
  log_pop_density: { label: 'Log Population Density', domain: 'Morphology', impact: 'Scaled urban compact density proxy' },
  Population_Epoch: { label: 'Population Epoch', domain: 'Morphology', impact: 'Decadal urbanization growth trajectory' },
  latitude: { label: 'Geographic Latitude', domain: 'Geospatial', impact: 'Solar zenith angle and latitudinal energy balance' },
  longitude: { label: 'Geographic Longitude', domain: 'Geospatial', impact: 'Continental position vs maritime moderating influence' },
  month_sin: { label: 'Calendar Month Sine', domain: 'Temporal Memory', impact: 'Cyclical annual solar seasonality' },
  month_cos: { label: 'Calendar Month Cosine', domain: 'Temporal Memory', impact: 'Phase-aligned annual climatic cycle' },
};

export function computeShapAttribution(records: Record<string, any>[], contextTitle: string) {
  const baseExpected = 0.2019;
  if (!records || records.length === 0) {
    return {
      city: contextTitle,
      scope: contextTitle,
      records_analyzed: 0,
      base_expected: baseExpected,
      net_predicted_uhi: baseExpected,
      mean_actual_uhi: 0,
      top_drivers: [],
      waterfall: { baseExpected, steps: [], finalPrediction: baseExpected },
      driver_cards: {
        top_global: { title: 'Top Driver', name: 'N/A', val: '0.0000', badge: 'RANK #1 (0.000)' },
        top_meteorology: { title: 'Top Meteorological Driver', name: 'N/A', val: '0.0000', badge: 'N/A' },
        top_morphology: { title: 'Top Morphology Driver', name: 'N/A', val: '0.0000', badge: 'N/A' },
        cooling_canopy: { title: 'Cooling Canopy Driver', name: 'N/A', val: '0.0000', badge: 'N/A' },
      },
      biophysical_insight: `No observations available for ${contextTitle}.`,
    };
  }

  // Find all shap columns
  const shapKeys = Object.keys(records[0]).filter((k) => k.startsWith('shap_'));
  const featureSummaries = shapKeys.map((k) => {
    const feat = k.replace(/^shap_/, '');
    const meta = FEATURE_METADATA[feat] || { label: feat, domain: 'Meteorology', impact: 'Biophysical driver' };
    const values = records.map((r) => Number(r[k]) || 0);
    const meanAbs = values.reduce((acc, v) => acc + Math.abs(v), 0) / values.length;
    const meanSigned = values.reduce((acc, v) => acc + v, 0) / values.length;
    return {
      feature: feat,
      label: meta.label,
      mean_abs_shap: parseFloat(meanAbs.toFixed(4)),
      mean_shap: parseFloat(meanSigned.toFixed(4)),
      domain: meta.domain,
      impact: meta.impact,
    };
  });

  // Top 10 by mean |SHAP|
  const sortedByAbs = [...featureSummaries].sort((a, b) => b.mean_abs_shap - a.mean_abs_shap);
  const topDrivers = sortedByAbs.slice(0, 10);

  // Mean predicted and actual UHI
  const predictedUhis = records.map((r) => Number(r.predicted_uhi) || 0);
  const actualUhis = records.map((r) => (r.uhi !== null && r.uhi !== undefined ? Number(r.uhi) : null)).filter((v): v is number => v !== null);
  const netPredictedUhi = parseFloat((predictedUhis.reduce((a, b) => a + b, 0) / predictedUhis.length).toFixed(2));
  const meanActualUhi = actualUhis.length > 0 ? parseFloat((actualUhis.reduce((a, b) => a + b, 0) / actualUhis.length).toFixed(2)) : 0;

  // Waterfall steps: top 6 by absolute signed contribution + remaining pooled into "Other Predictors"
  const sortedBySignedAbs = [...featureSummaries].sort((a, b) => Math.abs(b.mean_shap) - Math.abs(a.mean_shap));
  const topWaterfallFeats = sortedBySignedAbs.slice(0, 6);
  const topWaterfallNames = new Set(topWaterfallFeats.map((f) => f.feature));
  const otherSigned = featureSummaries
    .filter((f) => !topWaterfallNames.has(f.feature))
    .reduce((acc, f) => acc + f.mean_shap, 0);

  let runningTotal = baseExpected;
  const steps: any[] = [];

  topWaterfallFeats.forEach((f) => {
    const start = parseFloat(runningTotal.toFixed(2));
    runningTotal = parseFloat((runningTotal + f.mean_shap).toFixed(2));
    steps.push({
      feature: f.label,
      rawFeature: f.feature,
      value: f.mean_shap,
      direction: f.mean_shap >= 0 ? 'warming' : 'cooling',
      desc: f.impact,
      domain: f.domain,
      start,
      end: runningTotal,
    });
  });

  if (Math.abs(otherSigned) >= 0.005) {
    const otherVal = parseFloat(otherSigned.toFixed(2));
    const start = parseFloat(runningTotal.toFixed(2));
    runningTotal = parseFloat((runningTotal + otherVal).toFixed(2));
    steps.push({
      feature: 'Other Biophysical Predictors',
      rawFeature: 'other',
      value: otherVal,
      direction: otherVal >= 0 ? 'warming' : 'cooling',
      desc: 'Net cumulative attribution across remaining 37 biophysical features',
      domain: 'Aggregated',
      start,
      end: runningTotal,
    });
  }

  // Driver cards
  const topGlobal = topDrivers[0] || { label: 'N/A', mean_abs_shap: 0, domain: 'N/A' };
  const topMeteo = sortedByAbs.find((f) => f.domain === 'Meteorology') || { label: 'Relative Humidity', mean_abs_shap: 0 };
  const topMorpho = sortedByAbs.find((f) => f.domain === 'Morphology') || { label: 'Built-Up Index (NDBI)', mean_abs_shap: 0 };
  const coolingCanopy = sortedByAbs.find((f) => f.domain === 'Green Canopy') || { label: 'NDVI Vegetation', mean_abs_shap: 0 };

  const climateGroup = records[0]?.climate_group || 'Study Region';
  const insight = `For ${contextTitle} (${climateGroup}), TreeSHAP attribution demonstrates that ${topGlobal.label} is the primary driver (mean |SHAP| = ${topGlobal.mean_abs_shap.toFixed(4)} °C). Net model prediction indicates an average UHI intensity of ${netPredictedUhi >= 0 ? `+${netPredictedUhi}` : netPredictedUhi} °C (baseline: +${baseExpected.toFixed(2)} °C). Meteorological influence is dominated by ${topMeteo.label} (${topMeteo.mean_abs_shap.toFixed(4)} °C), while urban fabric thermal accumulation is led by ${topMorpho.label} (${topMorpho.mean_abs_shap.toFixed(4)} °C).`;

  return {
    city: contextTitle,
    scope: contextTitle,
    records_analyzed: records.length,
    base_expected: baseExpected,
    net_predicted_uhi: netPredictedUhi,
    mean_actual_uhi: meanActualUhi,
    top_drivers: topDrivers,
    waterfall: {
      baseExpected,
      steps,
      finalPrediction: netPredictedUhi,
    },
    driver_cards: {
      top_global: {
        title: 'Top Driver',
        name: topGlobal.label,
        val: `${topGlobal.mean_abs_shap.toFixed(4)} °C`,
        badge: `RANK #1 (${topGlobal.mean_abs_shap.toFixed(3)})`,
      },
      top_meteorology: {
        title: 'Top Meteorological Driver',
        name: topMeteo.label,
        val: `${topMeteo.mean_abs_shap.toFixed(4)} °C`,
        badge: `${topMeteo.mean_abs_shap.toFixed(3)} °C`,
      },
      top_morphology: {
        title: 'Top Morphology Driver',
        name: topMorpho.label,
        val: `${topMorpho.mean_abs_shap.toFixed(4)} °C`,
        badge: `${topMorpho.mean_abs_shap.toFixed(3)} °C`,
      },
      cooling_canopy: {
        title: 'Cooling Canopy Driver',
        name: coolingCanopy.label,
        val: `${coolingCanopy.mean_abs_shap.toFixed(4)} °C`,
        badge: `${coolingCanopy.mean_abs_shap.toFixed(3)} °C`,
      },
    },
    biophysical_insight: insight,
  };
}

/** GET /api/models/shap — SHAP feature importance (global, regional scopes, or dynamic city-specific) */
router.get('/shap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const city = req.query.city as string | undefined;
    const scope = (req.query.scope as string | undefined)?.toLowerCase();

    // Cache key incorporates city or scope
    const identifier = city && city.toLowerCase() !== 'all'
      ? `city:${city.toLowerCase()}`
      : scope === 'india' || scope === 'indian'
      ? 'scope:india'
      : scope === 'international' || scope === 'intl'
      ? 'scope:international'
      : 'scope:all';

    const cacheKey = `models:shap:${identifier}`;
    const cached = cacheService.get<unknown>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached, cached: true, timestamp: new Date().toISOString() });
      return;
    }

    if (city && city.toLowerCase() !== 'all') {
      // Load per-city SHAP from Parquet and compute dynamic city attribution
      const records = await readParquet<Record<string, any>>(DATA_PATHS.shapValues, {
        filters: { city },
      });
      const cityResult = computeShapAttribution(records, city);
      cacheService.set(cacheKey, cityResult, CacheService.TTL_MEDIUM);
      res.json({ success: true, data: cityResult, cached: false, timestamp: new Date().toISOString() });
      return;
    }

    // Read all SHAP records for regional or global scopes
    const allRecords = await readParquet<Record<string, any>>(DATA_PATHS.shapValues);

    if (scope === 'india' || scope === 'indian') {
      // Filter strictly Indian cities (24 metros)
      const indiaRecords = allRecords.filter((r) => INDIAN_CITIES.has(String(r.city).toLowerCase()));
      const indiaResult = computeShapAttribution(indiaRecords, 'Indian Cities Cohort (24 Metros)');
      cacheService.set(cacheKey, indiaResult, CacheService.TTL_LONG);
      res.json({ success: true, data: indiaResult, cached: false, timestamp: new Date().toISOString() });
      return;
    }

    if (scope === 'international' || scope === 'intl') {
      // Filter strictly International cities (18 metros)
      const intlRecords = allRecords.filter((r) => !INDIAN_CITIES.has(String(r.city).toLowerCase()));
      const intlResult = computeShapAttribution(intlRecords, 'International Cities Cohort (18 Metros)');
      cacheService.set(cacheKey, intlResult, CacheService.TTL_LONG);
      res.json({ success: true, data: intlResult, cached: false, timestamp: new Date().toISOString() });
      return;
    }

    // Combined Global summary across all 42 cities
    const globalResult = computeShapAttribution(allRecords, 'Global 42-City Cohort');
    cacheService.set(cacheKey, globalResult, CacheService.TTL_LONG);
    res.json({ success: true, data: globalResult, cached: false, timestamp: new Date().toISOString() });
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
    const type = String(req.params.type);
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
