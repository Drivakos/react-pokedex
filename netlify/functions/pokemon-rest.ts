import type { Config, Context } from "@netlify/functions";
import { fetchWithCache } from "@netlify/cache";

// Environment variables with fallbacks
const REST_ENDPOINT = process.env.VITE_API_REST_URL || process.env.VITE_API_URL || 'https://pokeapi.co/api/v2';

export default async (req: Request, context: Context) => {
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Parse the URL to get the path parameter
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    
    // Extract the API path after '/api/pokemon/rest/'
    const apiPathIndex = pathSegments.findIndex(segment => segment === 'rest');
    if (apiPathIndex === -1 || apiPathIndex >= pathSegments.length - 1) {
      return new Response(
        JSON.stringify({ error: 'API path is required. Use /api/pokemon/rest/{endpoint}' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Reconstruct the API path and query parameters
    const apiPath = pathSegments.slice(apiPathIndex + 1).join('/');
    const queryString = url.search;
    const fullApiUrl = `${REST_ENDPOINT}/${apiPath}${queryString}`;

    // Create the request
    const apiRequest = new Request(fullApiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Netlify-Pokemon-Cache/1.0',
      },
    });

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

    // Use fetchWithCache to automatically handle caching
    const response = await fetchWithCache(
      apiRequest,
      {},
      {
        durable: true,
        overrideDeployRevalidation: false,
        maxAge: maxAge,
        overrideCacheControl: `public, max-age=${maxAge}, s-maxage=${maxAge}`,
      }
    );

    if (!response.ok) {
      throw new Error(`PokeAPI returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Return the cached/fresh data with appropriate headers
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
        'X-Cache-Duration': maxAge.toString(),
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Pokemon REST API Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch Pokemon data',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
};

export const config: Config = {
  path: "/api/pokemon/rest/*"
}; 