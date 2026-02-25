/**
 * Centralized GraphQL query building utilities
 * Prevents code duplication between api.ts and cached-api.ts
 */

import { Filters } from '../types/pokemon';

/**
 * Builds GraphQL query conditions based on filters and search term
 */
export const buildWhereConditions = (searchTerm: string, filters: Filters): string => {
  const conditions = {
    // Types and Moves are handled separately via AND conditions in buildCompleteWhereClause
    
    generation: filters.generation
      ? `pokemon_v2_pokemonspecy: { pokemon_v2_generation: { name: { _eq: ${JSON.stringify(filters.generation)} } } }`
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
 * Builds individual type conditions for multiple type filtering
 */
export const buildTypeConditions = (types: string[]): string[] => {
  return types.map(type => 
    `{ pokemon_v2_pokemontypes: { pokemon_v2_type: { name: { _eq: ${JSON.stringify(type)} } } } }`
  );
};

/**
 * Builds individual move conditions for multiple move filtering
 */
export const buildMoveConditions = (moves: string[]): string[] => {
  return moves.map(move => 
    `{ pokemon_v2_pokemonmoves: { pokemon_v2_move: { name: { _eq: ${JSON.stringify(move)} } } } }`
  );
};

/**
 * Constructs a complete where clause with all conditions
 */
export const buildCompleteWhereClause = (searchTerm: string, filters: Filters): string => {
  const whereConditions = buildWhereConditions(searchTerm, filters);
  const typeConditions = buildTypeConditions(filters.types);
  const moveConditions = buildMoveConditions(filters.moves);

  // Combine all conditions into a single _and array
  const allConditions = [
    // Parse whereConditions if it exists (it's a comma-separated list of key: value)
    ...(whereConditions ? whereConditions.split(',').map(c => `{ ${c.trim()} }`) : []),
    ...typeConditions,
    ...moveConditions,
    `{ pokemon_v2_pokemonforms: { is_default: { _eq: true } } }`
  ].filter(Boolean);

  return `_and: [${allConditions.join(', ')}]`;
};

/**
 * Standard Pokemon query fields used across the app
 */
export const POKEMON_FIELDS = `
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
`;

