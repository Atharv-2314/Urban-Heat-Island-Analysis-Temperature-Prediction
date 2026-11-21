// Shared TypeScript types for the UHI Dashboard frontend
// client/src/types/index.ts

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

export interface CitySummary {
  city: string;
  climate_group: string;
  latitude: number;
  longitude: number;
  mean_uhi: number;
  max_uhi: number;
  min_uhi: number;
  data_points: number;
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
  risk_tier: string;
  uhi_intensity: number;
  climate_group: string;
  latitude: number;
  longitude: number;
}

export interface SimulationResultItem {
  city: string;
  climate_group: string;
  current_uhi: number;
  simulated_uhi: number;
  delta_uhi: number;
  ndvi_change: number;
  ndbi_change: number;
  ndwi_change: number;
}

export interface SimulationResponse {
  results: SimulationResultItem[];
  summary: {
    mean_delta_uhi: number;
    max_cooling: number;
    max_warming: number;
    cities_cooled: number;
    cities_warmed: number;
    total_cities: number;
  };
  parameters: {
    delta_ndvi: number;
    delta_ndbi: number;
    delta_ndwi: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  timestamp: string;
  count?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ShapFeature {
  feature: string;
  mean_abs_shap: number;
  rank: number;
}

export interface ShapCityValue {
  city: string;
  year: number;
  month: number;
  feature: string;
  shap_value: number;
  feature_value: number;
}

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

// Climate group color mapping for consistent visualization
export const CLIMATE_COLORS: Record<string, string> = {
  Tropical: '#ef4444',
  Arid: '#f97316',
  Temperate: '#22c55e',
  Continental: '#3b82f6',
  Polar: '#8b5cf6',
};

// Month names for display
export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
