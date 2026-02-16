// Use environment variables for API endpoints (fallback for direct calls)
export const GRAPHQL_ENDPOINT = import.meta.env.VITE_API_GRAPHQL_URL;
export const REST_ENDPOINT = import.meta.env.VITE_API_REST_URL || import.meta.env.VITE_API_URL;

// Validate API endpoints
if (!GRAPHQL_ENDPOINT || !REST_ENDPOINT) {
  console.error('Missing required API endpoint environment variables');
}

/**
 * Handle GraphQL response and errors
 */
export async function handleGraphQLResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`GraphQL HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}
