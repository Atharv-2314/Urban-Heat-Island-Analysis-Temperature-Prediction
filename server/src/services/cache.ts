// UHI Project - In-memory cache service with TTL and stats
// server/src/services/cache.ts

import NodeCache from 'node-cache';

interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
}

class CacheService {
  private cache: NodeCache;
  private hits: number = 0;
  private misses: number = 0;

  // TTL buckets (seconds)
  static readonly TTL_SHORT = 60;         // 1 min  – live simulation results
  static readonly TTL_MEDIUM = 300;       // 5 min  – paginated city queries
  static readonly TTL_LONG = 3600;        // 1 hr   – static reports (metrics, SHAP summary)
  static readonly TTL_PERMANENT = 86400;  // 24 hr  – city registry / metadata

  constructor() {
    this.cache = new NodeCache({
      stdTTL: CacheService.TTL_MEDIUM,
      checkperiod: 120,
      useClones: false,   // avoid deep-clone overhead on large arrays
    });
  }

  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      this.hits++;
    } else {
      this.misses++;
    }
    return value;
  }

  set<T>(key: string, value: T, ttl: number = CacheService.TTL_MEDIUM): boolean {
    return this.cache.set(key, value, ttl);
  }

  del(key: string): number {
    return this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
    this.hits = 0;
    this.misses = 0;
  }

  stats(): CacheStats {
    return {
      keys: this.cache.keys().length,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /** Build a deterministic cache key from a prefix + params object */
  static buildKey(prefix: string, params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    return `${prefix}:${sorted}`;
  }
}

// Singleton exported for use across routes
export const cacheService = new CacheService();
export default CacheService;
