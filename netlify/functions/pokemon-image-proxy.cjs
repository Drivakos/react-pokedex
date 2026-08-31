const { fetchWithCache } = require("@netlify/cache");

const pokemonImagePath = /^\/api\/pokemon\/images\/([1-9]\d{0,4})\/?$/;

/**
 * Netlify rewrites preserve the original request URL, but query-string splat
 * interpolation is not reliable. Accept the legacy query parameter for direct
 * function calls and the public API path used by the app.
 */
const getPokemonId = (event) => {
  const queryId = event.queryStringParameters?.id;
  if (typeof queryId === 'string' && /^[1-9]\d{0,4}$/.test(queryId)) {
    return queryId;
  }

  const paths = [event.path, event.rawPath];
  if (event.rawUrl) {
    try {
      paths.push(new URL(event.rawUrl).pathname);
    } catch {
      // Ignore malformed raw URLs and return the normal validation response.
    }
  }

  for (const path of paths) {
    if (typeof path !== 'string') continue;
    const match = path.match(pokemonImagePath);
    if (match) return match[1];
  }

  return null;
};

/**
 * Netlify Function to proxy and cache Pokemon images from external sources.
 * This allows us to set long-term CDN caching headers and provide a consistent 
 * URL structure while avoiding CORS issues and optimizing delivery via Netlify's Edge.
 */
exports.handler = async (event, context) => {
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const pokemonId = getPokemonId(event);
    
    if (!pokemonId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({ error: 'A valid Pokemon ID is required' })
      };
    }

    // Source URL (GitHub PokeAPI sprites)
    const sourceUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
    
    // Create the request
    const imageRequest = new Request(sourceUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/png,image/*;q=0.8,*/*;q=0.5',
        'User-Agent': 'Netlify-Pokemon-Image-Proxy/1.0',
      },
    });

    // Cache for 1 year (31536000 seconds)
    const maxAge = 31536000;

    // Use fetchWithCache to automatically handle caching at the edge
    // Note: Netlify's fetchWithCache is optimized for Netlify Functions
    const response = await fetchWithCache(
      imageRequest,
      {},
      {
        durable: true,
        maxAge: maxAge,
        overrideCacheControl: `public, max-age=${maxAge}, s-maxage=${maxAge}, immutable`,
      }
    );

    if (!response.ok) {
      throw new Error(`Source returned ${response.status}: ${response.statusText}`);
    }

    // Get the image data as a buffer
    const buffer = await response.arrayBuffer();
    
    // Return the image data
    return {
      statusCode: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/png',
        'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, immutable`,
        'X-Proxy-Cache': response.headers.get('x-netlify-cache-status') || 'miss',
        ...corsHeaders,
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Pokemon Image Proxy Error:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ 
        error: 'Failed to proxy image',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
