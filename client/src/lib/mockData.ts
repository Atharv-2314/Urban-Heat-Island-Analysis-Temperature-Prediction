// Realistic initial & fallback data derived directly from the project's 42-city study
// client/src/lib/mockData.ts

import type {
  CityRecord,
  CitySummary,
  ModelMetricsResponse,
  RiskScore,
  MonthlyDataRecord,
  GridPixelRecord,
} from '../types';

export const INITIAL_CITIES: CityRecord[] = [
  { city: 'Ahmedabad', country: 'India', latitude: 23.0225, longitude: 72.5714, climate_group: 'Arid', koppen_zone: 'BSh', population: 8400000, region: 'South Asia' },
  { city: 'Beijing', country: 'International', latitude: 39.9042, longitude: 116.4074, climate_group: 'Continental', koppen_zone: 'Dwa', population: 21540000, region: 'East Asia' },
  { city: 'Bengaluru', country: 'India', latitude: 12.9716, longitude: 77.5946, climate_group: 'Tropical', koppen_zone: 'Aw', population: 12300000, region: 'South Asia' },
  { city: 'Bhopal', country: 'India', latitude: 23.2599, longitude: 77.4126, climate_group: 'Tropical', koppen_zone: 'Cwa', population: 2400000, region: 'South Asia' },
  { city: 'Bhubaneswar', country: 'India', latitude: 20.2961, longitude: 85.8245, climate_group: 'Tropical', koppen_zone: 'Aw', population: 1200000, region: 'South Asia' },
  { city: 'Budapest', country: 'International', latitude: 47.4979, longitude: 19.0402, climate_group: 'Continental', koppen_zone: 'Dfb', population: 1750000, region: 'Europe' },
  { city: 'Cairo', country: 'International', latitude: 30.0444, longitude: 31.2357, climate_group: 'Arid', koppen_zone: 'BWh', population: 21750000, region: 'Africa' },
  { city: 'Chennai', country: 'India', latitude: 13.0827, longitude: 80.2707, climate_group: 'Tropical', koppen_zone: 'Aw', population: 11500000, region: 'South Asia' },
  { city: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090, climate_group: 'Arid', koppen_zone: 'BSh', population: 32900000, region: 'South Asia' },
  { city: 'Dhaka', country: 'International', latitude: 23.8103, longitude: 90.4125, climate_group: 'Tropical', koppen_zone: 'Aw', population: 22400000, region: 'South Asia' },
  { city: 'Gandhinagar', country: 'India', latitude: 23.2156, longitude: 72.6369, climate_group: 'Arid', koppen_zone: 'BSh', population: 350000, region: 'South Asia' },
  { city: 'Guwahati', country: 'India', latitude: 26.1445, longitude: 91.7362, climate_group: 'Temperate', koppen_zone: 'Cwa', population: 1150000, region: 'South Asia' },
  { city: 'Helsinki', country: 'International', latitude: 60.1699, longitude: 24.9384, climate_group: 'Continental', koppen_zone: 'Dfb', population: 660000, region: 'Europe' },
  { city: 'Hyderabad', country: 'India', latitude: 17.3850, longitude: 78.4867, climate_group: 'Arid', koppen_zone: 'BSh', population: 10500000, region: 'South Asia' },
  { city: 'Indore', country: 'India', latitude: 22.7196, longitude: 75.8577, climate_group: 'Tropical', koppen_zone: 'Aw', population: 3200000, region: 'South Asia' },
  { city: 'Jaipur', country: 'India', latitude: 26.9124, longitude: 75.7873, climate_group: 'Arid', koppen_zone: 'BSh', population: 4100000, region: 'South Asia' },
  { city: 'Jodhpur', country: 'India', latitude: 26.2389, longitude: 73.0243, climate_group: 'Arid', koppen_zone: 'BWh', population: 1500000, region: 'South Asia' },
  { city: 'Kanpur', country: 'India', latitude: 26.4499, longitude: 80.3319, climate_group: 'Temperate', koppen_zone: 'Cwa', population: 3350000, region: 'South Asia' },
  { city: 'Kochi', country: 'India', latitude: 9.9312, longitude: 76.2673, climate_group: 'Tropical', koppen_zone: 'Am', population: 2100000, region: 'South Asia' },
  { city: 'Kolkata', country: 'India', latitude: 22.5726, longitude: 88.3639, climate_group: 'Tropical', koppen_zone: 'Aw', population: 15100000, region: 'South Asia' },
  { city: 'London', country: 'International', latitude: 51.5074, longitude: -0.1278, climate_group: 'Temperate', koppen_zone: 'Cfb', population: 9600000, region: 'Europe' },
  { city: 'Los Angeles', country: 'International', latitude: 34.0522, longitude: -118.2437, climate_group: 'Temperate', koppen_zone: 'Csb', population: 9800000, region: 'North America' },
  { city: 'Lucknow', country: 'India', latitude: 26.8467, longitude: 80.9462, climate_group: 'Temperate', koppen_zone: 'Cwa', population: 3800000, region: 'South Asia' },
  { city: 'Madrid', country: 'International', latitude: 40.4168, longitude: -3.7038, climate_group: 'Temperate', koppen_zone: 'Csa', population: 6700000, region: 'Europe' },
  { city: 'Mangaluru', country: 'India', latitude: 12.9141, longitude: 74.8560, climate_group: 'Tropical', koppen_zone: 'Am', population: 750000, region: 'South Asia' },
  { city: 'Mexico City', country: 'International', latitude: 19.4326, longitude: -99.1332, climate_group: 'Temperate', koppen_zone: 'Cwb', population: 21800000, region: 'North America' },
  { city: 'Montreal', country: 'International', latitude: 45.5017, longitude: -73.5673, climate_group: 'Continental', koppen_zone: 'Dfb', population: 4300000, region: 'North America' },
  { city: 'Mumbai', country: 'India', latitude: 19.0760, longitude: 72.8777, climate_group: 'Tropical', koppen_zone: 'Aw', population: 21300000, region: 'South Asia' },
  { city: 'Mysuru', country: 'India', latitude: 12.2958, longitude: 76.6394, climate_group: 'Tropical', koppen_zone: 'Aw', population: 1280000, region: 'South Asia' },
  { city: 'Nagpur', country: 'India', latitude: 21.1458, longitude: 79.0882, climate_group: 'Tropical', koppen_zone: 'Aw', population: 2900000, region: 'South Asia' },
  { city: 'Nairobi', country: 'International', latitude: -1.2921, longitude: 36.8219, climate_group: 'Tropical', koppen_zone: 'Cfb', population: 5100000, region: 'Africa' },
  { city: 'New York', country: 'International', latitude: 40.7128, longitude: -74.0060, climate_group: 'Temperate', koppen_zone: 'Cfa', population: 18800000, region: 'North America' },
  { city: 'Patna', country: 'India', latitude: 25.5941, longitude: 85.1376, climate_group: 'Temperate', koppen_zone: 'Cwa', population: 2500000, region: 'South Asia' },
  { city: 'Pune', country: 'India', latitude: 18.5204, longitude: 73.8567, climate_group: 'Arid', koppen_zone: 'BSh', population: 6900000, region: 'South Asia' },
  { city: 'Riyadh', country: 'International', latitude: 24.7136, longitude: 46.6753, climate_group: 'Arid', koppen_zone: 'BWh', population: 7500000, region: 'Middle East' },
  { city: 'Sao Paulo', country: 'International', latitude: -23.5505, longitude: -46.6333, climate_group: 'Temperate', koppen_zone: 'Cfa', population: 22400000, region: 'South America' },
  { city: 'Sapporo', country: 'International', latitude: 43.0618, longitude: 141.3545, climate_group: 'Continental', koppen_zone: 'Dfa', population: 1970000, region: 'East Asia' },
  { city: 'Seoul', country: 'International', latitude: 37.5665, longitude: 126.9780, climate_group: 'Continental', koppen_zone: 'Dwa', population: 9980000, region: 'East Asia' },
  { city: 'Siliguri', country: 'India', latitude: 26.7271, longitude: 88.3953, climate_group: 'Temperate', koppen_zone: 'Cwa', population: 700000, region: 'South Asia' },
  { city: 'Sydney', country: 'International', latitude: -33.8688, longitude: 151.2093, climate_group: 'Temperate', koppen_zone: 'Cfa', population: 5300000, region: 'Oceania' },
  { city: 'Tokyo', country: 'International', latitude: 35.6762, longitude: 139.6503, climate_group: 'Temperate', koppen_zone: 'Cfa', population: 37400000, region: 'East Asia' },
  { city: 'Udaipur', country: 'India', latitude: 24.5854, longitude: 73.7125, climate_group: 'Arid', koppen_zone: 'BSh', population: 650000, region: 'South Asia' },
];

export const INITIAL_CITY_SUMMARIES: CitySummary[] = INITIAL_CITIES.map((c, i) => {
  // Deterministic realistic UHI intensities
  const baseUhi = (c.climate_group === 'Tropical' ? 1.8 : c.climate_group === 'Arid' ? 2.4 : 1.4) + ((i % 7) * 0.15);
  return {
    city: c.city,
    climate_group: c.climate_group,
    latitude: c.latitude,
    longitude: c.longitude,
    mean_uhi: parseFloat(baseUhi.toFixed(2)),
    max_uhi: parseFloat((baseUhi + 1.8).toFixed(2)),
    min_uhi: parseFloat((baseUhi - 1.2).toFixed(2)),
    data_points: 120, // 10 years × 12 months
  };
});

export const INITIAL_MODEL_METRICS: ModelMetricsResponse = {
  Ridge_Regression: {
    validation_2024: { rmse: 2.5825, mae: 1.2470, r2: 0.1589 },
    test_2025: { rmse: 1.5768, mae: 1.1139, r2: 0.3693 },
  },
  Random_Forest: {
    validation_2024: { rmse: 2.3874, mae: 0.8973, r2: 0.2813 },
    test_2025: { rmse: 1.3323, mae: 0.7848, r2: 0.5498 },
  },
  Hist_Gradient_Boosting: {
    validation_2024: { rmse: 2.3704, mae: 0.8892, r2: 0.2914 },
    test_2025: { rmse: 1.2794, mae: 0.7743, r2: 0.5848 },
  },
  best_model: 'Hist_Gradient_Boosting',
};

export const INITIAL_RISK_SCORES: RiskScore[] = [
  { city: 'Ahmedabad', risk_score: 100, risk_tier: 'Extreme Risk', uhi_intensity: 2.85, climate_group: 'Arid', latitude: 23.0225, longitude: 72.5714 },
  { city: 'Delhi', risk_score: 100, risk_tier: 'Extreme Risk', uhi_intensity: 3.12, climate_group: 'Arid', latitude: 28.6139, longitude: 77.2090 },
  { city: 'Beijing', risk_score: 96, risk_tier: 'Extreme Risk', uhi_intensity: 2.74, climate_group: 'Continental', latitude: 39.9042, longitude: 116.4074 },
  { city: 'Cairo', risk_score: 94, risk_tier: 'Extreme Risk', uhi_intensity: 2.95, climate_group: 'Arid', latitude: 30.0444, longitude: 31.2357 },
  { city: 'Riyadh', risk_score: 91, risk_tier: 'Extreme Risk', uhi_intensity: 3.20, climate_group: 'Arid', latitude: 24.7136, longitude: 46.6753 },
  { city: 'Mumbai', risk_score: 84, risk_tier: 'High Risk', uhi_intensity: 2.45, climate_group: 'Tropical', latitude: 19.0760, longitude: 72.8777 },
  { city: 'Tokyo', risk_score: 82, risk_tier: 'High Risk', uhi_intensity: 2.38, climate_group: 'Temperate', latitude: 35.6762, longitude: 139.6503 },
  { city: 'Chennai', risk_score: 80, risk_tier: 'High Risk', uhi_intensity: 2.15, climate_group: 'Tropical', latitude: 13.0827, longitude: 80.2707 },
  { city: 'Kolkata', risk_score: 79, risk_tier: 'High Risk', uhi_intensity: 2.22, climate_group: 'Tropical', latitude: 22.5726, longitude: 88.3639 },
  { city: 'Madrid', risk_score: 72, risk_tier: 'High Risk', uhi_intensity: 2.10, climate_group: 'Temperate', latitude: 40.4168, longitude: -3.7038 },
  { city: 'Bengaluru', risk_score: 65, risk_tier: 'Moderate Risk', uhi_intensity: 1.75, climate_group: 'Tropical', latitude: 12.9716, longitude: 77.5946 },
  { city: 'London', risk_score: 61, risk_tier: 'Moderate Risk', uhi_intensity: 1.54, climate_group: 'Temperate', latitude: 51.5074, longitude: -0.1278 },
  { city: 'New York', risk_score: 58, risk_tier: 'Moderate Risk', uhi_intensity: 1.62, climate_group: 'Temperate', latitude: 40.7128, longitude: -74.0060 },
  { city: 'Helsinki', risk_score: 32, risk_tier: 'Low Risk', uhi_intensity: 0.85, climate_group: 'Continental', latitude: 60.1699, longitude: 24.9384 },
  { city: 'Sapporo', risk_score: 28, risk_tier: 'Low Risk', uhi_intensity: 0.72, climate_group: 'Continental', latitude: 43.0618, longitude: 141.3545 },
];

export const TOP_SHAP_DRIVERS = [
  { feature: 'Urban_Valid_LST_Pixel_Count', label: 'Urban Valid LST Pixel Count', mean_abs_shap: 0.4231, domain: 'Remote Sensing', impact: 'High positive impact on UHI detection reliability' },
  { feature: 'relative_humidity', label: 'Relative Humidity (%)', mean_abs_shap: 0.3646, domain: 'Meteorology', impact: 'Strong negative interaction: dry air amplifies thermal storage' },
  { feature: 'longitude', label: 'Geographic Longitude', mean_abs_shap: 0.2901, domain: 'Geospatial', impact: 'Regional continental vs maritime longitude gradients' },
  { feature: 'relative_humidity_lag1', label: 'Relative Humidity (Lag 1 Month)', mean_abs_shap: 0.2214, domain: 'Temporal Memory', impact: 'Antecedent soil and moisture boundary conditions' },
  { feature: 'Rural_Valid_LST_Pixel_Count', label: 'Rural Valid LST Pixel Count', mean_abs_shap: 0.1501, domain: 'Remote Sensing', impact: 'Rural baseline stability check' },
  { feature: 'ndbi_urban', label: 'Built-Up Index (NDBI Urban)', mean_abs_shap: 0.1385, domain: 'Morphology', impact: 'Direct thermal absorption from impervious surfaces' },
  { feature: 'built_veg_ratio', label: 'Built-to-Vegetation Ratio (NDBI - NDVI)', mean_abs_shap: 0.1294, domain: 'Morphology', impact: 'High ratio directly associates with elevated heat dome' },
  { feature: 'wind_speed', label: 'Wind Speed (m/s)', mean_abs_shap: 0.1142, domain: 'Meteorology', impact: 'Advective heat dispersion across urban boundary layer' },
  { feature: 'ndvi_urban', label: 'Vegetation Index (NDVI Urban)', mean_abs_shap: 0.1087, domain: 'Morphology', impact: 'Evapotranspirative cooling canopy effect' },
  { feature: 'temperature_2m', label: '2m Ambient Air Temperature (°C)', mean_abs_shap: 0.0984, domain: 'Meteorology', impact: 'Synoptic background macroclimate temperature' },
];

/** Generate mock 10-year monthly time series for a given city */
export function generateMockTimeSeries(cityName: string): MonthlyDataRecord[] {
  const records: MonthlyDataRecord[] = [];
  const baseCity = INITIAL_CITIES.find((c) => c.city.toLowerCase() === cityName.toLowerCase()) ?? INITIAL_CITIES[0];
  const isTropical = baseCity.climate_group === 'Tropical';
  const isArid = baseCity.climate_group === 'Arid';

  for (let year = 2016; year <= 2025; year++) {
    // slight warming trend over the decade
    const climateWarmingTrend = (year - 2016) * 0.04;
    for (let month = 1; month <= 12; month++) {
      const seasonalPeak = Math.sin(((month - 2) / 12) * 2 * Math.PI); // peak around May-June
      const uhi = parseFloat(
        (
          (isArid ? 2.2 : isTropical ? 1.8 : 1.3) +
          seasonalPeak * 0.9 +
          climateWarmingTrend +
          ((month * 37 + year * 19) % 10) * 0.05
        ).toFixed(2)
      );

      const airTemp = parseFloat(
        (22 + seasonalPeak * 12 + ((year - 2016) * 0.03)).toFixed(1)
      );
      const lstUrban = parseFloat((airTemp + uhi + 3.5).toFixed(1));
      const lstRural = parseFloat((airTemp + 3.5).toFixed(1));
      const ndvi = parseFloat((0.28 + (month >= 7 && month <= 9 ? 0.18 : 0.0)).toFixed(2));
      const ndbi = parseFloat((0.42 - ndvi * 0.35).toFixed(2));
      const ndwi = parseFloat((-0.15 + (month >= 7 && month <= 9 ? 0.15 : 0.0)).toFixed(2));

      records.push({
        city: baseCity.city,
        year,
        month,
        uhi_intensity: uhi,
        lst_urban: lstUrban,
        lst_rural: lstRural,
        ndvi,
        ndbi,
        ndwi,
        temperature_2m: airTemp,
        relative_humidity: month >= 7 && month <= 9 ? 78 : isArid ? 35 : 55,
        wind_speed: 2.8 + Math.cos(month) * 0.6,
        total_precipitation: month >= 7 && month <= 9 ? 180 : 25,
        climate_group: baseCity.climate_group,
        latitude: baseCity.latitude,
        longitude: baseCity.longitude,
      });
    }
  }
  return records;
}

/** Generate realistic intra-urban ~1 km grid spatial pixels with hotspots & parks */
export function generateMockGridPixels(cityName: string): GridPixelRecord[] {
  const city = INITIAL_CITIES.find((c) => c.city.toLowerCase() === cityName.toLowerCase()) ?? INITIAL_CITIES[0];
  const pixels: GridPixelRecord[] = [];
  const gridSize = 16; // 16x16 = 256 points around city center
  const step = 0.015; // ~1.5 km spacing

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const lat = city.latitude + (r - gridSize / 2) * step;
      const lon = city.longitude + (c - gridSize / 2) * step;
      const distFromCenter = Math.sqrt(Math.pow(r - gridSize / 2, 2) + Math.pow(c - gridSize / 2, 2));

      // Synthetic park zones: cooler, high NDVI
      const isParkZone = (r >= 4 && r <= 6 && c >= 5 && c <= 7) || (r >= 11 && r <= 13 && c >= 10 && c <= 12);
      // High density urban commercial core: hotter, high NDBI
      const isCore = distFromCenter < 3.5 && !isParkZone;

      const ndvi = isParkZone ? 0.68 : isCore ? 0.14 : Math.max(0.18, 0.45 - distFromCenter * 0.02);
      const ndbi = isParkZone ? -0.15 : isCore ? 0.58 : Math.max(0.1, 0.42 - ndvi * 0.5);
      const ndwi = isParkZone ? 0.22 : -0.18;

      const baseUhi = city.climate_group === 'Arid' ? 2.8 : 2.1;
      const uhi = isParkZone
        ? parseFloat((baseUhi - 1.85).toFixed(2)) // Park cool island
        : isCore
        ? parseFloat((baseUhi + 1.95).toFixed(2)) // High-density concrete core
        : parseFloat((baseUhi + (4 - distFromCenter) * 0.25).toFixed(2));

      const lst = parseFloat((28.5 + uhi).toFixed(1));
      const popDensity = isParkZone ? 350 : isCore ? 28500 : Math.round(18000 / (1 + distFromCenter * 0.4));

      pixels.push({
        latitude: parseFloat(lat.toFixed(4)),
        longitude: parseFloat(lon.toFixed(4)),
        uhi,
        lst,
        ndvi: parseFloat(ndvi.toFixed(2)),
        ndbi: parseFloat(ndbi.toFixed(2)),
        ndwi: parseFloat(ndwi.toFixed(2)),
        population_density: popDensity,
        city: city.city,
        year: 2025,
        month: 6,
      });
    }
  }
  return pixels;
}
