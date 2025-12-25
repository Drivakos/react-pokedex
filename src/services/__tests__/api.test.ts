import { fetchPokemonDetails } from '../api';

// Mock the JSON import
jest.mock('../../data/pokemon-db.json', () => [
  {
    id: 1,
    name: "bulbasaur",
    height: 7,
    weight: 69,
    types: ["grass", "poison"],
    stats: {
      hp: 45,
      attack: 49,
      defense: 49,
      speed: 45,
      "special-attack": 65,
      "special-defense": 65
    },
    generation: "generation-i",
    moves: ["tackle", "growl"],
    evolution: { can_evolve: true }
  },
  {
    id: 2,
    name: "ivysaur-incomplete",
    height: 10,
    weight: 130,
    types: ["grass", "poison"],
    stats: {
      hp: 60,
      attack: 62,
      defense: 63,
      speed: 60
      // Missing special stats
    },
    generation: "generation-i"
    // Missing moves, evolution
  }
], { virtual: true });

jest.mock('../../data/filter-options.json', () => ({ data: { types: [], moves: [], generations: [] } }), { virtual: true });

// Mock cached-api to avoid side effects
jest.mock('../cached-api', () => ({
  fetchCachedPokemonDetails: jest.fn().mockRejectedValue(new Error('Not cached')),
  fetchCachedPokemonById: jest.fn(),
  fetchCachedPokemonData: jest.fn(),
  fetchCachedFilterOptions: jest.fn()
}));

// Mock redis lib
jest.mock('../../lib/redis', () => ({
  isCacheEnabled: jest.fn().mockReturnValue(false),
  cacheAside: jest.fn(),
  CACHE_KEYS: {},
  CACHE_TTL: {},
  generateSearchCacheKey: jest.fn()
}));

// Mock utils/query-builder
jest.mock('../../utils/query-builder', () => ({
  buildCompleteWhereClause: jest.fn(),
  POKEMON_FIELDS: ''
}));

// Mock utils/pokemon-transform
jest.mock('../../utils/pokemon-transform', () => ({
  transformSinglePokemon: jest.fn(),
  transformRawData: jest.fn()
}));

describe('fetchPokemonDetails', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env.VITE_API_GRAPHQL_URL = 'https://mock-api.com/graphql';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  it('should return data from local DB when ID exists', async () => {
    const result = await fetchPokemonDetails(1);
    
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(result.name).toBe('bulbasaur');
    expect(result.flavor_text).toBe('Data loaded from local database.');
    expect(result.stats.hp).toBe(45);
    expect(result.stats['special_attack']).toBe(65);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle incomplete local data gracefully', async () => {
    const result = await fetchPokemonDetails(2);
    
    expect(result).toBeDefined();
    expect(result.id).toBe(2);
    expect(result.name).toBe('ivysaur-incomplete');
    // Check default values
    expect(result.stats['special_attack']).toBe(0);
    expect(result.stats['special_defense']).toBe(0);
    expect(result.moves).toEqual([]);
    expect(result.has_evolutions).toBe(false);
    
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should fallback to API when ID does not exist in local DB', async () => {
    // Setup fetch mock for API fallback
    const mockApiResponse = {
      data: {
        pokemon_v2_pokemon_by_pk: {
          id: 999,
          name: 'missingno',
          height: 10,
          weight: 100,
          base_experience: 100,
          types: [],
          abilities: [],
          moves: [],
          stats: [
             { base_stat: 10, pokemon_v2_stat: { name: 'hp' } }
          ],
          sprites: [],
          species: {
            flavor_text: [],
            genera: [],
            generation: { name: 'gen-1' },
            evolution_chain: { pokemon_v2_pokemonspecies: [] }
          }
        }
      }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    });

    const result = await fetchPokemonDetails(999);
    
    expect(result.id).toBe(999);
    expect(result.name).toBe('missingno');
    expect(global.fetch).toHaveBeenCalled();
  });
});