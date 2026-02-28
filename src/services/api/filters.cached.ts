import { areCachedEndpointsAvailable, fetchCachedGraphQL } from './cache-base';

/**
 * Fetches filter options using cached GraphQL endpoint (with availability check)
 */
export const fetchCachedFilterOptions = async () => {
  // Check if cached endpoints are available first
  if (!(await areCachedEndpointsAvailable())) {
    throw new Error('Cached endpoints not available');
  }

  try {
    const query = `
      query GetFilterOptions {
        types: pokemon_v2_type(order_by: { name: asc }) {
          name
        }
        moves: pokemon_v2_move(order_by: { name: asc }, limit: 100) {
          name
        }
        generations: pokemon_v2_generation(order_by: { id: asc }) {
          name
        }
      }
    `;

    const result = await fetchCachedGraphQL(query);
    
    return {
      types: result.data.types.map((t: { name: string }) => t.name),
      moves: result.data.moves.map((m: { name: string }) => m.name),
      generations: result.data.generations.map((g: { name: string }) => g.name),
    };
  } catch (error) {
    console.error('Error fetching cached filter options:', error);
    throw error;
  }
};
