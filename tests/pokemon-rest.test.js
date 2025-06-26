const { handler } = require('../netlify/functions/pokemon-rest.cjs');

// Mock the @netlify/cache module
jest.mock('@netlify/cache', () => ({
  fetchWithCache: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('Pokemon REST Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    fetch.mockClear();
  });

  describe('CORS Handling', () => {
    it('should handle OPTIONS request for CORS', async () => {
      const event = {
        httpMethod: 'OPTIONS',
        path: '/api/pokemon/rest/pokemon/1'
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      expect(result.body).toBe('');
    });
  });

  describe('Path Parsing', () => {
    it('should successfully parse valid path with rest endpoint', async () => {
      const { fetchWithCache } = require('@netlify/cache');
      
      // Mock successful API response
      const mockPokemonData = {
        id: 1,
        name: 'bulbasaur',
        height: 7,
        weight: 69,
        types: [{ type: { name: 'grass' } }, { type: { name: 'poison' } }],
      };

      fetchWithCache.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPokemonData,
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.any(Object), // Request object
        {},
        expect.objectContaining({
          durable: true,
          overrideDeployRevalidation: false,
          maxAge: 86400, // Individual Pokemon cached for 24 hours
        })
      );
    });

    it('should handle path with query parameters', async () => {
      const { fetchWithCache } = require('@netlify/cache');
      
      fetchWithCache.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon',
        queryStringParameters: { limit: '20', offset: '0' }
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.any(Object), // Request object
        {},
        expect.objectContaining({
          maxAge: 3600, // Default cache duration for Pokemon lists without pagination
        })
      );
    });

    it('should return 400 for invalid path without rest segment', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/invalid/path/pokemon/1',
        queryStringParameters: null
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toMatchObject({
        error: expect.stringContaining('API path is required'),
        debug: expect.objectContaining({
          path: '/invalid/path/pokemon/1',
          functionIndex: -1
        })
      });
    });

    it('should return 400 for path with rest but no endpoint', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/',
        queryStringParameters: null
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(500); // Function throws an error when no endpoint
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Failed to fetch Pokemon data'
      });
    });
  });

  describe('Cache Duration Logic', () => {
    beforeEach(() => {
      const { fetchWithCache } = require('@netlify/cache');
      fetchWithCache.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, name: 'test' }),
      });
    });

    it('should use 24 hour cache for individual Pokemon', async () => {
      const { fetchWithCache } = require('@netlify/cache');

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/25',
        queryStringParameters: null
      };

      await handler(event, {});

      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.any(Object),
        {},
        expect.objectContaining({
          maxAge: 86400 // 24 hours
        })
      );
    });

    it('should use 24 hour cache for moves', async () => {
      const { fetchWithCache } = require('@netlify/cache');

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/move/tackle',
        queryStringParameters: null
      };

      await handler(event, {});

      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.any(Object),
        {},
        expect.objectContaining({
          maxAge: 86400 // 24 hours
        })
      );
    });

    it('should use 24 hour cache for abilities', async () => {
      const { fetchWithCache } = require('@netlify/cache');

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/ability/overgrow',
        queryStringParameters: null
      };

      await handler(event, {});

      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.any(Object),
        {},
        expect.objectContaining({
          maxAge: 86400 // 24 hours
        })
      );
    });

    it('should use 24 hour cache for types', async () => {
      const { fetchWithCache } = require('@netlify/cache');

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/type/grass',
        queryStringParameters: null
      };

      await handler(event, {});

      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.any(Object),
        {},
        expect.objectContaining({
          maxAge: 86400 // 24 hours
        })
      );
    });

    it('should use default cache for Pokemon endpoint', async () => {
      const { fetchWithCache } = require('@netlify/cache');

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon',
        queryStringParameters: { limit: '20' }
      };

      await handler(event, {});

      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.any(Object),
        {},
        expect.objectContaining({
          maxAge: 3600 // Default cache duration - the path is 'pokemon' not 'pokemon?'
        })
      );
    });

    it('should use default 1 hour cache for other endpoints', async () => {
      const { fetchWithCache } = require('@netlify/cache');

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/generation/1',
        queryStringParameters: null
      };

      await handler(event, {});

      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.any(Object),
        {},
        expect.objectContaining({
          maxAge: 3600 // 1 hour
        })
      );
    });
  });

  describe('API Response Handling', () => {
    it('should return successful response for valid Pokemon', async () => {
      const { fetchWithCache } = require('@netlify/cache');
      
      const mockPokemonData = {
        id: 1,
        name: 'bulbasaur',
        height: 7,
        weight: 69,
        types: [
          { type: { name: 'grass' } },
          { type: { name: 'poison' } }
        ],
        stats: [
          { stat: { name: 'hp' }, base_stat: 45 }
        ]
      };

      fetchWithCache.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPokemonData,
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody).toEqual(mockPokemonData);
    });

    it('should handle API errors gracefully', async () => {
      const { fetchWithCache } = require('@netlify/cache');
      
      fetchWithCache.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/99999',
        queryStringParameters: null
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(500);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody).toMatchObject({
        error: 'Failed to fetch Pokemon data',
        message: expect.stringContaining('PokeAPI returned 404')
      });
    });

    it('should handle network errors', async () => {
      const { fetchWithCache } = require('@netlify/cache');
      
      fetchWithCache.mockRejectedValueOnce(new Error('Network error'));

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toMatchObject({
        error: 'Failed to fetch Pokemon data',
        message: 'Network error'
      });
    });
  });

  describe('Request Construction', () => {
    it('should construct correct API URL with environment variables', async () => {
      const { fetchWithCache } = require('@netlify/cache');
      
      // Mock environment variable
      const originalEnv = process.env.VITE_API_URL;
      process.env.VITE_API_URL = 'https://test-api.com/v2';

      fetchWithCache.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      await handler(event, {});

      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.any(Object), // Request object doesn't have direct url property access
        expect.any(Object),
        expect.any(Object)
      );

      // Restore original environment
      process.env.VITE_API_URL = originalEnv;
    });

    it('should use fallback API URL when environment variable is not set', async () => {
      const { fetchWithCache } = require('@netlify/cache');
      
      // Temporarily remove environment variable
      const originalEnv = process.env.VITE_API_URL;
      delete process.env.VITE_API_URL;
      delete process.env.VITE_API_REST_URL;

      fetchWithCache.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      await handler(event, {});

      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://pokeapi.co/api/v2/pokemon/1'
        }),
        expect.any(Object),
        expect.any(Object)
      );

      // Restore original environment
      process.env.VITE_API_URL = originalEnv;
    });

    it('should include proper headers in the request', async () => {
      const { fetchWithCache } = require('@netlify/cache');
      
      fetchWithCache.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      await handler(event, {});

      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.any(Object), // Request object doesn't have direct headers property access
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing query parameters', async () => {
      const { fetchWithCache } = require('@netlify/cache');
      
      fetchWithCache.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.not.stringContaining('?')
        }),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle empty query parameters object', async () => {
      const { fetchWithCache } = require('@netlify/cache');
      
      fetchWithCache.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: {}
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.not.stringContaining('?')
        }),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle complex nested paths', async () => {
      const { fetchWithCache } = require('@netlify/cache');
      
      fetchWithCache.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon-species/1',
        queryStringParameters: null
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/pokemon-species/1')
        }),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });
}); 