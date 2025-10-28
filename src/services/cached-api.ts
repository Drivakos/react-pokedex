import { Pokemon, RawPokemonData, Filters, PokemonDetails } from '../types/pokemon';
import { buildCompleteWhereClause, POKEMON_FIELDS } from '../utils/query-builder';
import { transformSinglePokemon, transformRawData } from '../utils/pokemon-transform';

// Detect if we're in development or if Supabase functions are available
const isLocalDevelopment = import.meta.env.DEV;
const supabaseFunctionsAvailable = !isLocalDevelopment && typeof window !== 'undefined';

// Use cached Supabase Edge Functions in production when available
const CACHED_GRAPHQL_ENDPOINT = supabaseFunctionsAvailable ?
  `https://kefcxvcbpadksfizrckw.supabase.co/functions/v1/graphql` : null;
const CACHED_REST_ENDPOINT = supabaseFunctionsAvailable ?
  `https://kefcxvcbpadksfizrckw.supabase.co/functions/v1/rest` : null;

/**
 * Checks if cached endpoints are available
 */
const areCachedEndpointsAvailable = async (): Promise<boolean> => {
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
const fetchCachedGraphQL = async (query: string, variables?: any) => {
  if (!CACHED_GRAPHQL_ENDPOINT) {
    throw new Error('Cached GraphQL endpoint not available in development');
  }

  try {
    const response = await fetch(CACHED_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
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
const fetchCachedREST = async (endpoint: string) => {
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

// Query building and transform functions moved to utils/

/**
 * Fetches a single Pokemon by ID using cached endpoint (with availability check)
 */
export const fetchCachedPokemonById = async (id: number): Promise<Pokemon> => {
  // Check if cached endpoints are available first
  if (!(await areCachedEndpointsAvailable())) {
    throw new Error('Cached endpoints not available');
  }

  try {
    const query = `
      query GetPokemonById($id: Int!) {
        pokemon_v2_pokemon_by_pk(id: $id) {
          ${POKEMON_FIELDS}
        }
      }
    `;

    const result = await fetchCachedGraphQL(query, { id });
    const rawPokemon = result.data.pokemon_v2_pokemon_by_pk as RawPokemonData;
    
    if (!rawPokemon) {
      throw new Error(`Pokemon with ID ${id} not found`);
    }
    
    return transformSinglePokemon(rawPokemon);
  } catch (error) {
    console.error(`Error fetching cached Pokemon with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Fetches Pokemon data using cached GraphQL endpoint (with availability check)
 */
export const fetchCachedPokemonData = async (
  limit: number, 
  offset: number, 
  searchTerm: string, 
  filters: Filters
): Promise<Pokemon[]> => {
  // Check if cached endpoints are available first
  if (!(await areCachedEndpointsAvailable())) {
    throw new Error('Cached endpoints not available');
  }

  try {
    const whereClause = buildCompleteWhereClause(searchTerm, filters);

    const query = `
      query GetFilteredPokemon($limit: Int!, $offset: Int!) {
        pokemon_v2_pokemon(
          limit: $limit, 
          offset: $offset, 
          order_by: {id: asc}
          where: {
            ${whereClause}
          }
        ) {
          ${POKEMON_FIELDS}
        }
      }
    `;

    const result = await fetchCachedGraphQL(query, { limit, offset });
    const rawData = result.data.pokemon_v2_pokemon as RawPokemonData[];
    
    return transformRawData(rawData);
  } catch (error) {
    console.error('Error fetching cached Pokemon data:', error);
    throw error;
  }
};

/**
 * Fetches Pokemon details using cached REST endpoint (with availability check)
 */
export const fetchCachedPokemonDetails = async (id: number): Promise<PokemonDetails> => {
  // Check if cached endpoints are available first
  if (!(await areCachedEndpointsAvailable())) {
    throw new Error('Cached endpoints not available');
  }

  try {
    // Fetch from cached REST endpoint
    const pokemon = await fetchCachedREST(`pokemon/${id}`);
    const species = await fetchCachedREST(`pokemon-species/${id}`);

    // Extract English flavor text
    const englishFlavorText = species.flavor_text_entries
      ?.find((entry: any) => entry.language.name === 'en')?.flavor_text
      ?.replace(/\f/g, ' ')
      ?.replace(/\n/g, ' ') || '';

    // Format stats
    const stats = pokemon.stats.reduce((acc: any, stat: any) => {
      const statName = stat.stat.name.replace('-', '_');
      acc[statName] = stat.base_stat;
      return acc;
    }, {});

    // Fetch abilities with descriptions
    const abilitiesPromises = pokemon.abilities.map(async (ability: any) => {
      try {
        const abilityData = await fetchCachedREST(`ability/${ability.ability.name}`);
        
        // Find English description
        const englishEntry = abilityData.flavor_text_entries?.find(
          (entry: any) => entry.language.name === 'en'
        );
        
        return {
          name: ability.ability.name.replace('-', ' '),
          is_hidden: ability.is_hidden,
          description: englishEntry ? englishEntry.flavor_text : 'No description available.'
        };
      } catch (error) {
        console.warn(`Failed to fetch ability ${ability.ability.name}:`, error);
        return {
          name: ability.ability.name.replace('-', ' '),
          is_hidden: ability.is_hidden,
          description: 'No description available.'
        };
      }
    });

    const abilities = await Promise.all(abilitiesPromises);

    // Fetch evolution chain if available
    let evolutionChain: any[] = [];
    if (species.evolution_chain?.url) {
      try {
        const evolutionResponse = await fetch(species.evolution_chain.url);
        const evolutionData = await evolutionResponse.json();
        
        // Process evolution chain with species IDs
        if (evolutionData) {
          const evoData = evolutionData.chain;
          
          // Fetch species data for the base form
          const baseSpeciesResponse = await fetchCachedREST(`pokemon-species/${evoData.species.name}`);
          
          const evoDetails = {
            species_name: evoData.species.name,
            species_id: baseSpeciesResponse.id,
            min_level: 1,
            trigger_name: null,
            item: null
          };
          evolutionChain.push(evoDetails);
          
          // Process first evolution
          if (evoData.evolves_to.length > 0) {
            for (const evo1 of evoData.evolves_to) {
              const speciesData = await fetchCachedREST(`pokemon-species/${evo1.species.name}`);
              
              const evoDetails = {
                species_name: evo1.species.name,
                species_id: speciesData.id,
                min_level: evo1.evolution_details[0]?.min_level || null,
                trigger_name: evo1.evolution_details[0]?.trigger?.name || null,
                item: evo1.evolution_details[0]?.item?.name || null
              };
              evolutionChain.push(evoDetails);
              
              // Process second evolution
              if (evo1.evolves_to.length > 0) {
                for (const evo2 of evo1.evolves_to) {
                  const speciesData = await fetchCachedREST(`pokemon-species/${evo2.species.name}`);
                  
                  const evoDetails = {
                    species_name: evo2.species.name,
                    species_id: speciesData.id,
                    min_level: evo2.evolution_details[0]?.min_level || null,
                    trigger_name: evo2.evolution_details[0]?.trigger?.name || null,
                    item: evo2.evolution_details[0]?.item?.name || null
                  };
                  evolutionChain.push(evoDetails);
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch evolution chain for ${species.name}:`, error);
      }
    }

    return {
      id: pokemon.id,
      name: pokemon.name,
      height: pokemon.height,
      weight: pokemon.weight,
      types: pokemon.types.map((t: any) => t.type.name),
      abilities,
      stats,
      sprites: {
        front_default: pokemon.sprites.front_default,
        back_default: pokemon.sprites.back_default,
        front_shiny: pokemon.sprites.front_shiny,
        back_shiny: pokemon.sprites.back_shiny,
        official_artwork: pokemon.sprites.other?.['official-artwork']?.front_default
      },
      moves: pokemon.moves.map((m: any) => ({
        name: m.move.name,
        learned_at_level: m.version_group_details[0]?.level_learned_at || 0,
        learn_method: m.version_group_details[0]?.move_learn_method.name || 'unknown'
      })),
      flavor_text: englishFlavorText,
      genera: species.genera?.find((g: any) => g.language.name === 'en')?.genus || '',
      generation: species.generation?.name || 'unknown',
      evolution_chain: evolutionChain,
      base_experience: pokemon.base_experience,
      has_evolutions: evolutionChain.length > 1
    };
  } catch (error) {
    console.error(`Error fetching cached Pokemon details for ID ${id}:`, error);
    throw error;
  }
};

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
      types: result.data.types.map((t: any) => t.name),
      moves: result.data.moves.map((m: any) => m.name),
      generations: result.data.generations.map((g: any) => g.name),
    };
  } catch (error) {
    console.error('Error fetching cached filter options:', error);
    throw error;
  }
}; 