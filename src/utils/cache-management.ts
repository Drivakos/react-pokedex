/**
 * Cache management and monitoring utilities
 * Admin tools for cache operations
 */

import {
  getCacheStats,
  clearPokemonCache,
  clearAllCache,
  deleteByPattern,
  isCacheEnabled,
  CACHE_KEYS
} from '../lib/redis';
import { PokemonService } from '../services/pokemon.service';

/**
 * Cache health check
 */
export async function cacheHealthCheck(): Promise<{
  healthy: boolean;
  enabled: boolean;
  stats?: { enabled: boolean; keyCount?: number; memoryUsage?: string };
  error?: string;
}> {
  if (!isCacheEnabled()) {
    return {
      healthy: false,
      enabled: false,
      error: 'Cache not configured'
    };
  }

  try {
    const stats = await getCacheStats();
    return {
      healthy: true,
      enabled: true,
      stats
    };
  } catch (error) {
    return {
      healthy: false,
      enabled: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Warm cache with popular Pokemon
 */
export async function warmPopularPokemon(): Promise<{
  success: boolean;
  cached: number;
  failed: number;
  errors: string[];
}> {
  const popularPokemonIds = [
    // Gen 1
    1, 4, 7, 25, 6, 9, 94, 130, 131, 150, 151,
    // Gen 2
    152, 155, 158, 249, 250,
    // Gen 3
    252, 255, 258, 384,
    // Gen 4
    387, 390, 393, 483, 484, 487,
    // Gen 5
    495, 498, 501, 643, 644,
    // Gen 6
    650, 653, 656, 716, 717,
    // Gen 7
    722, 725, 728, 791, 792,
    // Gen 8
    810, 813, 816, 888, 889,
  ];

  let cached = 0;
  let failed = 0;
  const errors: string[] = [];

  console.log(`Warming cache for ${popularPokemonIds.length} popular Pokemon...`);

  for (const id of popularPokemonIds) {
    try {
      await PokemonService.getById(id);
      cached++;
    } catch (error) {
      failed++;
      errors.push(`Pokemon ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log(`Cache warming complete: ${cached} cached, ${failed} failed`);

  return {
    success: failed === 0,
    cached,
    failed,
    errors
  };
}

/**
 * Warm cache with starter Pokemon from all generations
 */
export async function warmStarterPokemon(): Promise<void> {
  const starters = [
    // Gen 1
    1, 4, 7,
    // Gen 2
    152, 155, 158,
    // Gen 3
    252, 255, 258,
    // Gen 4
    387, 390, 393,
    // Gen 5
    495, 498, 501,
    // Gen 6
    650, 653, 656,
    // Gen 7
    722, 725, 728,
    // Gen 8
    810, 813, 816,
    // Gen 9
    906, 909, 912,
  ];

  await PokemonService.warmCache(starters);
}

/**
 * Warm cache with legendary Pokemon
 */
export async function warmLegendaryPokemon(): Promise<void> {
  const legendaries = [
    144, 145, 146, // Legendary birds
    150, 151, // Mewtwo, Mew
    243, 244, 245, // Legendary beasts
    249, 250, // Lugia, Ho-Oh
    377, 378, 379, 380, 381, 382, 383, 384, // Gen 3 legendaries
    480, 481, 482, 483, 484, 487, // Gen 4 legendaries
    638, 639, 640, 641, 642, 643, 644, // Gen 5 legendaries
    716, 717, 718, // Gen 6 legendaries
    785, 786, 787, 788, 789, 790, 791, 792, // Gen 7 legendaries
    888, 889, 890, 891, 892, 894, 895, 896, 897, 898, // Gen 8 legendaries
  ];

  await PokemonService.warmCache(legendaries);
}

/**
 * Clear specific cache category
 */
export async function clearCacheCategory(category: 'pokemon' | 'lists' | 'search' | 'all'): Promise<number> {
  switch (category) {
    case 'pokemon':
      return deleteByPattern(`${CACHE_KEYS.POKEMON_BY_ID}*`);
    case 'lists':
      return deleteByPattern(`${CACHE_KEYS.POKEMON_LIST}*`);
    case 'search':
      return deleteByPattern(`${CACHE_KEYS.POKEMON_SEARCH}*`);
    case 'all': {
      const total = await clearPokemonCache();
      return total;
    }
    default:
      return 0;
  }
}

/**
 * Cache performance metrics
 */
export interface CacheMetrics {
  enabled: boolean;
  totalKeys?: number;
  estimatedHitRate?: number;
  recommendations: string[];
}

export async function getCacheMetrics(): Promise<CacheMetrics> {
  const metrics: CacheMetrics = {
    enabled: isCacheEnabled(),
    recommendations: []
  };

  if (!metrics.enabled) {
    metrics.recommendations.push('Enable Redis caching for better performance');
    return metrics;
  }

  try {
    const stats = await getCacheStats();
    metrics.totalKeys = stats.keyCount;

    // Add recommendations based on stats
    if (stats.keyCount === 0) {
      metrics.recommendations.push('Cache is empty - consider warming cache with popular Pokemon');
    } else if (stats.keyCount && stats.keyCount < 100) {
      metrics.recommendations.push('Low cache utilization - warm cache for better hit rates');
    }
  } catch (error) {
    metrics.recommendations.push('Unable to fetch cache stats - check Redis connection');
  }

  return metrics;
}

/**
 * Schedule cache warming (call this on app init or deploy)
 */
export async function scheduleInitialCacheWarmup(): Promise<void> {
  if (!isCacheEnabled()) {
    console.log('Cache not enabled, skipping warmup');
    return;
  }

  console.log('Starting initial cache warmup...');

  try {
    // Warm starters first (most common)
    await warmStarterPokemon();

    // Then popular Pokemon
    await warmPopularPokemon();

    console.log('Initial cache warmup complete');
  } catch (error) {
    console.error('Cache warmup failed:', error);
  }
}

/**
 * Export cache management tools
 */
export const CacheManager = {
  healthCheck: cacheHealthCheck,
  warmPopular: warmPopularPokemon,
  warmStarters: warmStarterPokemon,
  warmLegendaries: warmLegendaryPokemon,
  clearCategory: clearCacheCategory,
  clearAll: clearAllCache,
  getMetrics: getCacheMetrics,
  scheduleWarmup: scheduleInitialCacheWarmup,
};

