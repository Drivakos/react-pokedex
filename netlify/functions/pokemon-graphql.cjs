const { getCache, setCache } = require("@netlify/cache");

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

    // Try to get cached response first
    let cachedResponse;
    try {
      cachedResponse = await getCache(cacheKey);
    } catch (error) {
      console.log('Cache get error:', error);
    }

    if (cachedResponse) {
      console.log('Cache hit for GraphQL query');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'X-Cache': 'HIT',
          ...corsHeaders,
        },
        body: cachedResponse
      };
    }

    // Make the GraphQL request
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const responseBody = JSON.stringify(data);

    // Cache the response for 1 hour
    try {
      await setCache(cacheKey, responseBody, {
        maxAge: 3600, // 1 hour
      });
      console.log('Cached GraphQL response');
    } catch (error) {
      console.error('Cache set error:', error);
    }

    // Return the fresh data
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Cache': 'MISS',
        ...corsHeaders,
      },
      body: responseBody
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