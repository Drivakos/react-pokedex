import { Pokemon, RawPokemonData, Filters, PokemonDetails } from '../types/pokemon';

// Use cached Netlify Functions instead of direct API calls
const CACHED_GRAPHQL_ENDPOINT = '/api/pokemon/graphql';
const CACHED_REST_ENDPOINT = '/api/pokemon/rest';

/**
 * Makes a cached GraphQL request through Netlify Functions
 */
const fetchCachedGraphQL = async (query: string, variables?: any) => {
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
 * Fetches a single Pokemon by ID using cached endpoint
 */
export const fetchCachedPokemonById = async (id: number): Promise<Pokemon> => {
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
 * Fetches Pokemon data using cached GraphQL endpoint
 */
export const fetchCachedPokemonData = async (
  limit: number, 
  offset: number, 
  searchTerm: string, 
  filters: Filters
): Promise<Pokemon[]> => {
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
 * Fetches Pokemon details using cached REST endpoint
 */
export const fetchCachedPokemonDetails = async (id: number): Promise<PokemonDetails> => {
  try {
    // Fetch from cached REST endpoint
    const pokemon = await fetchCachedREST(`pokemon/${id}`);
    const species = await fetchCachedREST(`pokemon-species/${id}`);

    return {
      id: pokemon.id,
      name: pokemon.name,
      height: pokemon.height,
      weight: pokemon.weight,
      base_experience: pokemon.base_experience,
      types: pokemon.types.map((t: any) => t.type.name),
      abilities: pokemon.abilities.map((a: any) => ({
        name: a.ability.name,
        is_hidden: a.is_hidden,
      })),
      stats: pokemon.stats.map((s: any) => ({
        name: s.stat.name,
        base_stat: s.base_stat,
      })),
      moves: pokemon.moves.map((m: any) => m.move.name),
      sprites: pokemon.sprites,
      species: {
        name: species.name,
        flavor_text_entries: species.flavor_text_entries,
        genera: species.genera,
        habitat: species.habitat,
        growth_rate: species.growth_rate,
        capture_rate: species.capture_rate,
        base_happiness: species.base_happiness,
        is_baby: species.is_baby,
        is_legendary: species.is_legendary,
        is_mythical: species.is_mythical,
        hatch_counter: species.hatch_counter,
        has_gender_differences: species.has_gender_differences,
        forms_switchable: species.forms_switchable,
        evolution_chain: species.evolution_chain,
      },
    };
  } catch (error) {
    console.error(`Error fetching cached Pokemon details for ID ${id}:`, error);
    throw error;
  }
};

/**
 * Fetches filter options using cached GraphQL endpoint
 */
export const fetchCachedFilterOptions = async () => {
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