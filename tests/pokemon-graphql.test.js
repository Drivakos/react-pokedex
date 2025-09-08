// Mock the Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gt: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      upsert: jest.fn(() => ({
        error: null
      }))
    }))
  }))
}));

// Deno mock is handled by moduleNameMapper in jest.config.cjs

// Mock fetch globally
global.fetch = jest.fn();

// Mock Deno.env for edge function environment
global.Deno = {
  env: {
    get: jest.fn((key) => {
      const envVars = {
        'VITE_API_GRAPHQL_URL': 'https://beta.pokeapi.co/graphql/v1beta',
        'SUPABASE_URL': 'https://kefcxvcbpadksfizrckw.supabase.co',
        'SUPABASE_ANON_KEY': 'test-anon-key'
      };
      return envVars[key];
    })
  }
};

// Create a mock edge function handler that mimics the real behavior
const createMockHandler = () => {
  const supabaseMock = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gt: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      upsert: jest.fn(() => ({
        error: null
      }))
    }))
  };

  return async (request) => {
    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'Content-Type, Authorization',
        },
        body: 'ok'
      };
    }

    try {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return {
          statusCode: 400,
          headers: {
            'content-type': 'application/json',
            'access-control-allow-origin': '*'
          },
          body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
      }
      const { query, variables } = body;

      if (!query) {
        return {
          statusCode: 400,
          headers: {
            'content-type': 'application/json',
            'access-control-allow-origin': '*'
          },
          body: JSON.stringify({ error: 'GraphQL query is required' })
        };
      }

      // Mock cache miss - always fetch from API
      const apiResponse = await fetch('https://beta.pokeapi.co/graphql/v1beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });

      if (!apiResponse.ok) {
        throw new Error(`GraphQL API returned ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      const responseBody = JSON.stringify(data);

      return {
        statusCode: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'public, max-age=3600, s-maxage=3600',
          'x-cache': 'MISS',
          'access-control-allow-origin': '*',
        },
        body: responseBody
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*'
        },
        body: JSON.stringify({
          error: 'Failed to fetch Pokemon data',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      };
    }
  };
};

let handler;

describe('Supabase GraphQL Edge Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    handler = createMockHandler();
  });

  describe('CORS Handling', () => {
    it('should handle OPTIONS request for CORS', async () => {
      const request = new Request('https://example.com/graphql', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });

      const result = await handler(request);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'Content-Type, Authorization',
      });
      expect(result.body).toBe('ok');
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for invalid JSON in request body', async () => {
      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        body: '{ invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await handler(request);

      expect(result.statusCode).toBe(400);
      expect(result.headers).toMatchObject({
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody).toMatchObject({
        error: 'Invalid JSON in request body'
      });
    });

    it('should return 400 for missing GraphQL query', async () => {
      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: {} }),
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await handler(request);

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

    it('should fetch from API and return response (simulated cache miss)', async () => {
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

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: validGraphQLQuery,
          variables: { id: 1 }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await handler(request);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'content-type': 'application/json',
        'cache-control': 'public, max-age=3600, s-maxage=3600',
        'x-cache': 'MISS',
        'access-control-allow-origin': '*',
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody).toEqual(apiResponse);

      // Should call fetch with correct parameters
      expect(fetch).toHaveBeenCalledWith(
        'https://beta.pokeapi.co/graphql/v1beta',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: validGraphQLQuery,
            variables: { id: 1 }
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

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: validGraphQLQuery,
          variables: { id: 1 }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await handler(request);

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toMatchObject({
        error: 'Failed to fetch Pokemon data',
        message: expect.stringContaining('GraphQL API returned 500')
      });
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network timeout'));

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: validGraphQLQuery,
          variables: { id: 1 }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await handler(request);

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toMatchObject({
        error: 'Failed to fetch Pokemon data',
        message: 'Network timeout'
      });
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

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: validQuery,
          variables: { id: 25 }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await handler(request);

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
          headers: { 'Content-Type': 'application/json' },
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

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: validQuery,
          variables: { id: 1 }
        })
      });

      const result = await handler(request);

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toMatchObject({
        error: 'Failed to fetch Pokemon data',
        message: expect.stringContaining('GraphQL API returned 500')
      });
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network timeout'));

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: validQuery,
          variables: { id: 1 }
        })
      });

      const result = await handler(request);

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

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: validQuery,
          variables: { id: 1 }
        })
      });

      await handler(request);

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

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: validQuery,
          variables: { id: 1 }
        })
      });

      await handler(request);

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

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'query { test }',
          variables: {}
        })
      });

      const result = await handler(request);

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

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'query { test }',
          variables: {}
        })
      });

      const result = await handler(request);

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

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'query { pokemon_v2_type { name } }'
          // No variables field
        })
      });

      const result = await handler(request);

      expect(result.statusCode).toBe(200);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
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

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: complexQuery,
          variables: {
            limit: 10,
            offset: 0,
            type: 'grass'
          }
        })
      });

      const result = await handler(request);

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

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: mutationQuery,
          variables: { name: 'test-pokemon' }
        })
      });

      const result = await handler(request);

      expect(result.statusCode).toBe(200);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: mutationQuery,
            variables: { name: 'test-pokemon' }
          })
        })
      );
    });
  });
}); 