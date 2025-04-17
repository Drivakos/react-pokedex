/**
 * Enhanced Pokémon fetching with caching, retry logic, and error handling
 */

interface Pokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    other?: {
      'official-artwork'?: {
        front_default: string;
      };
    };
  };
  types: Array<{
    type: {
      name: string;
    };
  }>;
  [key: string]: any;
}

const CACHE_PREFIX = 'pokemon-cache-';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Fetch a Pokémon with caching and retry logic
 * @param pokemonId The ID of the Pokémon to fetch
 * @param retries Number of retries before giving up
 * @returns Pokemon data or null if unable to fetch
 */
export const fetchPokemonWithRetry = async (
  pokemonId: number | string, 
  retries = 2
): Promise<Pokemon | null> => {
  try {
    // Check cache first
    const cachedData = localStorage.getItem(`${CACHE_PREFIX}${pokemonId}`);
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        
        // Check if cache is still valid
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          return data;
        }
      } catch (e) {
        // Invalid cache format, continue to fetch
        localStorage.removeItem(`${CACHE_PREFIX}${pokemonId}`);
      }
    }
    
    // Fetch from API
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
    
    if (response.ok) {
      const data = await response.json();
      
      // Store in cache with timestamp
      localStorage.setItem(
        `${CACHE_PREFIX}${pokemonId}`, 
        JSON.stringify({ data, timestamp: Date.now() })
      );
      
      return data;
    } else if (retries > 0 && response.status >= 500) {
      // Only retry server errors (5xx), not client errors (4xx)
      console.log(`Retrying Pokémon ${pokemonId} fetch after server error (${response.status})...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries)));
      return fetchPokemonWithRetry(pokemonId, retries - 1);
    }
    
    return null;
  } catch (error) {
    if (retries > 0) {
      // Retry network errors with exponential backoff
      console.log(`Retrying Pokémon ${pokemonId} fetch after network error...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries)));
      return fetchPokemonWithRetry(pokemonId, retries - 1);
    }
    
    console.error(`Failed to fetch Pokémon ${pokemonId}:`, error);
    return null;
  }
};

/**
 * Batch fetch multiple Pokémon with concurrency limit
 * @param ids Array of Pokémon IDs to fetch
 * @param concurrency Maximum number of concurrent requests
 * @returns Array of successfully fetched Pokémon
 */
export const batchFetchPokemon = async (
  ids: (number | string)[], 
  concurrency = 3
): Promise<Pokemon[]> => {
  const results: Pokemon[] = [];
  
  // Process in batches to limit concurrency
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = ids.slice(i, i + concurrency);
    const promises = batch.map(id => fetchPokemonWithRetry(id));
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults.filter(Boolean) as Pokemon[]);
  }
  
  return results;
};

/**
 * Clear expired Pokémon cache entries
 */
export const clearExpiredCache = (): void => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      try {
        const { timestamp } = JSON.parse(localStorage.getItem(key) || '{}');
        if (Date.now() - timestamp > CACHE_EXPIRY) {
          localStorage.removeItem(key);
        }
      } catch (e) {
        // Invalid format, remove it
        localStorage.removeItem(key);
      }
    }
  }
};

// Run cache cleanup on module load
setTimeout(clearExpiredCache, 1000);
