const { handler: restHandler } = require('../netlify/functions/pokemon-rest.cjs');
const { handler: graphqlHandler } = require('../netlify/functions/pokemon-graphql.cjs');

// Mock @netlify/cache for integration tests
jest.mock('@netlify/cache', () => ({
  fetchWithCache: jest.fn(),
  getCache: jest.fn(),
  setCache: jest.fn(),
}));

// Mock fetch for integration tests
global.fetch = jest.fn();

describe('Backend Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('REST and GraphQL Function Integration', () => {
    it('should handle simultaneous requests to both functions', async () => {
      const { fetchWithCache, getCache } = require('@netlify/cache');
      
      // Mock REST response
      fetchWithCache.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, name: 'bulbasaur' }),
      });

      // Mock GraphQL cache miss then API response
      getCache.mockResolvedValueOnce(null);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { pokemon_v2_pokemon_by_pk: { id: 1, name: 'bulbasaur' } }
        }),
      });

      const restEvent = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      const graphqlEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: 'query { pokemon_v2_pokemon_by_pk(id: 1) { id name } }',
          variables: {}
        })
      };

      // Execute both simultaneously
      const [restResult, graphqlResult] = await Promise.all([
        restHandler(restEvent, {}),
        graphqlHandler(graphqlEvent, {})
      ]);

      expect(restResult.statusCode).toBe(200);
      expect(graphqlResult.statusCode).toBe(200);

      const restData = JSON.parse(restResult.body);
      const graphqlData = JSON.parse(graphqlResult.body);

      expect(restData.name).toBe('bulbasaur');
      expect(graphqlData.data.pokemon_v2_pokemon_by_pk.name).toBe('bulbasaur');
    });

    it('should handle errors gracefully in both functions', async () => {
      const { fetchWithCache, getCache } = require('@netlify/cache');
      
      // Mock REST error
      fetchWithCache.mockRejectedValueOnce(new Error('REST API Error'));

      // Mock GraphQL error
      getCache.mockResolvedValueOnce(null);
      fetch.mockRejectedValueOnce(new Error('GraphQL API Error'));

      const restEvent = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/99999',
        queryStringParameters: null
      };

      const graphqlEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: 'query { invalid_query }',
          variables: {}
        })
      };

      const [restResult, graphqlResult] = await Promise.all([
        restHandler(restEvent, {}),
        graphqlHandler(graphqlEvent, {})
      ]);

      expect(restResult.statusCode).toBe(500);
      expect(graphqlResult.statusCode).toBe(500);

      const restError = JSON.parse(restResult.body);
      const graphqlError = JSON.parse(graphqlResult.body);

      expect(restError.error).toBe('Failed to fetch Pokemon data');
      expect(graphqlError.error).toBe('Failed to fetch Pokemon data');
    });
  });

  describe('Cache Coordination', () => {
    it('should use different cache strategies for REST vs GraphQL', async () => {
      const { fetchWithCache, getCache, setCache } = require('@netlify/cache');
      
      // Mock REST with longer cache
      fetchWithCache.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, name: 'bulbasaur' }),
      });

      // Mock GraphQL with shorter cache
      getCache.mockResolvedValueOnce(null);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { test: 'data' } }),
      });

      const restEvent = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon/1',
        queryStringParameters: null
      };

      const graphqlEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: 'query { test }',
          variables: {}
        })
      };

      await Promise.all([
        restHandler(restEvent, {}),
        graphqlHandler(graphqlEvent, {})
      ]);

      // REST should use 24 hour cache (86400 seconds)
      expect(fetchWithCache).toHaveBeenCalledWith(
        expect.any(Object),
        {},
        expect.objectContaining({ maxAge: 86400 })
      );

      // GraphQL should use 1 hour cache (3600 seconds)
      expect(setCache).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        { maxAge: 3600 }
      );
    });
  });

  describe('Performance Testing', () => {
    it('should complete requests within acceptable time limits', async () => {
      const { fetchWithCache, getCache } = require('@netlify/cache');
      
      // Mock fast responses
      fetchWithCache.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, name: 'test' }),
      });

      getCache.mockResolvedValue(JSON.stringify({ data: { test: 'cached' } }));

      const startTime = Date.now();

      const requests = Array.from({ length: 10 }, (_, i) => [
        restHandler({
          httpMethod: 'GET',
          path: `/api/pokemon/rest/pokemon/${i + 1}`,
          queryStringParameters: null
        }, {}),
        graphqlHandler({
          httpMethod: 'POST',
          body: JSON.stringify({
            query: `query { pokemon_v2_pokemon_by_pk(id: ${i + 1}) { id } }`,
            variables: {}
          })
        }, {})
      ]).flat();

      const results = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;

      // All 20 requests should complete within 5 seconds
      expect(duration).toBeLessThan(5000);

      // All requests should succeed
      results.forEach(result => {
        expect(result.statusCode).toBe(200);
      });
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical Pokemon app workflow', async () => {
      const { fetchWithCache, getCache, setCache } = require('@netlify/cache');
      
      // Scenario: User searches for Pokemon list, then views details
      
      // 1. Fetch Pokemon list
      fetchWithCache.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
            { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' }
          ],
          count: 2
        }),
      });

      const listEvent = {
        httpMethod: 'GET',
        path: '/api/pokemon/rest/pokemon',
        queryStringParameters: { limit: '20', offset: '0' }
      };

      const listResult = await restHandler(listEvent, {});
      expect(listResult.statusCode).toBe(200);

      // 2. Fetch specific Pokemon details via GraphQL
      getCache.mockResolvedValueOnce(null);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            pokemon_v2_pokemon_by_pk: {
              id: 1,
              name: 'bulbasaur',
              height: 7,
              weight: 69,
              pokemon_v2_pokemontypes: [
                { pokemon_v2_type: { name: 'grass' } }
              ]
            }
          }
        }),
      });

      const detailEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
          query: `
            query GetPokemon($id: Int!) {
              pokemon_v2_pokemon_by_pk(id: $id) {
                id
                name
                height
                weight
                pokemon_v2_pokemontypes {
                  pokemon_v2_type {
                    name
                  }
                }
              }
            }
          `,
          variables: { id: 1 }
        })
      };

      const detailResult = await graphqlHandler(detailEvent, {});
      expect(detailResult.statusCode).toBe(200);

      const detailData = JSON.parse(detailResult.body);
      expect(detailData.data.pokemon_v2_pokemon_by_pk.name).toBe('bulbasaur');

      // 3. Verify caching behavior
      expect(setCache).toHaveBeenCalled(); // GraphQL result should be cached
    });

    it('should handle concurrent user requests efficiently', async () => {
      const { fetchWithCache, getCache } = require('@netlify/cache');
      
      // Simulate multiple users requesting different Pokemon simultaneously
      const userRequests = [
        { userId: 1, pokemonId: 1, name: 'bulbasaur' },
        { userId: 2, pokemonId: 25, name: 'pikachu' },
        { userId: 3, pokemonId: 150, name: 'mewtwo' },
      ];

      // Mock responses for each request
      userRequests.forEach(({ pokemonId, name }) => {
        fetchWithCache.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: pokemonId, name }),
        });

        getCache.mockResolvedValueOnce(null);
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { pokemon_v2_pokemon_by_pk: { id: pokemonId, name } }
          }),
        });
      });

      const requests = userRequests.flatMap(({ pokemonId }) => [
        restHandler({
          httpMethod: 'GET',
          path: `/api/pokemon/rest/pokemon/${pokemonId}`,
          queryStringParameters: null
        }, {}),
        graphqlHandler({
          httpMethod: 'POST',
          body: JSON.stringify({
            query: 'query GetPokemon($id: Int!) { pokemon_v2_pokemon_by_pk(id: $id) { id name } }',
            variables: { id: pokemonId }
          })
        }, {})
      ]);

      const results = await Promise.all(requests);

      // All requests should succeed
      results.forEach(result => {
        expect(result.statusCode).toBe(200);
      });

      // Verify correct data returned
      for (let i = 0; i < userRequests.length; i++) {
        const { name } = userRequests[i];
        const restData = JSON.parse(results[i * 2].body);
        const graphqlData = JSON.parse(results[i * 2 + 1].body);

        expect(restData.name).toBe(name);
        expect(graphqlData.data.pokemon_v2_pokemon_by_pk.name).toBe(name);
      }
    });
  });
}); 