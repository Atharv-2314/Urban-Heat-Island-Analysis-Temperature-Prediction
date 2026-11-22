// UHI Project - Shared TypeScript Types
// server/src/types/index.ts

export interface CityRecord {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  climate_group: string;
  koppen_zone: string;
  population?: number;
  region: string;
}

export interface MonthlyDataRecord {
  city: string;
  year: number;
  month: number;
  uhi_intensity: number | null;
  lst_urban: number | null;
  lst_rural: number | null;
  ndvi: number | null;
  ndbi: number | null;
  ndwi: number | null;
  temperature_2m: number | null;
  relative_humidity: number;
  wind_speed: number;
  total_precipitation: number;
  cloud_cover?: number | null;
  climate_group: string;
  latitude: number;
  longitude: number;
  // Aliases for backwards and cross compatibility
  uhi?: number | null;
  lst?: number | null;
  rural_lst?: number | null;
  air_temperature?: number | null;
}

export interface ModelMetrics {
  validation_2024: { rmse: number; mae: number; r2: number };
  test_2025: { rmse: number; mae: number; r2: number };
}

export interface ModelMetricsResponse {
  [modelName: string]: ModelMetrics | string;
  best_model: string;
}

export interface RiskScore {
  city: string;
  risk_score: number;
  vulnerability_score: number;
  risk_tier: string;
  uhi_intensity: number;
  mean_uhi: number;
  max_uhi?: number;
  mean_air_temp?: number;
  mean_pop_density?: number;
  mean_ndvi?: number;
  mean_ndbi?: number;
  canopy_deficit?: number;
  uhi_percentile?: number;
  pop_percentile?: number;
  canopy_percentile?: number;
  climate_group: string;
  latitude: number;
  longitude: number;
}

export interface PeerCityRisk {
  city: string;
  climate_group: string;
  vulnerability_score: number;
  risk_score: number;
  risk_tier: string;
  mean_uhi: number;
  mean_pop_density: number;
  canopy_deficit: number;
  uhi_percentile: number;
  pop_percentile: number;
  canopy_percentile: number;
  is_active: boolean;
}

export interface CityRiskAssessment {
  city: string;
  climate_group: string;
  vulnerability_score: number;
  risk_score: number;
  risk_tier: string;
  raw_indicators: {
    mean_uhi: number;
    mean_pop_density: number;
    canopy_deficit: number;
    mean_ndvi: number;
    mean_air_temp: number;
    max_uhi: number;
  };
  percentiles: {
    uhi_percentile: number;
    pop_percentile: number;
    canopy_percentile: number;
  };
  weights: {
    uhi: number;
    pop: number;
    canopy: number;
  };
  peer_cities: PeerCityRisk[];
}

export interface ShapValue {
  city: string;
  year: number;
  month: number;
  feature: string;
  shap_value: number;
  feature_value: number;
}

export interface SimulationResult {
  city: string;
  climate_group: string;
  delta_uhi: number;
  current_uhi: number;
  simulated_uhi: number;
  ndvi_change: number;
  ndbi_change: number;
  ndwi_change: number;
}

export interface SimulationRequest {
  delta_ndvi?: number;
  delta_ndbi?: number;
  delta_ndwi?: number;
  city?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  timestamp: string;
  count?: number;
}

export interface ForecastBenchmark {
  city: string;
  climate_group: string;
  persistence_rmse: number;
  climatology_rmse: number;
  model_rmse: number;
  skill_score: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  city?: string;
  year?: number;
  climate_group?: string;
}

export interface HealthStatus {
  status: string;
  uptime: number;
  python_api: string;
  cache_stats: { keys: number; hits: number; misses: number };
  timestamp: string;
}
