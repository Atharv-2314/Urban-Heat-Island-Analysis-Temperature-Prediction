// UHI Project - Request logging & error handling middleware
// server/src/middleware/index.ts

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/** Attach a unique request ID to each request */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = uuidv4();
  (req as Request & { id: string }).id = id;
  res.setHeader('X-Request-ID', id);
  next();
}

/** Structured JSON error handler */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  });
}

/** 404 handler for unknown routes */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
}

/** Validate pagination query params and set defaults */
export function parsePagination(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(500, Math.max(1, parseInt((req.query.limit as string) || '100', 10)));
  (req as Request & { pagination: { page: number; limit: number; offset: number } }).pagination = {
    page,
    limit,
    offset: (page - 1) * limit,
  };
  next();
}
