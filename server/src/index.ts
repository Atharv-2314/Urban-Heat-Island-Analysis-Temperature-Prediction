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

import citiesRouter from './routes/cities';
import monthlyRouter from './routes/monthly';
import modelsRouter from './routes/models';
import simulatorRouter from './routes/simulator';
import spatialRouter from './routes/spatial';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// ── Security & Utility Middleware ─────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
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

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    cache_stats: cacheService.stats(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
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
  console.log(`🏥  Health check:    http://localhost:${PORT}/health`);
  console.log(`🔗  Frontend origin: ${FRONTEND_URL}\n`);
});

export default app;
