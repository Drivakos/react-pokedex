/**
 * Pokemon service with Redis caching layer
 * Wraps API calls with cache-aside pattern
 */

import { Pokemon, Filters, PokemonDetails } from '../types/pokemon';
import { fetchPokemonById, fetchPokemonData, fetchPokemonDetails, fetchFilterOptions } from './api';
import {
  cacheAside,
  getFromCache,
  setInCache,
  CACHE_KEYS,
  CACHE_TTL,
  generateSearchCacheKey,
  isCacheEnabled
} from '../lib/redis';

/**
 * Fetch a single Pokemon by ID with caching
 */
export async function getCachedPokemonById(id: number): Promise<Pokemon> {
  const cacheKey = `${CACHE_KEYS.POKEMON_BY_ID}${id}`;
  
  return cacheAside(
    cacheKey,
    () => fetchPokemonById(id),
    CACHE_TTL.POKEMON
  );
}

/**
 * Fetch Pokemon data with filters and caching
 */
export async function getCachedPokemonData(
  limit: number,
  offset: number,
  searchTerm: string,
  filters: Filters
): Promise<Pokemon[]> {
  const cacheKey = generateSearchCacheKey(limit, offset, searchTerm, filters);
  
  return cacheAside(
    cacheKey,
    () => fetchPokemonData(limit, offset, searchTerm, filters),
    CACHE_TTL.POKEMON_LIST
  );
}

/**
 * Fetch detailed Pokemon data with caching
 */
export async function getCachedPokemonDetails(id: number): Promise<PokemonDetails> {
  const cacheKey = `${CACHE_KEYS.POKEMON_DETAILS}${id}`;
  
  return cacheAside(
    cacheKey,
    () => fetchPokemonDetails(id),
    CACHE_TTL.POKEMON_DETAILS
  );
}

/**
 * Fetch filter options with caching
 */
export async function getCachedFilterOptions(): Promise<{
  types: string[];
  moves: string[];
  generations: string[];
}> {
  const cacheKey = CACHE_KEYS.FILTER_OPTIONS;
  
  return cacheAside(
    cacheKey,
    () => fetchFilterOptions(),
    CACHE_TTL.FILTER_OPTIONS
  );
}

/**
 * Prefetch and cache popular Pokemon (cache warming)
 * Call this on app initialization or during low-traffic periods
 */
export async function warmPokemonCache(pokemonIds: number[] = []): Promise<void> {
  if (!isCacheEnabled()) {
    console.log('Cache not enabled, skipping warm-up');
    return;
  }

  // Default popular Pokemon IDs if none provided
  const idsToWarm = pokemonIds.length > 0 ? pokemonIds : [
    1, 4, 7, 25, 150, 151, // Gen 1 starters + Pikachu, Mewtwo, Mew
    152, 155, 158, // Gen 2 starters
    252, 255, 258, // Gen 3 starters
    387, 390, 393, // Gen 4 starters
    495, 498, 501, // Gen 5 starters
  ];

  console.log(`🔥 Warming cache for ${idsToWarm.length} popular Pokemon...`);

  const promises = idsToWarm.map(async (id) => {
    try {
      await getCachedPokemonById(id);
      await getCachedPokemonDetails(id);
    } catch (error) {
      console.error(`Failed to warm cache for Pokemon ${id}:`, error);
    }
  });

  await Promise.allSettled(promises);
  
  console.log('✅ Cache warming complete');
}

/**
 * Batch fetch Pokemon with caching
 * Useful for fetching multiple Pokemon efficiently
 */
export async function getBatchPokemon(ids: number[]): Promise<Pokemon[]> {
  if (!isCacheEnabled()) {
    // If cache disabled, fetch directly
    return Promise.all(ids.map(id => fetchPokemonById(id)));
  }

  // Try to get all from cache first
  const cacheKeys = ids.map(id => `${CACHE_KEYS.POKEMON_BY_ID}${id}`);
  const cachePromises = cacheKeys.map(key => getFromCache<Pokemon>(key));
  const cachedResults = await Promise.all(cachePromises);

  // Identify which Pokemon need to be fetched
  const toFetch: number[] = [];
  const results: (Pokemon | null)[] = cachedResults;

  cachedResults.forEach((cached, index) => {
    if (cached === null) {
      toFetch.push(ids[index]);
    }
  });

  // Fetch missing Pokemon
  if (toFetch.length > 0) {
    console.log(`Fetching ${toFetch.length} Pokemon not in cache`);
    
    const fetchPromises = toFetch.map(async (id) => {
      const pokemon = await fetchPokemonById(id);
      // Cache the result
      const cacheKey = `${CACHE_KEYS.POKEMON_BY_ID}${id}`;
      setInCache(cacheKey, pokemon, CACHE_TTL.POKEMON);
      return { id, pokemon };
    });

    const fetched = await Promise.all(fetchPromises);

    // Merge fetched data into results
    fetched.forEach(({ id, pokemon }) => {
      const index = ids.indexOf(id);
      if (index !== -1) {
        results[index] = pokemon;
      }
    });
  }

  // Filter out any nulls (shouldn't happen, but TypeScript safety)
  return results.filter((p): p is Pokemon => p !== null);
}

/**
 * Smart cache strategy selector
 * Returns cached service if cache is enabled, otherwise returns direct API
 */
export const PokemonService = {
  getById: getCachedPokemonById,
  getList: getCachedPokemonData,
  getDetails: getCachedPokemonDetails,
  getFilterOptions: getCachedFilterOptions,
  getBatch: getBatchPokemon,
  warmCache: warmPokemonCache,
};

