const { fetchWithCache } = require("@netlify/cache");

// Environment variables with fallbacks
const GRAPHQL_ENDPOINT = process.env.VITE_API_GRAPHQL_URL || 'https://beta.pokeapi.co/graphql/v1beta';

exports.handler = async (event, context) => {
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    // Parse the request body to get the GraphQL query
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { query, variables } = body;

    if (!query) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: JSON.stringify({ error: 'GraphQL query is required' })
      };
    }

    // Create a cache key based on the query and variables
    const cacheKey = `graphql:${Buffer.from(JSON.stringify({ query, variables })).toString('base64')}`;
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
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        ...corsHeaders,
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Pokemon GraphQL API Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch Pokemon data',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 