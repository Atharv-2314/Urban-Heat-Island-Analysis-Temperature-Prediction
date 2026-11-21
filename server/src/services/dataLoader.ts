// UHI Project - Data loader service (reads Parquet/JSON reports via Python child process)
// server/src/services/dataLoader.ts

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

/** Paths to key data files */
export const DATA_PATHS = {
  monthlyClean: path.join(PROJECT_ROOT, 'data', 'processed', 'monthly_level', 'uhi_monthly_clean.parquet'),
  riskScores: path.join(PROJECT_ROOT, 'data', 'processed', 'monthly_level', 'uhi_city_risk_scores.parquet'),
  shapValues: path.join(PROJECT_ROOT, 'data', 'processed', 'monthly_level', 'uhi_shap_values_2025.parquet'),
  simulationBenchmarks: path.join(PROJECT_ROOT, 'data', 'processed', 'monthly_level', 'uhi_simulation_benchmarks.parquet'),
  climatologyRef: path.join(PROJECT_ROOT, 'models', 'climatology_reference.parquet'),
  pixelLevelDir: path.join(PROJECT_ROOT, 'data', 'processed', 'pixel_level'),
  splits: {
    train: path.join(PROJECT_ROOT, 'data', 'processed', 'splits', 'train.parquet'),
    val: path.join(PROJECT_ROOT, 'data', 'processed', 'splits', 'val.parquet'),
    test: path.join(PROJECT_ROOT, 'data', 'processed', 'splits', 'test.parquet'),
  },
} as const;

export const REPORT_PATHS = {
  modelMetrics: path.join(PROJECT_ROOT, 'reports', 'model_metrics.json'),
  weatherForecast: path.join(PROJECT_ROOT, 'reports', 'weather_forecast_benchmarks.json'),
  climateRisk: path.join(PROJECT_ROOT, 'reports', 'climate_stratified_risk.json'),
  shapExplainability: path.join(PROJECT_ROOT, 'reports', 'shap_explainability.json'),
  counterfactual: path.join(PROJECT_ROOT, 'reports', 'counterfactual_simulation.json'),
  rollingMetrics: path.join(PROJECT_ROOT, 'data', 'processed', 'rolling_results', 'rolling_evaluation_metrics.json'),
  rollingComparison: path.join(PROJECT_ROOT, 'data', 'processed', 'rolling_results', 'fixed_vs_rolling_comparison.json'),
  rollingRobustness: path.join(PROJECT_ROOT, 'data', 'processed', 'rolling_results', 'rolling_robustness_summary.json'),
  rollingFoldsMeta: path.join(PROJECT_ROOT, 'data', 'processed', 'rolling_results', 'rolling_folds_metadata.json'),
} as const;

export const ROLLING_DATA_DIR = path.join(PROJECT_ROOT, 'data', 'processed', 'rolling_results');

/**
 * Load a JSON report file synchronously (reports are small, pre-generated).
 */
export function loadJsonReport<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

/**
 * Read a Parquet file via a small embedded Python script.
 * Returns the full dataset as a JSON array of records.
 * Supports optional column filtering and row limit for chunked streaming.
 */
export function readParquet<T>(
  parquetPath: string,
  options: {
    columns?: string[];
    limit?: number;
    offset?: number;
    filters?: Record<string, string | number>;
  } = {}
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const script = buildParquetScript(parquetPath, options);
    const python = spawn('python', ['-c', script]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    python.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python parquet reader exited ${code}: ${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as T[]);
      } catch (e) {
        reject(new Error(`Failed to parse parquet output: ${e}`));
      }
    });
  });
}

function buildParquetScript(
  filePath: string,
  options: {
    columns?: string[];
    limit?: number;
    offset?: number;
    filters?: Record<string, string | number>;
  }
): string {
  const escapedPath = filePath.replace(/\\/g, '\\\\');
  const cols = options.columns ? JSON.stringify(options.columns) : 'None';
  const limit = options.limit ?? 'None';
  const offset = options.offset ?? 0;
  const filters = options.filters ? JSON.stringify(options.filters) : '{}';

  return `
import pandas as pd, json, sys

try:
    df = pd.read_parquet(r"${escapedPath}", engine="pyarrow"${options.columns ? `, columns=${cols}` : ''})
    
    # Apply equality filters
    filter_dict = ${filters}
    for col, val in filter_dict.items():
        if col in df.columns:
            df = df[df[col] == val]
    
    # Pagination
    offset = ${offset}
    limit = ${limit}
    if offset:
        df = df.iloc[offset:]
    if limit is not None and limit != 'None':
        df = df.iloc[:int(limit)]
    
    # Round floats to 4 decimals for compact JSON
    float_cols = df.select_dtypes(include='float').columns
    df[float_cols] = df[float_cols].round(4)
    
    print(df.to_json(orient='records', date_format='iso'))
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
`.trim();
}

/**
 * Returns the row count of a Parquet file without loading the full dataset.
 */
export function countParquetRows(parquetPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const escapedPath = parquetPath.replace(/\\/g, '\\\\');
    const script = `
import pandas as pd
df = pd.read_parquet(r"${escapedPath}", engine="pyarrow")
print(len(df))
`.trim();

    const python = spawn('python', ['-c', script]);
    let out = '';
    python.stdout.on('data', (c: Buffer) => { out += c.toString(); });
    python.on('close', (code) => {
      if (code !== 0) reject(new Error('Row count failed'));
      else resolve(parseInt(out.trim(), 10));
    });
  });
}
