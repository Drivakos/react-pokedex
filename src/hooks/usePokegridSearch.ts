import { useCallback } from 'react';
import { Pokemon } from '../types/pokemon';
import { fetchPokemonData } from '../services/api';
import { sortPokemonByRelevance } from '../utils/pokemon-search';
import { useSearch } from './useSearch';

/**
 * Specialized search hook for Pokegrid challenge
 * Uses the generic useSearch hook with Pokemon-specific sorting logic
 */
export function usePokegridSearch() {
  // Search function that fetches and sorts Pokemon
  const searchFn = useCallback(async (query: string) => {
    if (query.length === 0) {
      return [];
    }

    try {
      // For the challenge, we want to search through ALL Pokemon (no filters, just search term)
      // We'll fetch a larger batch to get comprehensive results
      const results = await fetchPokemonData(
        1000, // Large limit to get comprehensive results
        0,
        query,
        {
          types: [],
          moves: [],
          generation: '',
          weight: { min: 0, max: 0 },
          height: { min: 0, max: 0 },
          hasEvolutions: null,
        }
      );

      // Sort results by relevance using centralized utility
      const sorted = sortPokemonByRelevance(results, query);
      
      // Limit results to 50 for performance
      return sorted.slice(0, 50);
    } catch (error) {
      console.error('Error searching Pokemon:', error);
      return [];
    }
  }, []);

  // Use the generic search hook
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    isSearching,
    reset: resetSearch
  } = useSearch<Pokemon>({
    searchFn,
    debounceMs: 150, // Short debounce for responsive feel
    minQueryLength: 0
  });

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    resetSearch
  };
}