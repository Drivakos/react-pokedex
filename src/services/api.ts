import { Pokemon, RawPokemonData, Filters, PokemonDetails } from '../types/pokemon';
import { 
  fetchCachedPokemonById, 
  fetchCachedPokemonData, 
  fetchCachedPokemonDetails, 
  fetchCachedFilterOptions 
} from './cached-api';

// Use environment variables for API endpoints (fallback for direct calls)
const GRAPHQL_ENDPOINT = import.meta.env.VITE_API_GRAPHQL_URL || 'https://beta.pokeapi.co/graphql/v1beta';
const REST_ENDPOINT = import.meta.env.VITE_API_REST_URL || import.meta.env.VITE_API_URL || 'https://pokeapi.co/api/v2';

// Feature flag to enable/disable caching (disabled in development by default)
const USE_CACHED_API = import.meta.env.VITE_USE_CACHED_API === 'true' && !import.meta.env.DEV;

// Validate API endpoints
if (!GRAPHQL_ENDPOINT || !REST_ENDPOINT) {
  console.error('Missing required API endpoint environment variables');
}

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
 * Fetches a single Pokemon by ID with caching support
 */
export const fetchPokemonById = async (id: number): Promise<Pokemon> => {
  // Try cached version first if enabled
  if (USE_CACHED_API) {
    try {
      return await fetchCachedPokemonById(id);
    } catch (error) {
      console.warn(`⚠️ Cached API failed for Pokemon ${id}, falling back to direct API:`, error);
    }
  }

  // Fallback to direct API call
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

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id } }),
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    const rawPokemon = result.data.pokemon_v2_pokemon_by_pk as RawPokemonData;
    
    if (!rawPokemon) {
      throw new Error(`Pokemon with ID ${id} not found`);
    }
    
    return transformSinglePokemon(rawPokemon);
  } catch (error) {
    console.error(`Error fetching Pokemon with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Fetches Pokemon data from GraphQL API with caching support
 */
export const fetchPokemonData = async (
  limit: number, 
  offset: number, 
  searchTerm: string, 
  filters: Filters
): Promise<Pokemon[]> => {
  // Try cached version first if enabled
  if (USE_CACHED_API) {
    try {
      return await fetchCachedPokemonData(limit, offset, searchTerm, filters);
    } catch (error) {
      console.warn(`⚠️ Cached API failed for Pokemon data, falling back to direct API:`, error);
    }
  }

  // Fallback to direct API call
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

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { limit, offset } }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL HTTP error! Status: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', JSON.stringify(result.errors));
      throw new Error(`GraphQL error: ${result.errors[0]?.message || 'Unknown GraphQL error'}`);
    }
    
    if (!result.data) {
      console.error('No data returned from GraphQL:', result);
      throw new Error('No data returned from GraphQL query');
    }

    const rawPokemon = result.data.pokemon_v2_pokemon as RawPokemonData[];
    
    return transformRawData(rawPokemon);
  } catch (error) {
    console.error('Error fetching Pokemon data:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error type:', typeof error);
    }
    throw error;
  }
};

/**
 * Transforms raw API data to our Pokemon interface
 */
export const transformRawData = (rawData: RawPokemonData[]): Pokemon[] => {
  return rawData.map(p => transformSinglePokemon(p));
};

/**
 * Transforms a single raw Pokemon data object to our Pokemon interface
 */
export const transformSinglePokemon = (p: RawPokemonData): Pokemon => {
  return {
    id: p.id,
    name: p.name,
    height: p.height,
    weight: p.weight,
    types: p.types?.map(t => t.type.name) || [],
    moves: p.moves?.map(m => m.move.name) || [],
    sprites: p.sprites?.[0]?.data || {},
    generation: p.species?.generation?.name || 'unknown',
    has_evolutions: p.species?.pokemon_v2_evolutionchain?.pokemon_v2_pokemonspecies && 
                   p.species.pokemon_v2_evolutionchain.pokemon_v2_pokemonspecies.length > 1 || false,
    is_default: p.is_default,
    base_experience: p.base_experience,
  };
};

/**
 * Fetches detailed Pokemon data from GraphQL API (simplified, single call)
 */
export const fetchPokemonDetails = async (id: number): Promise<PokemonDetails> => {
  // Try cached version first if enabled
  if (USE_CACHED_API) {
    try {
      return await fetchCachedPokemonDetails(id);
    } catch (error) {
      console.warn(`⚠️ Cached API failed for Pokemon details ${id}, falling back to direct API:`, error);
    }
  }

  // Use GraphQL for single API call instead of multiple REST calls
  try {
    const query = `
      query GetPokemonDetails($id: Int!) {
        pokemon_v2_pokemon_by_pk(id: $id) {
          id
          name
          height
          weight
          base_experience
          types: pokemon_v2_pokemontypes {
            type: pokemon_v2_type {
              name
            }
          }
          abilities: pokemon_v2_pokemonabilities {
            ability: pokemon_v2_ability {
              name
              pokemon_v2_abilityflavortexts(where: { pokemon_v2_language: { name: { _eq: "en" } } }) {
                flavor_text
              }
            }
            is_hidden
          }
          moves: pokemon_v2_pokemonmoves(where: { pokemon_v2_versiongroup: { name: { _eq: "red-blue" } } }) {
            move: pokemon_v2_move {
              name
            }
            level
            pokemon_v2_movelearnmethod {
              name
            }
          }
          stats: pokemon_v2_pokemonstats {
            base_stat
            pokemon_v2_stat {
              name
            }
          }
          sprites: pokemon_v2_pokemonsprites {
            data: sprites
          }
          species: pokemon_v2_pokemonspecy {
            flavor_text: pokemon_v2_pokemonspeciesflavortexts(where: { pokemon_v2_language: { name: { _eq: "en" } } }, limit: 1) {
              flavor_text
            }
            genera: pokemon_v2_pokemonspeciesnames(where: { pokemon_v2_language: { name: { _eq: "en" } } }) {
              genus
            }
            generation: pokemon_v2_generation {
              name
            }
            evolution_chain: pokemon_v2_evolutionchain {
              pokemon_v2_pokemonspecies {
                id
                name
                pokemon_v2_pokemonspeciesnames(where: { pokemon_v2_language: { name: { _eq: "en" } } }) {
                  name
                }
                pokemon_v2_pokemonevolutions {
                  min_level
                  pokemon_v2_item {
                    name
                  }
                  pokemon_v2_evolutiontrigger {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id } }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    const pokemon = result.data.pokemon_v2_pokemon_by_pk;

    if (!pokemon) {
      throw new Error(`Pokemon with ID ${id} not found`);
    }

    // Transform GraphQL data to our format
    const stats = pokemon.stats.reduce((acc: any, stat: any) => {
      const statName = stat.pokemon_v2_stat.name.replace('-', '_');
      acc[statName] = stat.base_stat;
      return acc;
    }, {});

    const abilities = pokemon.abilities.map((ability: any) => ({
      name: ability.ability.name.replace('-', ' '),
      is_hidden: ability.is_hidden,
      description: ability.ability.pokemon_v2_abilityflavortexts?.[0]?.flavor_text || 'No description available.'
    }));

    const moves = pokemon.moves.map((move: any) => ({
      name: move.move.name,
      learned_at_level: move.level || 0,
      learn_method: move.pokemon_v2_movelearnmethod?.name || 'unknown'
    }));

    // Process evolution chain
    const evolutions = [];
    if (pokemon.species?.evolution_chain?.pokemon_v2_pokemonspecies) {
      const species = pokemon.species.evolution_chain.pokemon_v2_pokemonspecies;
      species.forEach((evo: any) => {
        const evolutionDetails = evo.pokemon_v2_pokemonevolutions?.[0];
        evolutions.push({
          species_name: evo.name,
          species_id: evo.id,
          min_level: evolutionDetails?.min_level || null,
          trigger_name: evolutionDetails?.pokemon_v2_evolutiontrigger?.name || null,
          item: evolutionDetails?.pokemon_v2_item?.name || null
        });
      });
    }

    // Get sprites from GraphQL data
    const spritesData = pokemon.sprites?.[0]?.data;
    let sprites = {
      front_default: '',
      back_default: '',
      front_shiny: '',
      back_shiny: '',
      official_artwork: ''
    };

    if (spritesData) {
      try {
        const parsedSprites = JSON.parse(spritesData);
        sprites = {
          front_default: parsedSprites.front_default || '',
          back_default: parsedSprites.back_default || '',
          front_shiny: parsedSprites.front_shiny || '',
          back_shiny: parsedSprites.back_shiny || '',
          official_artwork: parsedSprites.other?.['official-artwork']?.front_default || ''
        };
      } catch (e) {
        // If parsing fails, use defaults
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
      sprites,
      moves,
      flavor_text: pokemon.species?.flavor_text?.[0]?.flavor_text || '',
      genera: pokemon.species?.genera?.[0]?.genus || '',
      generation: pokemon.species?.generation?.name || 'unknown',
      evolution_chain: evolutions,
      base_experience: pokemon.base_experience,
      has_evolutions: evolutions.length > 1
    };
  } catch (error) {
    console.error(`Error fetching detailed Pokemon data for ID ${id}:`, error);
    throw error;
  }
};

/**
 * Fetches available filter options (types, moves, generations)
 */
export const fetchFilterOptions = async () => {
  // Try cached version first if enabled
  if (USE_CACHED_API) {
    try {
      return await fetchCachedFilterOptions();
    } catch (error) {
      console.warn(`⚠️ Cached API failed for filter options, falling back to direct API:`, error);
    }
  }

  // Fallback to direct API call
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
      throw new Error(`GraphQL HTTP error! Status: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', JSON.stringify(result.errors));
      throw new Error(`GraphQL error: ${result.errors[0]?.message || 'Unknown GraphQL error'}`);
    }

    if (!result.data) {
      console.error('No data returned from GraphQL:', result);
      throw new Error('No data returned from GraphQL query');
    }

    return {
      types: result.data.types.map((t: { name: string }) => t.name),
      moves: result.data.moves.map((m: { name: string }) => m.name),
      generations: result.data.generations.map((g: { name: string }) => g.name),
    };
  } catch (error) {
    console.error('Error fetching filter options:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error type:', typeof error);
    }
    throw error;
  }
};
