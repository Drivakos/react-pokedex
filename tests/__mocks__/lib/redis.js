// Mock Redis client for testing
export const Redis = jest.fn();

export const isCacheEnabled = jest.fn(() => false);

export const getFromCache = jest.fn(async () => null);

export const setInCache = jest.fn(async () => true);

export const deleteFromCache = jest.fn(async () => true);

export const deleteByPattern = jest.fn(async () => 0);

export const clearPokemonCache = jest.fn(async () => 0);

export const clearAllCache = jest.fn(async () => true);

export const getCacheStats = jest.fn(async () => ({
  totalKeys: 0,
  pokemonKeys: 0,
  searchKeys: 0,
  detailKeys: 0,
  listKeys: 0
}));

export const generateSearchCacheKey = jest.fn((searchTerm, filters) => {
  return `pokemon:search:${searchTerm}:${JSON.stringify(filters)}`;
});

export const cacheAside = jest.fn(async (key, fetcher) => {
  // Just call the fetcher directly in tests
  return await fetcher();
});

export const CACHE_KEYS = {
  POKEMON_LIST: 'pokemon:list',
  POKEMON_DETAIL: 'pokemon:detail',
  POKEMON_SEARCH: 'pokemon:search',
  SPECIES: 'species',
  MOVES: 'moves',
  ABILITIES: 'abilities',
  TYPES: 'types'
};

export const CACHE_TTL = {
  POKEMON: 3600,
  SEARCH: 1800,
  STATIC: 86400
};

