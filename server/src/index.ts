// UHI Project - Main Express server entry point
// server/src/index.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { errorHandler, notFound, requestId } from './middleware';
import { cacheService } from './services/cache';
import { DATA_PATHS, REPORT_PATHS } from './services/dataLoader';

import citiesRouter from './routes/cities';
import monthlyRouter from './routes/monthly';
import modelsRouter from './routes/models';
import simulatorRouter from './routes/simulator';
import spatialRouter from './routes/spatial';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const IS_PROD = NODE_ENV === 'production';

// Build CORS origin allowlist from env — supports comma-separated URLs
const rawOrigins = process.env.ALLOWED_ORIGINS ?? process.env.FRONTEND_URL ?? 'http://localhost:5173';
const ALLOWED_ORIGINS: string[] = rawOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Always allow localhost in dev; never leak dev origins in prod
if (!IS_PROD) {
  if (!ALLOWED_ORIGINS.includes('http://localhost:5173')) ALLOWED_ORIGINS.push('http://localhost:5173');
  if (!ALLOWED_ORIGINS.includes('http://localhost:3000')) ALLOWED_ORIGINS.push('http://localhost:3000');
}

// ── Security & Utility Middleware ─────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no Origin header) in dev
    if (!origin && !IS_PROD) return callback(null, true);
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not in allowlist`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use(requestId);

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max: 200,             // 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down.' },
});
app.use('/api/', limiter);

// ── Health Check (legacy path) ────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    cache_stats: cacheService.stats(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── /api/health — production health check with dataset probing ────────────────
app.get('/api/health', (_req, res) => {
  const checks: Record<string, { ok: boolean; path?: string; error?: string }> = {};

  // Check all required Parquet and JSON artifact paths
  const artifacts: Record<string, string> = {
    monthly_clean:           DATA_PATHS.monthlyClean,
    risk_scores:             DATA_PATHS.riskScores,
    shap_values:             DATA_PATHS.shapValues,
    simulation_benchmarks:   DATA_PATHS.simulationBenchmarks,
    model_metrics:           REPORT_PATHS.modelMetrics,
    shap_explainability:     REPORT_PATHS.shapExplainability,
    counterfactual:          REPORT_PATHS.counterfactual,
    rolling_metrics:         REPORT_PATHS.rollingMetrics,
    rolling_comparison:      REPORT_PATHS.rollingComparison,
  };

  for (const [key, filePath] of Object.entries(artifacts)) {
    const exists = fs.existsSync(filePath);
    checks[key] = exists
      ? { ok: true, path: filePath }
      : { ok: false, path: filePath, error: 'File not found' };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? 'healthy' : 'degraded';

  res.status(allOk ? 200 : 207).json({
    status,
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: '1.0.0',
    cache_stats: cacheService.stats(),
    dataset_checks: checks,
    timestamp: new Date().toISOString(),
  });
});

/** Admin: flush cache (useful during development) */
app.post('/admin/cache/flush', (_req, res) => {
  cacheService.flush();
  res.json({ success: true, message: 'Cache flushed', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/cities', citiesRouter);
app.use('/api/monthly', monthlyRouter);
app.use('/api/models', modelsRouter);
app.use('/api/simulator', simulatorRouter);
app.use('/api/spatial', spatialRouter);

// ── API Root Info ─────────────────────────────────────────────────────────────
app.get('/api', (_req, res) => {
  res.json({
    name: 'UHI Analysis API',
    version: '1.0.0',
    description: 'Urban Heat Island Analysis — 42 Global Cities (2016-2025)',
    endpoints: {
      cities: 'GET /api/cities — 42-city registry with coordinates & climate groups',
      cities_single: 'GET /api/cities/:cityName — single city metadata',
      monthly: 'GET /api/monthly?city=&year=&climate_group=&page=&limit= — paginated monthly data',
      monthly_city: 'GET /api/monthly/city/:cityName — full time-series for one city',
      monthly_summary: 'GET /api/monthly/summary — per-city aggregated statistics',
      model_metrics: 'GET /api/models/metrics — RMSE/MAE/R² for all models',
      risk_scores: 'GET /api/models/risk — city UHI vulnerability risk scores',
      shap: 'GET /api/models/shap?city= — SHAP feature attributions',
      forecast: 'GET /api/models/forecast — weather forecast benchmarks',
      counterfactual: 'GET /api/models/counterfactual — pre-computed simulation results',
      simulator: 'POST /api/simulator/run — live What-If simulator (requires Python API)',
      simulator_benchmarks: 'GET /api/simulator/benchmarks — pre-computed Phase 3 simulations',
      simulator_health: 'GET /api/simulator/health — Python inference service status',
    },
    timestamp: new Date().toISOString(),
  });
});

// ── Error Handlers ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Static Frontend (production Docker build) ─────────────────────────────────
const STATIC_DIR = path.join(__dirname, '..', 'public');
if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
  });
}

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌡️  UHI API Server running at http://localhost:${PORT}`);
  console.log(`📊  API root:        http://localhost:${PORT}/api`);
  console.log(`🏥  Health check:    http://localhost:${PORT}/api/health`);
  console.log(`🔗  Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`🌍  Environment:     ${NODE_ENV}\n`);
});

export default app;
