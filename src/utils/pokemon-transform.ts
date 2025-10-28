/**
 * Centralized Pokemon data transformation utilities
 * Prevents code duplication between api.ts and cached-api.ts
 */

import { Pokemon, RawPokemonData } from '../types/pokemon';

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
 * Transforms an array of raw Pokemon data to our Pokemon interface
 */
export const transformRawData = (rawData: RawPokemonData[]): Pokemon[] => {
  return rawData.map(p => transformSinglePokemon(p));
};

/**
 * Type guard to check if data has required Pokemon fields
 */
export const isValidPokemonData = (data: any): data is RawPokemonData => {
  return (
    data &&
    typeof data.id === 'number' &&
    typeof data.name === 'string' &&
    Array.isArray(data.types)
  );
};

