import { Pokemon, RawPokemonData, Filters, PokemonDetails } from '../types/pokemon';

// Detect if we're in development or if functions are available
const isLocalDevelopment = import.meta.env.DEV;
const netlifyFunctionsAvailable = !isLocalDevelopment && typeof window !== 'undefined';

// Use cached Netlify Functions only in production when available
const CACHED_GRAPHQL_ENDPOINT = netlifyFunctionsAvailable ? '/api/pokemon/graphql' : null;
const CACHED_REST_ENDPOINT = netlifyFunctionsAvailable ? '/api/pokemon/rest' : null;

/**
 * Checks if cached endpoints are available
 */
const areCachedEndpointsAvailable = async (): Promise<boolean> => {
  if (!netlifyFunctionsAvailable || !CACHED_GRAPHQL_ENDPOINT) {
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
 * Makes a cached GraphQL request through Netlify Functions
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
 * Makes a cached REST request through Netlify Functions
 */
const fetchCachedREST = async (endpoint: string) => {
  if (!CACHED_REST_ENDPOINT) {
    throw new Error('Cached REST endpoint not available in development');
  }

  try {
    const response = await fetch(`${CACHED_REST_ENDPOINT}/${endpoint}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Cached REST request failed:', error);
    throw error;
  }
};

/**
 * Builds GraphQL query conditions based on filters and search term
 */
export const buildWhereConditions = (searchTerm: string, filters: Filters) => {
  const conditions = {
    types: filters.types.length > 0
      ? `pokemon_v2_pokemontypes: { pokemon_v2_type: { name: { _in: ${JSON.stringify(filters.types)} } } }`
      : '',
    
    moves: filters.moves.length > 0
      ? `pokemon_v2_pokemonmoves: { pokemon_v2_move: { name: { _in: ${JSON.stringify(filters.moves)} } } }`
      : '',

    generation: filters.generation
      ? `pokemon_v2_pokemonspecy: { pokemon_v2_generation: { name: { _eq: "${filters.generation}" } } }`
      : '',

    name: searchTerm
      ? `name: { _ilike: ${JSON.stringify(`%${searchTerm.toLowerCase()}%`)} }`
      : '',

    weight: filters.weight.min > 0 || filters.weight.max > 0
      ? `weight: { ${filters.weight.min > 0 ? `_gte: ${filters.weight.min},` : ''} ${filters.weight.max > 0 ? `_lte: ${filters.weight.max}` : ''} }`
      : '',

    height: filters.height.min > 0 || filters.height.max > 0
      ? `height: { ${filters.height.min > 0 ? `_gte: ${filters.height.min},` : ''} ${filters.height.max > 0 ? `_lte: ${filters.height.max}` : ''} }`
      : '',

    evolution: filters.hasEvolutions !== null
      ? `pokemon_v2_pokemonspecy: {
          pokemon_v2_evolutionchain: {
            pokemon_v2_pokemonspecies_aggregate: {
              count: ${filters.hasEvolutions ? 'gt: 1' : 'equals: 1'}
            }
          }
        }`
      : '',
  };

  return Object.values(conditions).filter(Boolean).join(', ');
};

/**
 * Builds the type AND condition for multiple type filtering
 */
export const buildTypeAndCondition = (types: string[]) => {
  if (types.length === 0) return '';
  
  return `_and: [${types.map(type => 
    `{ pokemon_v2_pokemontypes: { pokemon_v2_type: { name: { _eq: ${JSON.stringify(type)} } } } }`
  ).join(',')}]`;
};

/**
 * Transforms raw Pokemon data from GraphQL to our Pokemon type
 */
export const transformSinglePokemon = (p: RawPokemonData): Pokemon => ({
  id: p.id,
  name: p.name,
  height: p.height,
  weight: p.weight,
  is_default: p.is_default,
  base_experience: p.base_experience,
  types: p.types.map(t => t.type.name),
  moves: p.moves?.map(m => m.move.name) || [],
  sprites: p.sprites?.[0]?.data || {},
  generation: p.species?.generation?.name || 'unknown',
  forms: p.forms?.map(f => f.form_name) || [],
  evolution_chain: p.species?.pokemon_v2_evolutionchain?.pokemon_v2_pokemonspecies?.map(s => s.name) || []
});

/**
 * Transforms array of raw Pokemon data
 */
export const transformRawData = (rawData: RawPokemonData[]): Pokemon[] => {
  return rawData.map(transformSinglePokemon);
};

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
          id
          name
          height
          weight
          is_default
          base_experience
          types: pokemon_v2_pokemontypes {
            type: pokemon_v2_type {
              name
            }
          }
          moves: pokemon_v2_pokemonmoves {
            move: pokemon_v2_move {
              name
            }
          }
          sprites: pokemon_v2_pokemonsprites {
            data: sprites
          }
          species: pokemon_v2_pokemonspecy {
            generation: pokemon_v2_generation {
              name
            }
            pokemon_v2_pokemons {
              pokemon_v2_pokemonforms {
                form_name
                is_default
              }
            }
            pokemon_v2_evolutionchain {
              pokemon_v2_pokemonspecies {
                name
              }
            }
          }
          forms: pokemon_v2_pokemonforms {
            form_name
            is_default
          }
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
    const whereConditions = buildWhereConditions(searchTerm, filters);
    const typeAndCondition = buildTypeAndCondition(filters.types);

    // Construct the where clause with proper conditions
    const whereClause = [
      whereConditions,
      typeAndCondition,
      `pokemon_v2_pokemonforms: { is_default: { _eq: true } }`
    ].filter(Boolean).join(', ');

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
          id
          name
          height
          weight
          is_default
          base_experience
          types: pokemon_v2_pokemontypes {
            type: pokemon_v2_type {
              name
            }
          }
          moves: pokemon_v2_pokemonmoves {
            move: pokemon_v2_move {
              name
            }
          }
          sprites: pokemon_v2_pokemonsprites {
            data: sprites
          }
          species: pokemon_v2_pokemonspecy {
            generation: pokemon_v2_generation {
              name
            }
            pokemon_v2_pokemons {
              pokemon_v2_pokemonforms {
                form_name
                is_default
              }
            }
            pokemon_v2_evolutionchain {
              pokemon_v2_pokemonspecies {
                name
              }
            }
          }
          forms: pokemon_v2_pokemonforms {
            form_name
            is_default
          }
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