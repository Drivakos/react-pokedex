/**
 * Centralized Pokemon search, sort, and filter utilities
 * Provides reusable search logic across the application
 */

import { Pokemon } from '../types/pokemon';

/**
 * Sort Pokemon by search relevance
 * Priority: exact match > starts with name > starts with ID > contains name > contains ID
 */
export const sortPokemonByRelevance = (pokemon: Pokemon[], query: string): Pokemon[] => {
  const queryLower = query.toLowerCase().trim();

  if (!queryLower) return pokemon;

  // Separate Pokemon into different priority groups
  const startsWithName: Pokemon[] = [];
  const startsWithId: Pokemon[] = [];
  const containsName: Pokemon[] = [];
  const containsId: Pokemon[] = [];

  pokemon.forEach(p => {
    const lowerName = p.name.toLowerCase();
    const idString = p.id.toString();

    if (lowerName.startsWith(queryLower)) {
      startsWithName.push(p);
    } else if (idString.startsWith(queryLower)) {
      startsWithId.push(p);
    } else if (lowerName.includes(queryLower)) {
      containsName.push(p);
    } else if (idString.includes(queryLower)) {
      containsId.push(p);
    }
  });

  // Sort each group by relevance
  const sortByName = (a: Pokemon, b: Pokemon) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    // Exact match first
    if (aName === queryLower && bName !== queryLower) return -1;
    if (bName === queryLower && aName !== queryLower) return 1;

    // Then alphabetical
    return aName.localeCompare(bName);
  };

  const sortById = (a: Pokemon, b: Pokemon) => a.id - b.id;

  startsWithName.sort(sortByName);
  startsWithId.sort(sortById);
  containsName.sort(sortByName);
  containsId.sort(sortById);

  // Combine in priority order
  return [
    ...startsWithName,
    ...startsWithId,
    ...containsName,
    ...containsId
  ];
};

/**
 * Filter Pokemon by search query (name or ID)
 * Returns all Pokemon that match the query
 */
export const filterPokemonByQuery = (pokemon: Pokemon[], query: string): Pokemon[] => {
  const queryLower = query.toLowerCase().trim();

  if (!queryLower) return pokemon;

  return pokemon.filter(p => {
    const lowerName = p.name.toLowerCase();
    const idString = p.id.toString();
    return lowerName.includes(queryLower) || idString.includes(queryLower);
  });
};

/**
 * Search and sort Pokemon by relevance with limit
 */
export const searchPokemon = (
  pokemon: Pokemon[], 
  query: string, 
  limit: number = 50
): Pokemon[] => {
  const filtered = filterPokemonByQuery(pokemon, query);
  const sorted = sortPokemonByRelevance(filtered, query);
  return sorted.slice(0, limit);
};

/**
 * Calculate search relevance score for a Pokemon
 * Higher score = more relevant
 */
export const calculateRelevanceScore = (pokemon: Pokemon, query: string): number => {
  const queryLower = query.toLowerCase().trim();
  const lowerName = pokemon.name.toLowerCase();
  const idString = pokemon.id.toString();

  // Exact match
  if (lowerName === queryLower || idString === queryLower) return 100;

  // Starts with
  if (lowerName.startsWith(queryLower)) return 80;
  if (idString.startsWith(queryLower)) return 70;

  // Contains
  if (lowerName.includes(queryLower)) return 50;
  if (idString.includes(queryLower)) return 40;

  return 0;
};

/**
 * Check if a Pokemon matches the search query
 */
export const matchesSearchQuery = (pokemon: Pokemon, query: string): boolean => {
  const queryLower = query.toLowerCase().trim();
  
  if (!queryLower) return true;

  const lowerName = pokemon.name.toLowerCase();
  const idString = pokemon.id.toString();
  
  return lowerName.includes(queryLower) || idString.includes(queryLower);
};

