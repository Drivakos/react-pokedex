const { fetchWithCache } = require('@netlify/cache');
const { handler } = require('../netlify/functions/pokemon-image-proxy.cjs');

const imageResponse = () => new Response(new Uint8Array([137, 80, 78, 71]), {
  status: 200,
  headers: { 'Content-Type': 'image/png' },
});

describe('pokemon image proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchWithCache.mockResolvedValue(imageResponse());
  });

  it.each([920, 1000, 10177])('reads Pokemon %i from the public API path', async (pokemonId) => {
    const response = await handler({
      httpMethod: 'GET',
      path: `/api/pokemon/images/${pokemonId}`,
      queryStringParameters: null,
    });

    expect(response.statusCode).toBe(200);
    expect(fetchWithCache).toHaveBeenCalledTimes(1);
    expect(fetchWithCache.mock.calls[0][0].url).toBe(
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
    );
  });

  it('reads the ID from rawUrl when the rewritten function path is exposed', async () => {
    const response = await handler({
      httpMethod: 'GET',
      path: '/.netlify/functions/pokemon-image-proxy',
      rawUrl: 'https://www.pokehelper.gr/api/pokemon/images/920',
      queryStringParameters: null,
    });

    expect(response.statusCode).toBe(200);
    expect(fetchWithCache.mock.calls[0][0].url).toContain('/920.png');
  });

  it('keeps legacy direct function calls working', async () => {
    const response = await handler({
      httpMethod: 'GET',
      path: '/.netlify/functions/pokemon-image-proxy',
      queryStringParameters: { id: '920' },
    });

    expect(response.statusCode).toBe(200);
    expect(fetchWithCache.mock.calls[0][0].url).toContain('/920.png');
  });

  it.each([
    '/api/pokemon/images/not-a-number',
    '/api/pokemon/images/0',
    '/api/pokemon/images/123456',
  ])('rejects invalid image path %s without fetching upstream', async (path) => {
    const response = await handler({
      httpMethod: 'GET',
      path,
      queryStringParameters: null,
    });

    expect(response.statusCode).toBe(400);
    expect(fetchWithCache).not.toHaveBeenCalled();
  });
});
