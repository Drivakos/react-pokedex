/**
 * Base configuration and utilities for cached API requests through Supabase Edge Functions.
 * These functions handle the Tier 2 (Supabase Edge) caching layer.
 */

// Detect if we're in development or if Supabase functions are available
const isLocalDevelopment = import.meta.env.DEV;
const supabaseFunctionsAvailable = !isLocalDevelopment && typeof window !== 'undefined';

// Use cached Supabase Edge Functions in production when available
const SUPABASE_FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_URL;
export const CACHED_GRAPHQL_ENDPOINT = supabaseFunctionsAvailable
  ? `${SUPABASE_FUNCTIONS_BASE}/functions/v1/graphql` : null;
export const CACHED_REST_ENDPOINT = supabaseFunctionsAvailable
  ? `${SUPABASE_FUNCTIONS_BASE}/functions/v1/rest` : null;

/**
 * Checks if cached endpoints are available
 */
export const areCachedEndpointsAvailable = async (): Promise<boolean> => {
  if (!supabaseFunctionsAvailable || !CACHED_GRAPHQL_ENDPOINT) {
    return false;
  }

  try {
    // Quick health check on the GraphQL endpoint
    const response = await fetch(CACHED_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: 'query { __typename }' // Simple schema query
      }),
    });
    
    return response.status !== 404;
  } catch (error) {
    console.warn('Cached endpoints not available:', error);
    return false;
  }
};

/**
 * Makes a cached GraphQL request through Supabase Edge Functions
 */
export const fetchCachedGraphQL = async (query: string, variables?: any) => {
  if (!CACHED_GRAPHQL_ENDPOINT) {
    throw new Error('Cached GraphQL endpoint not available in development');
  }

  try {
    const response = await fetch(CACHED_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result;
  } catch (error) {
    console.error('Cached GraphQL request failed:', error);
    throw error;
  }
};

/**
 * Makes a cached REST request through Supabase Edge Functions
 */
export const fetchCachedREST = async (endpoint: string) => {
  if (!CACHED_REST_ENDPOINT) {
    throw new Error('Cached REST endpoint not available in development');
  }

  try {
    const response = await fetch(`${CACHED_REST_ENDPOINT}/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Cached REST request failed:', error);
    throw error;
  }
};
