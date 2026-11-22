// Realistic initial & fallback data derived directly from the project's 42-city study
// client/src/lib/mockData.ts

import type {
  CityRecord,
  CitySummary,
  ModelMetricsResponse,
  RiskScore,
  MonthlyDataRecord,
  GridPixelRecord,
  CityRiskAssessment,
  PeerCityRisk,
} from '../types';
import riskData from './riskData.json';

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

export function generateCityShapMock(cityNameOrScope: string) {
  const norm = (cityNameOrScope || '').toLowerCase();
  const baseExpected = 0.2019;

  // Regional Scope: India (24 metros)
  if (norm === 'india' || norm === 'indian') {
    const topDrivers = [
      { feature: 'Urban_Valid_LST_Pixel_Count', label: 'Urban Valid LST Pixel Count', mean_abs_shap: 0.4004, domain: 'Remote Sensing', impact: 'Direct satellite thermal detection fidelity' },
      { feature: 'relative_humidity', label: 'Relative Humidity (%)', mean_abs_shap: 0.3910, domain: 'Meteorology', impact: 'Monsoonal atmospheric boundary vapor damping' },
      { feature: 'longitude', label: 'Geographic Longitude', mean_abs_shap: 0.2623, domain: 'Geospatial', impact: 'East-west monsoon trajectory gradient' },
      { feature: 'relative_humidity_lag1', label: 'Relative Humidity (Lag 1M)', mean_abs_shap: 0.2432, domain: 'Temporal Memory', impact: 'Antecedent soil and moisture boundary persistence' },
      { feature: 'Rural_Valid_LST_Pixel_Count', label: 'Rural Valid LST Pixel Count', mean_abs_shap: 0.1687, domain: 'Remote Sensing', impact: 'Rural background thermal baseline stability' },
      { feature: 'latitude', label: 'Geographic Latitude', mean_abs_shap: 0.1352, domain: 'Geospatial', impact: 'Subtropical to tropical solar insolation gradient' },
      { feature: 'population_density', label: 'Population Density', mean_abs_shap: 0.1264, domain: 'Morphology', impact: 'Dense Indian urban core thermal emissions' },
      { feature: 'ndwi', label: 'Water Index (NDWI)', mean_abs_shap: 0.1158, domain: 'Green Canopy', impact: 'Monsoon hydrological surface retention' },
      { feature: 'ndbi', label: 'Built-Up Index (NDBI)', mean_abs_shap: 0.0895, domain: 'Morphology', impact: 'Impervious masonry thermal absorption' },
      { feature: 'ndvi', label: 'Vegetation Index (NDVI)', mean_abs_shap: 0.0682, domain: 'Green Canopy', impact: 'Tree canopy evapotranspiration cooling' },
    ];

    const netPredictedUhi = 0.28;
    const steps = [
      { feature: 'Urban Valid LST Pixel Count', value: +0.22, direction: 'warming' as const, desc: 'Clear-sky satellite sensing detection', domain: 'Remote Sensing', start: 0.20, end: 0.42 },
      { feature: 'Relative Humidity (%)', value: -0.15, direction: 'cooling' as const, desc: 'Boundary-layer moisture suppression', domain: 'Meteorology', start: 0.42, end: 0.27 },
      { feature: 'Geographic Longitude', value: +0.10, direction: 'warming' as const, desc: 'Peninsular continental gradient', domain: 'Geospatial', start: 0.27, end: 0.37 },
      { feature: 'Built-Up Index (NDBI)', value: +0.08, direction: 'warming' as const, desc: 'High masonry thermal absorption', domain: 'Morphology', start: 0.37, end: 0.45 },
      { feature: 'Vegetation Index (NDVI)', value: -0.06, direction: 'cooling' as const, desc: 'Evapotranspirative canopy buffer', domain: 'Green Canopy', start: 0.45, end: 0.39 },
      { feature: 'Other Biophysical Predictors', value: -0.11, direction: 'cooling' as const, desc: 'Remaining 37 features', domain: 'Aggregated', start: 0.39, end: netPredictedUhi },
    ];

    return {
      city: 'Indian Cities Cohort (24 Metros)',
      scope: 'Indian Cities Cohort (24 Metros)',
      records_analyzed: 278,
      base_expected: baseExpected,
      net_predicted_uhi: netPredictedUhi,
      mean_actual_uhi: 0.33,
      top_drivers: topDrivers,
      waterfall: { baseExpected, steps, finalPrediction: netPredictedUhi },
      driver_cards: {
        top_global: { title: 'Top Driver', name: topDrivers[0].label, val: `${topDrivers[0].mean_abs_shap.toFixed(4)} °C`, badge: `RANK #1 (${topDrivers[0].mean_abs_shap.toFixed(3)})` },
        top_meteorology: { title: 'Top Meteorological Driver', name: 'Relative Humidity (%)', val: '0.3910 °C', badge: '0.391 °C' },
        top_morphology: { title: 'Top Morphology Driver', name: 'Population Density', val: '0.1264 °C', badge: '0.126 °C' },
        cooling_canopy: { title: 'Cooling Canopy Driver', name: 'Water Index (NDWI)', val: '0.1158 °C', badge: '0.116 °C' },
      },
      biophysical_insight: 'For the Indian Cities Cohort (24 Metros), TreeSHAP attributions indicate that Relative Humidity (0.3910 °C) and Urban Clear-Sky Pixel Density (0.4004 °C) overwhelmingly dominate thermal expression, reflecting intense pre-monsoon radiative heatwaves followed by sharp monsoon humidity attenuation.',
    };
  }

  // Regional Scope: International (18 metros)
  if (norm === 'international' || norm === 'intl') {
    const topDrivers = [
      { feature: 'Urban_Valid_LST_Pixel_Count', label: 'Urban Valid LST Pixel Count', mean_abs_shap: 0.4531, domain: 'Remote Sensing', impact: 'Direct satellite thermal detection fidelity' },
      { feature: 'relative_humidity', label: 'Relative Humidity (%)', mean_abs_shap: 0.3298, domain: 'Meteorology', impact: 'Atmospheric boundary vapor thermal damping' },
      { feature: 'longitude', label: 'Geographic Longitude', mean_abs_shap: 0.3266, domain: 'Geospatial', impact: 'Intercontinental longitudinal thermal gradients' },
      { feature: 'relative_humidity_lag1', label: 'Relative Humidity (Lag 1M)', mean_abs_shap: 0.1928, domain: 'Temporal Memory', impact: 'Antecedent moisture boundary persistence' },
      { feature: 'latitude', label: 'Geographic Latitude', mean_abs_shap: 0.1658, domain: 'Geospatial', impact: 'Global latitudinal solar zenith variance' },
      { feature: 'Rural_Valid_LST_Pixel_Count', label: 'Rural Valid LST Pixel Count', mean_abs_shap: 0.1255, domain: 'Remote Sensing', impact: 'Rural background thermal baseline stability' },
      { feature: 'ndwi', label: 'Water Index (NDWI)', mean_abs_shap: 0.0983, domain: 'Green Canopy', impact: 'Surface moisture buffer' },
      { feature: 'ndbi', label: 'Built-Up Index (NDBI)', mean_abs_shap: 0.0832, domain: 'Morphology', impact: 'Impervious masonry heat retention' },
      { feature: 'population_density', label: 'Population Density', mean_abs_shap: 0.0725, domain: 'Morphology', impact: 'High-density urban core heat' },
      { feature: 'ndvi', label: 'Vegetation Index (NDVI)', mean_abs_shap: 0.0585, domain: 'Green Canopy', impact: 'Temperate and continental tree canopy' },
    ];

    const netPredictedUhi = 0.63;
    const steps = [
      { feature: 'Urban Valid LST Pixel Count', value: +0.28, direction: 'warming' as const, desc: 'Clear-sky sensing thermal signal', domain: 'Remote Sensing', start: 0.20, end: 0.48 },
      { feature: 'Geographic Longitude', value: +0.15, direction: 'warming' as const, desc: 'Continental position gradient', domain: 'Geospatial', start: 0.48, end: 0.63 },
      { feature: 'Relative Humidity (%)', value: -0.10, direction: 'cooling' as const, desc: 'Maritime air mass thermal damping', domain: 'Meteorology', start: 0.63, end: 0.53 },
      { feature: 'Built-Up Index (NDBI)', value: +0.12, direction: 'warming' as const, desc: 'Concrete & asphalt heat dome', domain: 'Morphology', start: 0.53, end: 0.65 },
      { feature: 'Vegetation Index (NDVI)', value: -0.08, direction: 'cooling' as const, desc: 'Urban canopy cooling buffer', domain: 'Green Canopy', start: 0.65, end: 0.57 },
      { feature: 'Other Biophysical Predictors', value: +0.06, direction: 'warming' as const, desc: 'Remaining 37 features', domain: 'Aggregated', start: 0.57, end: netPredictedUhi },
    ];

    return {
      city: 'International Cities Cohort (18 Metros)',
      scope: 'International Cities Cohort (18 Metros)',
      records_analyzed: 211,
      base_expected: baseExpected,
      net_predicted_uhi: netPredictedUhi,
      mean_actual_uhi: 0.50,
      top_drivers: topDrivers,
      waterfall: { baseExpected, steps, finalPrediction: netPredictedUhi },
      driver_cards: {
        top_global: { title: 'Top Driver', name: topDrivers[0].label, val: `${topDrivers[0].mean_abs_shap.toFixed(4)} °C`, badge: `RANK #1 (${topDrivers[0].mean_abs_shap.toFixed(3)})` },
        top_meteorology: { title: 'Top Meteorological Driver', name: 'Relative Humidity (%)', val: '0.3298 °C', badge: '0.330 °C' },
        top_morphology: { title: 'Top Morphology Driver', name: 'Built-Up Index (NDBI)', val: '0.0832 °C', badge: '0.083 °C' },
        cooling_canopy: { title: 'Cooling Canopy Driver', name: 'Water Index (NDWI)', val: '0.0983 °C', badge: '0.098 °C' },
      },
      biophysical_insight: 'For the International Cities Cohort (18 Metros), Geographic Longitude (0.3266 °C) and Latitude (0.1658 °C) demonstrate significantly higher importance than in the India-only cohort, capturing massive intercontinental gradients between maritime Europe, continental East Asia, and equatorial Americas.',
    };
  }

  // Global Scope (42 metros)
  if (norm === 'global' || norm === 'all') {
    const topDrivers = [
      { feature: 'Urban_Valid_LST_Pixel_Count', label: 'Urban Valid LST Pixel Count', mean_abs_shap: 0.4231, domain: 'Remote Sensing', impact: 'Direct satellite thermal detection fidelity' },
      { feature: 'relative_humidity', label: 'Relative Humidity (%)', mean_abs_shap: 0.3646, domain: 'Meteorology', impact: 'Atmospheric boundary vapor thermal damping' },
      { feature: 'longitude', label: 'Geographic Longitude', mean_abs_shap: 0.2901, domain: 'Geospatial', impact: 'Regional continental vs maritime longitude gradients' },
      { feature: 'relative_humidity_lag1', label: 'Relative Humidity (Lag 1M)', mean_abs_shap: 0.2214, domain: 'Temporal Memory', impact: 'Antecedent soil and moisture boundary conditions' },
      { feature: 'Rural_Valid_LST_Pixel_Count', label: 'Rural Valid LST Pixel Count', mean_abs_shap: 0.1501, domain: 'Remote Sensing', impact: 'Rural background thermal baseline stability' },
      { feature: 'latitude', label: 'Geographic Latitude', mean_abs_shap: 0.1487, domain: 'Geospatial', impact: 'Solar zenith angle and latitudinal insolation' },
      { feature: 'ndwi', label: 'Moisture Index (NDWI)', mean_abs_shap: 0.1083, domain: 'Green Canopy', impact: 'Surface moisture retention and latent heat absorption' },
      { feature: 'population_density', label: 'Population Density', mean_abs_shap: 0.1031, domain: 'Morphology', impact: 'Anthropogenic heat emissions and compact fabric' },
      { feature: 'ndbi', label: 'Built-Up Index (NDBI)', mean_abs_shap: 0.0868, domain: 'Morphology', impact: 'Direct sensible heat storage from impervious masonry' },
      { feature: 'ndvi', label: 'Vegetation Index (NDVI)', mean_abs_shap: 0.0640, domain: 'Green Canopy', impact: 'Canopy evapotranspirative cooling buffer' },
    ];

    const netPredictedUhi = 0.43;
    const steps = [
      { feature: 'Urban Valid LST Pixel Count', value: +0.25, direction: 'warming' as const, desc: 'Clear-sky sensing thermal signal', domain: 'Remote Sensing', start: 0.20, end: 0.45 },
      { feature: 'Relative Humidity (%)', value: -0.12, direction: 'cooling' as const, desc: 'Atmospheric boundary vapor damping', domain: 'Meteorology', start: 0.45, end: 0.33 },
      { feature: 'Geographic Longitude', value: +0.12, direction: 'warming' as const, desc: 'Continental position gradient', domain: 'Geospatial', start: 0.33, end: 0.45 },
      { feature: 'Built-Up Index (NDBI)', value: +0.10, direction: 'warming' as const, desc: 'Impervious masonry thermal retention', domain: 'Morphology', start: 0.45, end: 0.55 },
      { feature: 'Vegetation Index (NDVI)', value: -0.07, direction: 'cooling' as const, desc: 'Evapotranspirative tree cooling', domain: 'Green Canopy', start: 0.55, end: 0.48 },
      { feature: 'Other Biophysical Predictors', value: -0.05, direction: 'cooling' as const, desc: 'Remaining 37 features', domain: 'Aggregated', start: 0.48, end: netPredictedUhi },
    ];

    return {
      city: 'Global 42-City Cohort',
      scope: 'Global 42-City Cohort',
      records_analyzed: 489,
      base_expected: baseExpected,
      net_predicted_uhi: netPredictedUhi,
      mean_actual_uhi: 0.40,
      top_drivers: topDrivers,
      waterfall: { baseExpected, steps, finalPrediction: netPredictedUhi },
      driver_cards: {
        top_global: { title: 'Top Driver', name: topDrivers[0].label, val: `${topDrivers[0].mean_abs_shap.toFixed(4)} °C`, badge: `RANK #1 (${topDrivers[0].mean_abs_shap.toFixed(3)})` },
        top_meteorology: { title: 'Top Meteorological Driver', name: 'Relative Humidity (%)', val: '0.3646 °C', badge: '0.365 °C' },
        top_morphology: { title: 'Top Morphology Driver', name: 'Population Density', val: '0.1031 °C', badge: '0.103 °C' },
        cooling_canopy: { title: 'Cooling Canopy Driver', name: 'Moisture Index (NDWI)', val: '0.1083 °C', badge: '0.108 °C' },
      },
      biophysical_insight: 'Across all 42 Global Metros (489 holdout test records), TreeSHAP attributions reveal that clear-sky thermal sensing pixel fidelity (0.4231 °C) and atmospheric relative humidity (0.3646 °C) form the primary universal axis controlling observed surface urban heat island intensity.',
    };
  }

  // Individual City Mode
  const city = INITIAL_CITIES.find((c) => c.city.toLowerCase() === norm) || INITIAL_CITIES[0];
  const isArid = city.climate_group === 'Arid';
  const isTropical = city.climate_group === 'Tropical';

  // City-specific custom driver rankings
  const topDrivers = isArid
    ? [
        { feature: 'Urban_Valid_LST_Pixel_Count', label: 'Urban Valid LST Pixel Count', mean_abs_shap: 0.4508, domain: 'Remote Sensing', impact: 'Direct satellite thermal detection fidelity' },
        { feature: 'relative_humidity', label: 'Relative Humidity (%)', mean_abs_shap: 0.3374, domain: 'Meteorology', impact: 'Atmospheric boundary vapor thermal damping' },
        { feature: 'latitude', label: 'Geographic Latitude', mean_abs_shap: 0.2579, domain: 'Geospatial', impact: 'Solar zenith angle and energy balance' },
        { feature: 'relative_humidity_lag1', label: 'Relative Humidity (Lag 1M)', mean_abs_shap: 0.2482, domain: 'Temporal Memory', impact: 'Antecedent boundary-layer moisture persistence' },
        { feature: 'Rural_Valid_LST_Pixel_Count', label: 'Rural Valid LST Pixel Count', mean_abs_shap: 0.1895, domain: 'Remote Sensing', impact: 'Rural background thermal baseline stability' },
        { feature: 'population_density', label: 'Population Density', mean_abs_shap: 0.1876, domain: 'Morphology', impact: 'Anthropogenic heat emissions and compact fabric' },
        { feature: 'ndbi', label: 'Built-Up Index (NDBI)', mean_abs_shap: 0.0975, domain: 'Morphology', impact: 'Direct sensible heat storage from impervious masonry' },
        { feature: 'air_temperature', label: '2m Ambient Air Temp (°C)', mean_abs_shap: 0.0809, domain: 'Meteorology', impact: 'Background synoptic macroclimate temperature' },
        { feature: 'longitude', label: 'Geographic Longitude', mean_abs_shap: 0.0800, domain: 'Geospatial', impact: 'Continental position vs maritime moderating influence' },
        { feature: 'wind_speed', label: 'Wind Speed (m/s)', mean_abs_shap: 0.0767, domain: 'Meteorology', impact: 'Advective dispersion of urban canopy heat' },
      ]
    : isTropical
    ? [
        { feature: 'Urban_Valid_LST_Pixel_Count', label: 'Urban Valid LST Pixel Count', mean_abs_shap: 0.5210, domain: 'Remote Sensing', impact: 'Direct satellite thermal detection fidelity' },
        { feature: 'relative_humidity', label: 'Relative Humidity (%)', mean_abs_shap: 0.3840, domain: 'Meteorology', impact: 'High atmospheric moisture damping UHI' },
        { feature: 'total_precipitation', label: 'Total Precipitation (mm)', mean_abs_shap: 0.2190, domain: 'Meteorology', impact: 'Monsoonal evaporative cooling' },
        { feature: 'relative_humidity_lag1', label: 'Relative Humidity (Lag 1M)', mean_abs_shap: 0.1950, domain: 'Temporal Memory', impact: 'Antecedent moisture boundary layer' },
        { feature: 'Rural_Valid_LST_Pixel_Count', label: 'Rural Valid LST Pixel Count', mean_abs_shap: 0.1420, domain: 'Remote Sensing', impact: 'Rural background thermal baseline' },
        { feature: 'longitude', label: 'Geographic Longitude', mean_abs_shap: 0.1280, domain: 'Geospatial', impact: 'Maritime proximity effect' },
        { feature: 'ndvi', label: 'Vegetation Index (NDVI)', mean_abs_shap: 0.1190, domain: 'Green Canopy', impact: 'Dense tropical canopy evapotranspiration' },
        { feature: 'ndbi', label: 'Built-Up Index (NDBI)', mean_abs_shap: 0.0980, domain: 'Morphology', impact: 'Concrete impervious heat dome' },
        { feature: 'population_density', label: 'Population Density', mean_abs_shap: 0.0850, domain: 'Morphology', impact: 'High-density urban core heat' },
        { feature: 'built_veg_ratio', label: 'Built-to-Vegetation Ratio', mean_abs_shap: 0.0760, domain: 'Morphology', impact: 'Built vs greenery imbalance' },
      ]
    : [
        { feature: 'Urban_Valid_LST_Pixel_Count', label: 'Urban Valid LST Pixel Count', mean_abs_shap: 0.4870, domain: 'Remote Sensing', impact: 'Direct satellite thermal detection fidelity' },
        { feature: 'longitude', label: 'Geographic Longitude', mean_abs_shap: 0.3548, domain: 'Geospatial', impact: 'Continental position vs maritime moderating influence' },
        { feature: 'relative_humidity', label: 'Relative Humidity (%)', mean_abs_shap: 0.1807, domain: 'Meteorology', impact: 'Atmospheric boundary vapor thermal damping' },
        { feature: 'relative_humidity_lag1', label: 'Relative Humidity (Lag 1M)', mean_abs_shap: 0.1483, domain: 'Temporal Memory', impact: 'Antecedent boundary-layer moisture persistence' },
        { feature: 'Rural_Valid_LST_Pixel_Count', label: 'Rural Valid LST Pixel Count', mean_abs_shap: 0.1450, domain: 'Remote Sensing', impact: 'Rural background thermal baseline stability' },
        { feature: 'latitude', label: 'Geographic Latitude', mean_abs_shap: 0.1162, domain: 'Geospatial', impact: 'Solar zenith angle and energy balance' },
        { feature: 'solar_radiation', label: 'Surface Solar Radiation', mean_abs_shap: 0.1047, domain: 'Meteorology', impact: 'Seasonal shortwave insolation driver' },
        { feature: 'ndbi', label: 'Built-Up Index (NDBI)', mean_abs_shap: 0.0978, domain: 'Morphology', impact: 'Impervious masonry heat retention' },
        { feature: 'total_precipitation_lag1', label: 'Precipitation (Lag 1M)', mean_abs_shap: 0.0912, domain: 'Temporal Memory', impact: 'Soil moisture buffer persistence' },
        { feature: 'population_density', label: 'Population Density', mean_abs_shap: 0.0568, domain: 'Morphology', impact: 'Urban compact heat emissions' },
      ];

  const netPredictedUhi = isArid ? 0.49 : isTropical ? 0.38 : 0.46;
  const meanActualUhi = isArid ? 0.96 : isTropical ? 0.62 : 0.26;

  // Realistic city waterfall steps
  const steps = [
    {
      feature: topDrivers[0].label,
      value: isArid ? +0.32 : isTropical ? -0.28 : +0.24,
      direction: isArid ? ('warming' as const) : isTropical ? ('cooling' as const) : ('warming' as const),
      desc: topDrivers[0].impact,
      domain: topDrivers[0].domain,
      start: 0.20,
      end: isArid ? 0.52 : isTropical ? -0.08 : 0.44,
    },
    {
      feature: topDrivers[1].label,
      value: isArid ? +0.18 : isTropical ? +0.22 : -0.15,
      direction: isArid ? ('warming' as const) : isTropical ? ('warming' as const) : ('cooling' as const),
      desc: topDrivers[1].impact,
      domain: topDrivers[1].domain,
      start: isArid ? 0.52 : isTropical ? -0.08 : 0.44,
      end: isArid ? 0.70 : isTropical ? 0.14 : 0.29,
    },
    {
      feature: 'Built-Up Index (NDBI)',
      value: isArid ? +0.12 : isTropical ? +0.15 : +0.11,
      direction: 'warming' as const,
      desc: 'Direct thermal absorption from impervious masonry surfaces',
      domain: 'Morphology',
      start: isArid ? 0.70 : isTropical ? 0.14 : 0.29,
      end: isArid ? 0.82 : isTropical ? 0.29 : 0.40,
    },
    {
      feature: 'Vegetation Index (NDVI)',
      value: isArid ? -0.08 : isTropical ? -0.20 : -0.12,
      direction: 'cooling' as const,
      desc: 'Evaporative cooling from urban greenery and canopy cover',
      domain: 'Green Canopy',
      start: isArid ? 0.82 : isTropical ? 0.29 : 0.40,
      end: isArid ? 0.74 : isTropical ? 0.09 : 0.28,
    },
    {
      feature: 'Wind Speed',
      value: -0.10,
      direction: 'cooling' as const,
      desc: 'Advective dispersion of urban boundary heat dome',
      domain: 'Meteorology',
      start: isArid ? 0.74 : isTropical ? 0.09 : 0.28,
      end: isArid ? 0.64 : isTropical ? -0.01 : 0.18,
    },
    {
      feature: 'Other Biophysical Predictors',
      value: isArid ? -0.15 : isTropical ? +0.39 : +0.28,
      direction: isArid ? ('cooling' as const) : ('warming' as const),
      desc: 'Net cumulative attribution across remaining 37 features',
      domain: 'Aggregated',
      start: isArid ? 0.64 : isTropical ? -0.01 : 0.18,
      end: netPredictedUhi,
    },
  ];

  return {
    city: city.city,
    scope: city.city,
    records_analyzed: 12,
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
        name: topDrivers[0].label,
        val: `${topDrivers[0].mean_abs_shap.toFixed(4)} °C`,
        badge: `RANK #1 (${topDrivers[0].mean_abs_shap.toFixed(3)})`,
      },
      top_meteorology: {
        title: 'Top Meteorological Driver',
        name: topDrivers.find((d) => d.domain === 'Meteorology')?.label || 'Relative Humidity',
        val: `${(topDrivers.find((d) => d.domain === 'Meteorology')?.mean_abs_shap || 0.35).toFixed(4)} °C`,
        badge: `${(topDrivers.find((d) => d.domain === 'Meteorology')?.mean_abs_shap || 0.35).toFixed(3)} °C`,
      },
      top_morphology: {
        title: 'Top Morphology Driver',
        name: topDrivers.find((d) => d.domain === 'Morphology')?.label || 'Built-Up Index (NDBI)',
        val: `${(topDrivers.find((d) => d.domain === 'Morphology')?.mean_abs_shap || 0.12).toFixed(4)} °C`,
        badge: `${(topDrivers.find((d) => d.domain === 'Morphology')?.mean_abs_shap || 0.12).toFixed(3)} °C`,
      },
      cooling_canopy: {
        title: 'Cooling Canopy Driver',
        name: 'Vegetation Index (NDVI)',
        val: `${(isTropical ? 0.1190 : isArid ? 0.0540 : 0.0780).toFixed(4)} °C`,
        badge: `${(isTropical ? 0.119 : isArid ? 0.054 : 0.078).toFixed(3)} °C`,
      },
    },
    biophysical_insight: `For ${city.city} (${city.climate_group}), TreeSHAP attribution demonstrates that ${topDrivers[0].label} is the primary driver (mean |SHAP| = ${topDrivers[0].mean_abs_shap.toFixed(4)} °C). Net model prediction indicates an average UHI intensity of +${netPredictedUhi.toFixed(2)} °C (baseline: +${baseExpected.toFixed(2)} °C). Built environment thermal accumulation is strongly modulated by ambient moisture and canopy cover.`,
  };
}

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

export function generateMockCityRiskAssessment(cityName: string): CityRiskAssessment {
  const norm = (cityName || '').toLowerCase();
  const list = riskData as Array<{
    city: string;
    climate_group: string;
    latitude: number;
    longitude: number;
    mean_uhi: number;
    max_uhi: number;
    mean_air_temp: number;
    mean_pop_density: number;
    mean_ndvi: number;
    mean_ndbi: number;
    canopy_deficit: number;
    uhi_percentile: number;
    pop_percentile: number;
    canopy_percentile: number;
    vulnerability_score: number;
    risk_tier: string;
  }>;

  const found = list.find((c) => c.city.toLowerCase() === norm) ?? list[0];
  const peers: PeerCityRisk[] = list
    .filter((c) => c.climate_group === found.climate_group)
    .sort((a, b) => b.vulnerability_score - a.vulnerability_score)
    .map((p) => ({
      city: p.city,
      climate_group: p.climate_group,
      vulnerability_score: p.vulnerability_score,
      risk_score: p.vulnerability_score,
      risk_tier: p.risk_tier,
      mean_uhi: p.mean_uhi,
      mean_pop_density: p.mean_pop_density,
      canopy_deficit: p.canopy_deficit,
      uhi_percentile: p.uhi_percentile,
      pop_percentile: p.pop_percentile,
      canopy_percentile: p.canopy_percentile,
      is_active: p.city.toLowerCase() === norm,
    }));

  return {
    city: found.city,
    climate_group: found.climate_group,
    vulnerability_score: found.vulnerability_score,
    risk_score: found.vulnerability_score,
    risk_tier: found.risk_tier,
    raw_indicators: {
      mean_uhi: found.mean_uhi,
      mean_pop_density: found.mean_pop_density,
      canopy_deficit: found.canopy_deficit,
      mean_ndvi: found.mean_ndvi,
      mean_air_temp: found.mean_air_temp,
      max_uhi: found.max_uhi,
    },
    percentiles: {
      uhi_percentile: found.uhi_percentile,
      pop_percentile: found.pop_percentile,
      canopy_percentile: found.canopy_percentile,
    },
    weights: {
      uhi: 0.50,
      pop: 0.30,
      canopy: 0.20,
    },
    peer_cities: peers,
  };
}
