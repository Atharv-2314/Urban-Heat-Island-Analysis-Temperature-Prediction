// API client — axios wrapper for the Node.js backend
// client/src/lib/api.ts

import axios, { type AxiosInstance } from 'axios';
import type {
  ApiResponse,
  CityRecord,
  CitySummary,
  MonthlyDataRecord,
  ModelMetricsResponse,
  RiskScore,
  CityRiskAssessment,
  SimulationResponse,
  GridPixelRecord,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const client: AxiosInstance = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Cities ────────────────────────────────────────────────────────────────────
export async function fetchCities(): Promise<CityRecord[]> {
  const { data } = await client.get<ApiResponse<CityRecord[]>>('/cities');
  return data.data ?? [];
}

export async function fetchCity(name: string): Promise<CityRecord | null> {
  const { data } = await client.get<ApiResponse<CityRecord>>(`/cities/${encodeURIComponent(name)}`);
  return data.data ?? null;
}

// ── Monthly Data ──────────────────────────────────────────────────────────────
export async function fetchMonthlySummary(): Promise<CitySummary[]> {
  const { data } = await client.get<ApiResponse<CitySummary[]>>('/monthly/summary');
  return data.data ?? [];
}

export async function fetchCityTimeSeries(city: string): Promise<MonthlyDataRecord[]> {
  const { data } = await client.get<ApiResponse<MonthlyDataRecord[]>>(
    `/monthly/city/${encodeURIComponent(city)}`,
  );
  return data.data ?? [];
}

export async function fetchMonthlyData(params: {
  city?: string;
  year?: number;
  climate_group?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<MonthlyDataRecord[]>> {
  const { data } = await client.get<ApiResponse<MonthlyDataRecord[]>>('/monthly', { params });
  return data;
}

// ── Models ────────────────────────────────────────────────────────────────────
export async function fetchModelMetrics(): Promise<ModelMetricsResponse> {
  const { data } = await client.get<ApiResponse<ModelMetricsResponse>>('/models/metrics');
  return data.data as ModelMetricsResponse;
}

export async function fetchRiskScores(): Promise<RiskScore[]> {
  const { data } = await client.get<ApiResponse<RiskScore[]>>('/models/risk');
  return data.data ?? [];
}

export async function fetchCityRiskAssessment(cityName: string): Promise<CityRiskAssessment | null> {
  try {
    const { data } = await client.get<ApiResponse<CityRiskAssessment>>(`/models/risk/city/${encodeURIComponent(cityName)}`);
    return data.data ?? null;
  } catch (err) {
    console.warn(`Failed to fetch risk assessment for ${cityName}:`, err);
    return null;
  }
}

export async function fetchShapData(
  params?: { city?: string; scope?: string } | string
): Promise<Record<string, any>> {
  let queryParams: Record<string, string> = {};
  if (typeof params === 'string') {
    queryParams = { city: params };
  } else if (params) {
    if (params.city) queryParams.city = params.city;
    if (params.scope) queryParams.scope = params.scope;
  }
  const { data } = await client.get<ApiResponse<Record<string, any>>>('/models/shap', { params: queryParams });
  return data.data ?? {};
}

export async function fetchForecastBenchmarks(): Promise<Record<string, unknown>> {
  const { data } = await client.get<ApiResponse<Record<string, unknown>>>('/models/forecast');
  return data.data ?? {};
}

export async function fetchCounterfactual(): Promise<Record<string, unknown>> {
  const { data } = await client.get<ApiResponse<Record<string, unknown>>>('/models/counterfactual');
  return data.data ?? {};
}

// ── Rolling Window Evaluation (Phase 7) ───────────────────────────────────────
export async function fetchRollingMetrics(): Promise<Record<string, unknown>> {
  const { data } = await client.get<ApiResponse<Record<string, unknown>>>('/models/rolling/metrics');
  return data.data ?? {};
}

export async function fetchRollingComparison(): Promise<Record<string, unknown>> {
  const { data } = await client.get<ApiResponse<Record<string, unknown>>>('/models/rolling/comparison');
  return data.data ?? {};
}

export async function fetchRollingRobustness(): Promise<Record<string, unknown>> {
  const { data } = await client.get<ApiResponse<Record<string, unknown>>>('/models/rolling/robustness');
  return data.data ?? {};
}

// ── Simulator ─────────────────────────────────────────────────────────────────
export async function runSimulation(params: {
  delta_ndvi: number;
  delta_ndbi: number;
  delta_ndwi: number;
  city?: string;
}): Promise<SimulationResponse> {
  const { data } = await client.post<ApiResponse<SimulationResponse>>('/simulator/run', params);
  return data.data as SimulationResponse;
}

export async function fetchSimulationBenchmarks(): Promise<unknown[]> {
  const { data } = await client.get<ApiResponse<unknown[]>>('/simulator/benchmarks');
  return data.data ?? [];
}

// ── Spatial Grid Data ─────────────────────────────────────────────────────────
export async function fetchSpatialGrid(
  cityName: string,
  params?: { year?: number; month?: number; limit?: number },
): Promise<GridPixelRecord[]> {
  const { data } = await client.get<ApiResponse<GridPixelRecord[]>>(
    `/spatial/grid/${encodeURIComponent(cityName)}`,
    { params },
  );
  return data.data ?? [];
}

export async function fetchSpatialCities(): Promise<string[]> {
  const { data } = await client.get<ApiResponse<string[]>>('/spatial/available-cities');
  return data.data ?? [];
}

export default client;
