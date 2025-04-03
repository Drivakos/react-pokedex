import { Pokemon, RawPokemonData, Filters } from '../types/pokemon';

const GRAPHQL_ENDPOINT = 'https://beta.pokeapi.co/graphql/v1beta';

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
 * Fetches Pokemon data from GraphQL API
 */
export const fetchPokemonData = async (
  limit: number, 
  offset: number, 
  searchTerm: string, 
  filters: Filters
): Promise<Pokemon[]> => {
  try {
    const whereConditions = buildWhereConditions(searchTerm, filters);
    const typeAndCondition = buildTypeAndCondition(filters.types);

    const query = `
      query GetFilteredPokemon($limit: Int!, $offset: Int!) {
        pokemon_v2_pokemon(
          limit: $limit, 
          offset: $offset, 
          order_by: {id: asc}
          where: {
            ${whereConditions}
            ${typeAndCondition}
            pokemon_v2_pokemonforms: { 
              is_default: { _eq: true }
            }
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

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    const rawPokemon = result.data.pokemon_v2_pokemon as RawPokemonData[];
    
    return transformRawData(rawPokemon);
  } catch (error) {
    console.error('Error fetching Pokemon data:', error);
    throw error;
  }
};

/**
 * Transforms raw API data to our Pokemon interface
 */
export const transformRawData = (rawData: RawPokemonData[]): Pokemon[] => {
  return rawData.map(p => ({
    id: p.id,
    name: p.name,
    height: p.height,
    weight: p.weight,
    types: p.types.map(t => t.type.name),
    moves: p.moves.map(m => m.move.name),
    sprites: p.sprites[0]?.data || {},
    generation: p.species?.generation?.name || 'unknown',
    has_evolutions: p.species?.pokemon_v2_evolutionchain?.pokemon_v2_pokemonspecies?.length > 1 || false,
    is_default: p.is_default,
    base_experience: p.base_experience,
  }));
};

/**
 * Fetches available filter options (types, moves, generations)
 */
export const fetchFilterOptions = async () => {
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

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return {
      types: result.data.types.map((t: { name: string }) => t.name),
      moves: result.data.moves.map((m: { name: string }) => m.name),
      generations: result.data.generations.map((g: { name: string }) => g.name),
    };
  } catch (error) {
    console.error('Error fetching filter options:', error);
    throw error;
  }
};
