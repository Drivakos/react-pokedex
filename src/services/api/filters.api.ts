import { fetchCachedFilterOptions } from './filters.cached';
import { supabase } from '../../lib/supabase';
import { GRAPHQL_ENDPOINT } from './base';

/**
 * Fetches available filter options (types, moves, generations)
 */
export const fetchFilterOptions = async () => {
  // 1. Try Supabase Database filter_options table
  try {
    const { data, error } = await supabase
      .from('filter_options')
      .select('category, name')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      const result = {
        types: data.filter(i => i.category === 'type').map(i => i.name),
        moves: data.filter(i => i.category === 'move').map(i => i.name),
        generations: data.filter(i => i.category === 'generation').map(i => i.name),
      };
      
      if (result.types.length > 0 || result.generations.length > 0) {
        return result;
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[cache fallback]', error);
  }

  // 2. Try Supabase cache (Edge Functions)
  try {
    return await fetchCachedFilterOptions();
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[cache fallback]', error);
  }

  // 3. Fallback to direct API call
  try {
    const query = `
      query GetFilterOptions {
        types: pokemon_v2_type(where: {pokemon_v2_pokemontypes: {pokemon_v2_pokemon: {is_default: {_eq: true}}}}) {
          name
        }
        moves: pokemon_v2_move(limit: 1000) {
          name
        }
        generations: pokemon_v2_generation {
          name
        }
      }
    `;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    return {
      types: result.data.types.map((t: { name: string }) => t.name),
      moves: result.data.moves.map((m: { name: string }) => m.name),
      generations: result.data.generations.map((g: { name: string }) => g.name),
    };
  } catch (error) {
    console.error('Error fetching filter options from API:', error);
    throw error;
  }
};
