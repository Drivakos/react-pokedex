import { fetchPokemonDetails } from '../api';

// Mock supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  }
}));

import { supabase } from '../../lib/supabase';

// Mock cached-api and its new modularized versions to avoid side effects
jest.mock('../api/pokemon.cached', () => ({
  fetchCachedPokemonDetails: jest.fn().mockRejectedValue(new Error('Not cached')),
  fetchCachedPokemonById: jest.fn(),
  fetchCachedPokemonData: jest.fn()
}));

jest.mock('../api/filters.cached', () => ({
  fetchCachedFilterOptions: jest.fn()
}));

// Still mock the old one for compatibility if any other parts still use it
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

    it('should return data from API fallback (Supabase not handled in this specific test)', async () => {

      // Setup fetch mock for API fallback

      const mockApiResponse = {

        data: {

          pokemon_v2_pokemon_by_pk: {

            id: 1,

            name: 'bulbasaur',

            height: 7,

            weight: 69,

            base_experience: 64,

            types: [

              { type: { name: 'grass' } },

              { type: { name: 'poison' } }

            ],

            abilities: [],

            moves: [],

            stats: [

               { base_stat: 45, pokemon_v2_stat: { name: 'hp' } },

               { base_stat: 49, pokemon_v2_stat: { name: 'attack' } },

               { base_stat: 49, pokemon_v2_stat: { name: 'defense' } },

               { base_stat: 65, pokemon_v2_stat: { name: 'special-attack' } },

               { base_stat: 65, pokemon_v2_stat: { name: 'special-defense' } },

               { base_stat: 45, pokemon_v2_stat: { name: 'speed' } }

            ],

            sprites: [],

            species: {

              flavor_text: [{ flavor_text: 'Bulbasaur flavor text' }],

              genera: [{ genus: 'Seed Pokémon' }],

              generation: { name: 'generation-i' },

              evolution_chain: { pokemon_v2_pokemonspecies: [] }

            }

          }

        }

      };

  

      (global.fetch as jest.Mock).mockResolvedValue({

        ok: true,

        json: async () => mockApiResponse

      });

  

      const result = await fetchPokemonDetails(1);

      

      expect(result).toBeDefined();

      expect(result.id).toBe(1);

      expect(result.name).toBe('bulbasaur');

      expect(global.fetch).toHaveBeenCalled();

    });

  

    it('should fallback to API when ID does not exist in Supabase', async () => {

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

  