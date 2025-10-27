// Simple in-memory cache with TTL for analytics data
// Reduces Shopify API calls by caching results for 5-15 minutes

type CacheEntry<T> = {
  data: T;
  expires: number;
};

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton instance
const cache = new SimpleCache();

// Cache TTL configurations (in milliseconds)
export const CACHE_TTL = {
  ANALYTICS: 10 * 60 * 1000, // 10 minutes for analytics data
  UTM_SUMMARY: 10 * 60 * 1000, // 10 minutes for UTM summary
  UTM_PRODUCTS: 15 * 60 * 1000, // 15 minutes for UTM products (less frequently changing)
  SHORT: 5 * 60 * 1000, // 5 minutes for frequently changing data
  LONG: 30 * 60 * 1000, // 30 minutes for rarely changing data
};

// Helper to generate cache keys
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${prefix}:${sortedParams}`;
}

export default cache;
