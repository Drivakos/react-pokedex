import type { Config, Context } from "@netlify/functions";
import { fetchWithCache } from "@netlify/cache";

// Environment variables with fallbacks
const GRAPHQL_ENDPOINT = process.env.VITE_API_GRAPHQL_URL || 'https://beta.pokeapi.co/graphql/v1beta';

export default async (req: Request, context: Context) => {
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    // Parse the request body to get the GraphQL query
    const { query, variables } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'GraphQL query is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Create a cache key based on the query and variables
    const cacheKey = `graphql:${btoa(JSON.stringify({ query, variables }))}`;
    const requestUrl = `${GRAPHQL_ENDPOINT}?cache_key=${cacheKey}`;

    // Create the GraphQL request
    const graphqlRequest = new Request(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    // Use fetchWithCache to automatically handle caching
    // Cache for 1 hour (3600 seconds) for Pokemon data which doesn't change often
    const response = await fetchWithCache(
      graphqlRequest,
      {},
      {
        durable: true,
        overrideDeployRevalidation: false,
        maxAge: 3600, // 1 hour cache
        overrideCacheControl: 'public, max-age=3600, s-maxage=3600',
      }
    );

    if (!response.ok) {
      throw new Error(`GraphQL API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Return the cached/fresh data
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Pokemon GraphQL API Error:', error);
    
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
  path: "/api/pokemon/graphql"
}; 