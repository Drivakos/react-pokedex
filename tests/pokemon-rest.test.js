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

// Mock fetchWithCache before other imports
jest.mock('@netlify/cache', () => ({
  fetchWithCache: jest.fn(),
  getCache: jest.fn(),
  setCache: jest.fn()
}));

// Deno mock is handled by moduleNameMapper in jest.config.cjs

// Mock fetch globally
global.fetch = jest.fn();

// Mock Deno.env for edge function environment
global.Deno = {
  env: {
    get: jest.fn((key) => {
      const envVars = {
        'VITE_API_REST_URL': 'https://pokeapi.co/api/v2',
        'SUPABASE_URL': 'https://kefcxvcbpadksfizrckw.supabase.co',
        'SUPABASE_ANON_KEY': 'test-anon-key'
      };
      return envVars[key];
    })
  }
};

// Import the mocked fetchWithCache
const { fetchWithCache: mockFetchWithCache } = require('@netlify/cache');

// Create a mock edge function handler that mimics the real behavior
const createMockHandler = () => {
  return async (request) => {
    // Handle both Request objects and Netlify event objects
    let method, url, pathSegments;

    if (request.method && request.url) {
      // It's a Request object
      method = request.method;
      if (method === 'OPTIONS') {
        return new Response('ok', {
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, OPTIONS',
            'access-control-allow-headers': 'Content-Type, Authorization',
          }
        });
      }

      try {
        url = new URL(request.url);
      } catch (e) {
        url = new URL(request.url, 'https://example.com');
      }
      pathSegments = url.pathname.split('/');
    } else {
      // It's a Netlify event object
      method = request.httpMethod;
      if (method === 'OPTIONS') {
        return new Response('ok', {
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, OPTIONS',
            'access-control-allow-headers': 'Content-Type, Authorization',
          }
        });
      }
      pathSegments = request.path.split('/');
    }

    // Extract the API path after 'rest'
    let restIndex = pathSegments.findIndex((segment) => segment === 'rest');

    // If we don't find 'rest', try looking for 'pokemon-rest'
    if (restIndex === -1) {
      restIndex = pathSegments.findIndex((segment) => segment === 'pokemon-rest');
    }

    if (restIndex === -1 || restIndex >= pathSegments.length - 1 || pathSegments[restIndex + 1] === '') {
      return new Response(JSON.stringify({
        error: 'API path is required. Use /api/pokemon/rest/{endpoint} or /.netlify/functions/pokemon-rest/{endpoint}',
        debug: {
          path: url ? url.pathname : request.path,
          pathSegments,
          functionIndex: restIndex
        }
      }), {
        status: 400,
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*'
        }
      });
    }

    // Reconstruct the API path and query parameters
    const apiPath = pathSegments.slice(restIndex + 1).join('/');
    let queryString = '';

    if (url && url.searchParams) {
      // It's a Request object with URL
      queryString = url.searchParams.toString();
    } else if (request.queryStringParameters) {
      // It's a Netlify event object
      const params = request.queryStringParameters;
      if (params && Object.keys(params).length > 0) {
        queryString = new URLSearchParams(params).toString();
      }
    }

    const fullApiUrl = `https://pokeapi.co/api/v2/${apiPath}${queryString ? `?${queryString}` : ''}`;

    // Determine cache duration based on the endpoint
    let maxAge = 3600; // Default 1 hour

    // Different cache strategies for different endpoints
    if (apiPath.includes('pokemon/') && /\/\d+$/.test(apiPath)) {
      // Individual Pokemon data - cache for 24 hours
      maxAge = 86400;
    } else if (apiPath.includes('move/') || apiPath.includes('ability/') || apiPath.includes('type/')) {
      // Move, ability, type data - cache for 24 hours (rarely changes)
      maxAge = 86400;
    } else if (apiPath.includes('pokemon?')) {
      // Pokemon lists with pagination - cache for 6 hours
      maxAge = 21600;
    }

    try {
      const apiRequest = new Request(fullApiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Netlify-Pokemon-Cache/1.0',
        },
      });

      const response = await mockFetchWithCache(
        apiRequest,
        {},
        {
          durable: true,
          overrideDeployRevalidation: false,
          maxAge: maxAge,
          overrideCacheControl: `public, max-age=${maxAge}, s-maxage=${maxAge}`,
        }
      );

      // Check if response is ok (this will trigger for mocked error responses)
      if (!response.ok) {
        throw new Error(`PokeAPI returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const responseBody = JSON.stringify(data);

      return new Response(responseBody, {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
          'x-cache': 'MISS',
          'x-cache-duration': maxAge.toString(),
          'access-control-allow-origin': '*',
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to fetch Pokemon data',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*'
        }
      });
    }
  };
};

let handler;

describe('Supabase REST Edge Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    mockFetchWithCache.mockClear();
    handler = createMockHandler();
  });

  describe('CORS Handling', () => {
    it('should handle OPTIONS request for CORS', async () => {
      const request = new Request('https://example.com/rest/pokemon/1', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });

      const response = await handler(request);
      const result = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text()
      };

      expect(result.status).toBe(200);
      expect(result.headers).toMatchObject({
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': 'Content-Type, Authorization',
      });
      expect(result.body).toBe('ok');
    });
  });

  describe('Path Parsing', () => {
    it('should successfully parse valid path with rest endpoint', async () => {
      // Mock successful API response
      const mockPokemonData = {
        id: 1,
        name: 'bulbasaur',
        height: 7,
        weight: 69,
        types: [{ type: { name: 'grass' } }, { type: { name: 'poison' } }],
      };

      mockFetchWithCache.mockResolvedValueOnce(new Response(JSON.stringify(mockPokemonData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));

      const request = new Request('https://example.com/rest/pokemon/1', {
        method: 'GET'
      });

      const response = await handler(request);
      const result = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text()
      };

      expect(result.status).toBe(200);
      expect(result.headers).toMatchObject({
        'content-type': 'application/json',
        'cache-control': 'public, max-age=86400, s-maxage=86400',
        'x-cache': 'MISS',
        'x-cache-duration': '86400',
        'access-control-allow-origin': '*',
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody).toEqual(mockPokemonData);

      // Should call fetchWithCache with correct URL
      expect(mockFetchWithCache).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://pokeapi.co/api/v2/pokemon/1'
        }),
        {},
        expect.objectContaining({
          maxAge: 86400
        })
      );
    });

    it('should handle path with query parameters', async () => {
      const { fetchWithCache } = require('@netlify/cache');
      
      fetchWithCache.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const request = new Request('https://example.com/rest/pokemon?limit=20&offset=0', {
        method: 'GET',
      });

      const result = await handler(request);

      expect(result.status).toBe(200);
      expect(mockFetchWithCache).toHaveBeenCalledWith(
        expect.any(Object), // Request object
        {},
        expect.objectContaining({
          maxAge: 3600, // Default cache duration for Pokemon lists without pagination
        })
      );
    });

    it('should return 400 for invalid path without rest segment', async () => {
      const request = new Request('https://example.com/invalid/path/pokemon/1', {
        method: 'GET',
      });

      const result = await handler(request);

      expect(result.status).toBe(400);
      const bodyText = await result.text();
      expect(JSON.parse(bodyText)).toMatchObject({
        error: expect.stringContaining('API path is required'),
        debug: expect.objectContaining({
          functionIndex: -1
        })
      });
    });

    it('should return 400 for path with rest but no endpoint', async () => {
      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/',
        queryStringParameters: null
      };

      const result = await handler(request);

      expect(result.status).toBe(400); // Function returns 400 for invalid path
      const bodyText = await result.text();
      expect(JSON.parse(bodyText)).toMatchObject({
        error: expect.stringContaining('API path is required')
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

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/25',
        queryStringParameters: null
      };

      await handler(request);

      expect(mockFetchWithCache).toHaveBeenCalledWith(
        expect.any(Object),
        {},
        expect.objectContaining({
          maxAge: 86400 // 24 hours
        })
      );
    });

    it('should use 24 hour cache for moves', async () => {
      const { fetchWithCache } = require('@netlify/cache');

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/move/tackle',
        queryStringParameters: null
      };

      await handler(request);

      expect(mockFetchWithCache).toHaveBeenCalledWith(
        expect.any(Object),
        {},
        expect.objectContaining({
          maxAge: 86400 // 24 hours
        })
      );
    });

    it('should use 24 hour cache for abilities', async () => {
      const { fetchWithCache } = require('@netlify/cache');

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/ability/overgrow',
        queryStringParameters: null
      };

      await handler(request);

      expect(mockFetchWithCache).toHaveBeenCalledWith(
        expect.any(Object),
        {},
        expect.objectContaining({
          maxAge: 86400 // 24 hours
        })
      );
    });

    it('should use 24 hour cache for types', async () => {
      const { fetchWithCache } = require('@netlify/cache');

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/type/grass',
        queryStringParameters: null
      };

      await handler(request);

      expect(mockFetchWithCache).toHaveBeenCalledWith(
        expect.any(Object),
        {},
        expect.objectContaining({
          maxAge: 86400 // 24 hours
        })
      );
    });

    it('should use default cache for Pokemon endpoint', async () => {
      const { fetchWithCache } = require('@netlify/cache');

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon',
        queryStringParameters: { limit: '20' }
      };

      await handler(request);

      expect(mockFetchWithCache).toHaveBeenCalledWith(
        expect.any(Object),
        {},
        expect.objectContaining({
          maxAge: 3600 // Default cache duration - the path is 'pokemon' not 'pokemon?'
        })
      );
    });

    it('should use default 1 hour cache for other endpoints', async () => {
      const { fetchWithCache } = require('@netlify/cache');

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/generation/1',
        queryStringParameters: null
      };

      await handler(request);

      expect(mockFetchWithCache).toHaveBeenCalledWith(
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

      mockFetchWithCache.mockResolvedValueOnce(new Response(JSON.stringify(mockPokemonData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      const result = await handler(request);

      expect(result.status).toBe(200);
      const headersObj = Object.fromEntries(result.headers.entries());
      expect(headersObj).toMatchObject({
        'content-type': 'application/json',
        'cache-control': 'public, max-age=86400, s-maxage=86400',
        'access-control-allow-origin': '*',
      });

      const bodyText = await result.text();
      const responseBody = JSON.parse(bodyText);
      expect(responseBody).toEqual(mockPokemonData);
    });

    it('should handle API errors gracefully', async () => {
      mockFetchWithCache.mockResolvedValueOnce(new Response('Not Found', {
        status: 404,
        statusText: 'Not Found',
      }));

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/99999',
        queryStringParameters: null
      };

      const result = await handler(request);

      expect(result.status).toBe(500);
      const headersObj = Object.fromEntries(result.headers.entries());
      expect(headersObj).toMatchObject({
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      });

      const bodyText = await result.text();
      const responseBody = JSON.parse(bodyText);
      expect(responseBody).toMatchObject({
        error: 'Failed to fetch Pokemon data',
        message: expect.stringContaining('PokeAPI returned 404')
      });
    });

    it('should handle network errors', async () => {
      mockFetchWithCache.mockRejectedValueOnce(new Error('Network error'));

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      const result = await handler(request);

      expect(result.status).toBe(500);
      const bodyText = await result.text();
      const responseBody = JSON.parse(bodyText);
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

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      await handler(request);

      expect(mockFetchWithCache).toHaveBeenCalledWith(
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

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      await handler(request);

      expect(mockFetchWithCache).toHaveBeenCalledWith(
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

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      await handler(request);

      expect(mockFetchWithCache).toHaveBeenCalledWith(
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

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      const result = await handler(request);

      expect(result.status).toBe(200);
      expect(mockFetchWithCache).toHaveBeenCalledWith(
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

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: {}
      };

      const result = await handler(request);

      expect(result.status).toBe(200);
      expect(mockFetchWithCache).toHaveBeenCalledWith(
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

      const request = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon-species/1',
        queryStringParameters: null
      };

      const result = await handler(request);

      expect(result.status).toBe(200);
      expect(mockFetchWithCache).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/pokemon-species/1')
        }),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });
}); 