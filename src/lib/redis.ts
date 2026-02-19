/**
 * Upstash Redis client for serverless caching
 * Uses HTTP-based REST API - perfect for serverless/edge functions
 */

import { Redis } from '@upstash/redis';

// Polyfill for Node.js globals that Upstash might check
if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

// Initialize Upstash Redis client (only if credentials are provided)
const UPSTASH_REDIS_REST_URL = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;

// Flag to enable/disable caching
const CACHE_ENABLED = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

// Initialize Redis client (lazy loaded)
let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance
 */
function getRedisClient(): Redis | null {
  if (!CACHE_ENABLED) {
    return null;
  }

  if (!redisClient) {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      if (!UPSTASH_REDIS_REST_URL?.startsWith('https://')) {
        return null;
      }

      if (!UPSTASH_REDIS_REST_TOKEN || UPSTASH_REDIS_REST_TOKEN.length < 10) {
        return null;
      }

      redisClient = new Redis({
        url: UPSTASH_REDIS_REST_URL!,
        token: UPSTASH_REDIS_REST_TOKEN!,
        automaticDeserialization: true,
      });
    } catch (error) {
      return null;
    }
  }

  return redisClient;
}

/**
 * Cache key prefixes for different data types
 */
export const CACHE_KEYS = {
  POKEMON_BY_ID: 'pokemon:id:',
  POKEMON_DETAILS: 'pokemon:details:',
  POKEMON_LIST: 'pokemon:list:',
  POKEMON_SEARCH: 'pokemon:search:',
  FILTER_OPTIONS: 'filter:options',
  POKEMON_MOVES: 'pokemon:moves:',
  POKEMON_ABILITIES: 'pokemon:abilities:',
  MOVE_DETAILS: 'move:details:',
  COMPETITIVE_ITEMS: 'competitive:items',
} as const;

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CACHE_TTL = {
  POKEMON: 60 * 60 * 24 * 365, // 1 year - Pokemon data is static
  POKEMON_DETAILS: 60 * 60 * 24 * 365, // 1 year
  POKEMON_LIST: 60 * 60 * 24 * 30, // 30 days - Lists with filters
  SEARCH_RESULTS: 60 * 60 * 24 * 7, // 7 days
  FILTER_OPTIONS: 60 * 60 * 24 * 30, // 30 days
  SHORT: 60 * 15, // 15 minutes - For frequently changing data
} as const;

/**
 * Browser-compatible base64 encoding
 */
function toBase64(str: string): string {
  try {
    // Use browser's btoa with proper Unicode handling
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch (e) {
    // Fallback: use simple hash if btoa fails
    return str.split('').reduce((hash, char) => {
      const chr = char.charCodeAt(0);
      hash = ((hash << 5) - hash) + chr;
      return hash & hash;
    }, 0).toString(36);
  }
}

/**
 * Generate a cache key for Pokemon search queries
 */
export function generateSearchCacheKey(
  limit: number,
  offset: number,
  searchTerm: string,
  filters: any
): string {
  const filterKey = JSON.stringify({
    types: filters.types?.sort() || [],
    moves: filters.moves?.sort() || [],
    generation: filters.generation || '',
    weight: filters.weight || { min: 0, max: 0 },
    height: filters.height || { min: 0, max: 0 },
    hasEvolutions: filters.hasEvolutions,
  });

  return `${CACHE_KEYS.POKEMON_LIST}${limit}:${offset}:${searchTerm}:${toBase64(filterKey)}`;
}

/**
 * Get data from cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  if (!CACHE_ENABLED) {
    return null;
  }

  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const cached = await client.get<T>(key);
    return cached || null;
  } catch (error) {
    return null;
  }
}

/**
 * Set data in cache with TTL
 */
export async function setInCache<T>(
  key: string,
  value: T,
  ttl: number = CACHE_TTL.POKEMON
): Promise<boolean> {
  if (!CACHE_ENABLED) {
    return false;
  }

  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    await client.set(key, value, { ex: ttl });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Delete a specific cache key
 */
export async function deleteFromCache(key: string): Promise<boolean> {
  if (!CACHE_ENABLED) {
    return false;
  }

  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    await client.del(key);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Delete all cache keys matching a pattern
 */
export async function deleteByPattern(pattern: string): Promise<number> {
  if (!CACHE_ENABLED) {
    return 0;
  }

  const client = getRedisClient();
  if (!client) {
    return 0;
  }

  try {
    // Scan for keys matching pattern
    let cursor: string | number = 0;
    let deletedCount = 0;

    do {
      const result: [string | number, string[]] = await client.scan(cursor, { match: pattern, count: 100 });
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        await client.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== 0 && cursor !== '0');

    return deletedCount;
  } catch (error) {
    return 0;
  }
}

/**
 * Clear all Pokemon-related cache
 */
export async function clearPokemonCache(): Promise<number> {
  let total = 0;
  total += await deleteByPattern(`${CACHE_KEYS.POKEMON_BY_ID}*`);
  total += await deleteByPattern(`${CACHE_KEYS.POKEMON_DETAILS}*`);
  total += await deleteByPattern(`${CACHE_KEYS.POKEMON_LIST}*`);
  total += await deleteByPattern(`${CACHE_KEYS.POKEMON_SEARCH}*`);
  return total;
}

/**
 * Clear all cache (use with caution!)
 */
export async function clearAllCache(): Promise<boolean> {
  if (!CACHE_ENABLED) {
    return false;
  }

  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    await client.flushdb();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  enabled: boolean;
  keyCount?: number;
  memoryUsage?: string;
}> {
  if (!CACHE_ENABLED) {
    return { enabled: false };
  }

  const client = getRedisClient();
  if (!client) {
    return { enabled: false };
  }

  try {
    const info = await client.dbsize();

    return {
      enabled: true,
      keyCount: info,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { enabled: true };
  }
}

/**
 * Check if caching is enabled
 */
export function isCacheEnabled(): boolean {
  return CACHE_ENABLED;
}

/**
 * Wrapper for cache-aside pattern
 * Attempts to get from cache, falls back to fetcher function, then caches result
 */
export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.POKEMON
): Promise<T> {
  // Try to get from cache first
  const cached = await getFromCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch fresh data
  const data = await fetcher();

  // Cache the result (don't await - fire and forget)
  setInCache(key, data, ttl).catch(err =>
    console.error('Background cache set failed:', err)
  );

  return data;
}

