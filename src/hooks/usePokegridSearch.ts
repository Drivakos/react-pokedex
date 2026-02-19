import { useCallback, useMemo } from 'react';
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
  const searchFn = useCallback(async (query: string, _searchId: number, signal?: AbortSignal) => {
    // Query is already trimmed by our wrapper
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
        },
        signal
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
    debounceMs: 200, // Balanced debounce to reduce API calls while maintaining responsiveness
    minQueryLength: 2 // Require at least 2 characters to reduce very broad searches
  });

  // Enhanced setQuery that trims input and prevents unnecessary searches
  const setTrimmedSearchQuery = useCallback((query: string) => {
    const trimmed = query.trim();

    // Prevent setting if trimmed version is the same as current query
    // This avoids unnecessary re-renders and search triggers
    if (trimmed === searchQuery) {
      return;
    }

    setSearchQuery(trimmed);
  }, [searchQuery, setSearchQuery]);

  return useMemo(() => ({
    searchQuery,
    setSearchQuery: setTrimmedSearchQuery,
    searchResults,
    isSearching,
    resetSearch
  }), [searchQuery, setTrimmedSearchQuery, searchResults, isSearching, resetSearch]);
}