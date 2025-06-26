const { handler } = require('../netlify/functions/pokemon-graphql.cjs');

// Mock the @netlify/cache module
jest.mock('@netlify/cache', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('Pokemon GraphQL Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    fetch.mockClear();
  });

  describe('CORS Handling', () => {
    it('should handle OPTIONS request for CORS', async () => {
      const event = {
        httpMethod: 'OPTIONS',
        body: null
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      expect(result.body).toBe('');
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for invalid JSON in request body', async () => {
      const event = {
        httpMethod: 'POST',
        body: '{ invalid json'
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(400);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody).toMatchObject({
        error: 'Invalid JSON in request body'
      });
    });

    it('should return 400 for missing GraphQL query', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ variables: {} })
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toMatchObject({
        error: 'GraphQL query is required'
      });
    });

    it('should handle empty request body', async () => {
      const event = {
        httpMethod: 'POST',
        body: null
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toMatchObject({
        error: 'GraphQL query is required'
      });
    });
  });

  describe('Cache Functionality', () => {
    const validGraphQLQuery = `
      query GetPokemon($id: Int!) {
        pokemon_v2_pokemon_by_pk(id: $id) {
          id
          name
        }
      }
    `;

    it('should return cached response when cache hit occurs', async () => {
      const { getCache } = require('@netlify/cache');
      
      const cachedData = JSON.stringify({
        data: {
          pokemon_v2_pokemon_by_pk: {
            id: 1,
            name: 'bulbasaur'
          }
        }
      });

      getCache.mockResolvedValueOnce(cachedData);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: validGraphQLQuery,
          variables: { id: 1 }
        })
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Cache': 'HIT',
        'Access-Control-Allow-Origin': '*',
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody.data.pokemon_v2_pokemon_by_pk.name).toBe('bulbasaur');
      
      // Should not call fetch when cache hits
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch from API and cache response when cache miss occurs', async () => {
      const { getCache, setCache } = require('@netlify/cache');
      
      // Mock cache miss
      getCache.mockResolvedValueOnce(null);
      
      // Mock successful API response
      const apiResponse = {
        data: {
          pokemon_v2_pokemon_by_pk: {
            id: 1,
            name: 'bulbasaur'
          }
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => apiResponse,
      });

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: validGraphQLQuery,
          variables: { id: 1 }
        })
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Cache': 'MISS',
        'Access-Control-Allow-Origin': '*',
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody).toEqual(apiResponse);

      // Should call fetch and cache the response
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('beta.pokeapi.co/graphql'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: validGraphQLQuery,
            variables: { id: 1 }
          })
        })
      );

      expect(setCache).toHaveBeenCalledWith(
        expect.any(String), // cache key
        JSON.stringify(apiResponse),
        { maxAge: 3600 }
      );
    });

    it('should generate consistent cache keys for same query and variables', async () => {
      const { getCache } = require('@netlify/cache');
      
      getCache.mockResolvedValue(null);
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const query = 'query { test }';
      const variables = { id: 1, name: 'test' };

      const event1 = {
        httpMethod: 'POST',
        body: JSON.stringify({ query, variables })
      };

      const event2 = {
        httpMethod: 'POST',
        body: JSON.stringify({ query, variables })
      };

      await handler(event1, {});
      await handler(event2, {});

      // Both calls should use the same cache key
      expect(getCache).toHaveBeenCalledTimes(2);
      const firstCallKey = getCache.mock.calls[0][0];
      const secondCallKey = getCache.mock.calls[1][0];
      expect(firstCallKey).toBe(secondCallKey);
    });

    it('should generate different cache keys for different queries', async () => {
      const { getCache } = require('@netlify/cache');
      
      getCache.mockResolvedValue(null);
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const event1 = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: 'query { pokemon1 }',
          variables: { id: 1 }
        })
      };

      const event2 = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: 'query { pokemon2 }',
          variables: { id: 1 }
        })
      };

      await handler(event1, {});
      await handler(event2, {});

      // Different queries should use different cache keys
      const firstCallKey = getCache.mock.calls[0][0];
      const secondCallKey = getCache.mock.calls[1][0];
      expect(firstCallKey).not.toBe(secondCallKey);
    });
  });

  describe('GraphQL API Integration', () => {
    const validQuery = `
      query GetPokemon($id: Int!) {
        pokemon_v2_pokemon_by_pk(id: $id) {
          id
          name
          height
          weight
        }
      }
    `;

    beforeEach(() => {
      const { getCache } = require('@netlify/cache');
      // Mock cache miss for all tests in this describe block
      getCache.mockResolvedValue(null);
    });

    it('should successfully fetch data from GraphQL API', async () => {
      const mockResponse = {
        data: {
          pokemon_v2_pokemon_by_pk: {
            id: 25,
            name: 'pikachu',
            height: 4,
            weight: 60
          }
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: validQuery,
          variables: { id: 25 }
        })
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toEqual(mockResponse);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('beta.pokeapi.co/graphql'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: validQuery,
            variables: { id: 25 }
          })
        })
      );
    });

    it('should handle GraphQL API errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: validQuery,
          variables: { id: 1 }
        })
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toMatchObject({
        error: 'Failed to fetch Pokemon data',
        message: expect.stringContaining('GraphQL API returned 500')
      });
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network timeout'));

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: validQuery,
          variables: { id: 1 }
        })
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toMatchObject({
        error: 'Failed to fetch Pokemon data',
        message: 'Network timeout'
      });
    });

    it('should use default endpoint when environment variable is not initially set', async () => {
      // The function uses the environment variable at module load time
      // So it uses the fallback URL
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: validQuery,
          variables: { id: 1 }
        })
      };

      await handler(event, {});

      expect(fetch).toHaveBeenCalledWith(
        'https://beta.pokeapi.co/graphql/v1beta',
        expect.any(Object)
      );
    });

    it('should use fallback endpoint when environment variable is not set', async () => {
      const originalEnv = process.env.VITE_API_GRAPHQL_URL;
      delete process.env.VITE_API_GRAPHQL_URL;

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: validQuery,
          variables: { id: 1 }
        })
      };

      await handler(event, {});

      expect(fetch).toHaveBeenCalledWith(
        'https://beta.pokeapi.co/graphql/v1beta',
        expect.any(Object)
      );

      // Restore original environment
      process.env.VITE_API_GRAPHQL_URL = originalEnv;
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      const { getCache } = require('@netlify/cache');
      getCache.mockResolvedValue(null);
    });

    it('should handle cache errors gracefully', async () => {
      const { getCache } = require('@netlify/cache');
      
      // Mock cache error
      getCache.mockRejectedValueOnce(new Error('Cache service unavailable'));

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { test: 'success' } }),
      });

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: 'query { test }',
          variables: {}
        })
      };

      const result = await handler(event, {});

      // Should still succeed by fetching from API
      expect(result.statusCode).toBe(200);
      expect(fetch).toHaveBeenCalled();
    });

    it('should handle cache set errors gracefully', async () => {
      const { setCache } = require('@netlify/cache');
      
      // Mock cache set error
      setCache.mockRejectedValueOnce(new Error('Cache write failed'));

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { test: 'success' } }),
      });

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: 'query { test }',
          variables: {}
        })
      };

      const result = await handler(event, {});

      // Should still succeed despite cache write failure
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.data.test).toBe('success');
    });

    it('should handle queries without variables', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { types: [] } }),
      });

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: 'query { pokemon_v2_type { name } }'
          // No variables field
        })
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            query: 'query { pokemon_v2_type { name } }',
            variables: undefined
          })
        })
      );
    });
  });

  describe('Complex GraphQL Queries', () => {
    beforeEach(() => {
      const { getCache } = require('@netlify/cache');
      getCache.mockResolvedValue(null);
    });

    it('should handle complex query with multiple variables', async () => {
      const complexQuery = `
        query GetFilteredPokemon($limit: Int!, $offset: Int!, $type: String!) {
          pokemon_v2_pokemon(
            limit: $limit,
            offset: $offset,
            where: {
              pokemon_v2_pokemontypes: {
                pokemon_v2_type: { name: { _eq: $type } }
              }
            }
          ) {
            id
            name
            pokemon_v2_pokemontypes {
              pokemon_v2_type {
                name
              }
            }
          }
        }
      `;

      const mockResponse = {
        data: {
          pokemon_v2_pokemon: [
            {
              id: 1,
              name: 'bulbasaur',
              pokemon_v2_pokemontypes: [
                { pokemon_v2_type: { name: 'grass' } }
              ]
            }
          ]
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: complexQuery,
          variables: {
            limit: 10,
            offset: 0,
            type: 'grass'
          }
        })
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toEqual(mockResponse);
    });

    it('should handle mutation queries', async () => {
      const mutationQuery = `
        mutation CreatePokemon($name: String!) {
          insert_pokemon_v2_pokemon_one(object: { name: $name }) {
            id
            name
          }
        }
      `;

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            insert_pokemon_v2_pokemon_one: {
              id: 9999,
              name: 'test-pokemon'
            }
          }
        }),
      });

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: mutationQuery,
          variables: { name: 'test-pokemon' }
        })
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            query: mutationQuery,
            variables: { name: 'test-pokemon' }
          })
        })
      );
    });
  });
}); 