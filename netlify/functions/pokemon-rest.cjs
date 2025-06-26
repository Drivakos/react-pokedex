const { fetchWithCache } = require("@netlify/cache");

// Environment variables with fallbacks
const REST_ENDPOINT = process.env.VITE_API_REST_URL || process.env.VITE_API_URL || 'https://pokeapi.co/api/v2';

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
    // Add debugging
    console.log('Event path:', event.path);
    console.log('Event query params:', event.queryStringParameters);
    
    // Parse the URL path to get the API endpoint
    const pathSegments = event.path.split('/');
    console.log('Path segments:', pathSegments);
    
    // The path comes as /api/pokemon/rest/pokemon/4
    // We need to extract everything after 'rest'
    let functionIndex = pathSegments.findIndex(segment => segment === 'rest');
    
    // If we don't find 'rest', try looking for 'pokemon-rest' (in case redirect works)
    if (functionIndex === -1) {
      functionIndex = pathSegments.findIndex(segment => segment === 'pokemon-rest');
    }
    
    console.log('Function index:', functionIndex);
    
    if (functionIndex === -1 || functionIndex >= pathSegments.length - 1) {
      console.log('Error: No API path found');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        body: JSON.stringify({ 
          error: 'API path is required. Use /api/pokemon/rest/{endpoint} or /.netlify/functions/pokemon-rest/{endpoint}',
          debug: {
            path: event.path,
            pathSegments,
            functionIndex
          }
        })
      };
    }

    // Reconstruct the API path and query parameters
    const apiPath = pathSegments.slice(functionIndex + 1).join('/');
    const queryString = event.queryStringParameters ? 
      new URLSearchParams(event.queryStringParameters).toString() : '';
    const fullApiUrl = `${REST_ENDPOINT}/${apiPath}${queryString ? `?${queryString}` : ''}`;
    
    console.log('API path:', apiPath);
    console.log('Full API URL:', fullApiUrl);

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
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
        'X-Cache-Duration': maxAge.toString(),
        ...corsHeaders,
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Pokemon REST API Error:', error);
    
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