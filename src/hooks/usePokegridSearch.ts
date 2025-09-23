import { useState, useEffect, useCallback, useRef } from 'react';
import { Pokemon } from '../types/pokemon';
import { fetchPokemonData } from '../services/api';

export function usePokegridSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pokemon[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Track the current search request ID to prevent race conditions
  const currentSearchIdRef = useRef<number>(0);

  // Dynamic search function that makes GraphQL requests
  const performSearch = useCallback(async (query: string, searchId: number) => {
    if (query.length === 0) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

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

      // Check if this is still the most recent search before updating results
      if (searchId !== currentSearchIdRef.current) {
        // This search is outdated, ignore the results
        return;
      }

      // Sort results by relevance (similar to the original logic)
      const queryLower = query.toLowerCase().trim();

      // Separate Pokemon into different priority groups
      const startsWithName: Pokemon[] = [];
      const startsWithId: Pokemon[] = [];
      const containsName: Pokemon[] = [];
      const containsId: Pokemon[] = [];

      results.forEach(pokemon => {
        const lowerName = pokemon.name.toLowerCase();
        const idString = pokemon.id.toString();

        if (lowerName.startsWith(queryLower)) {
          startsWithName.push(pokemon);
        } else if (idString.startsWith(queryLower)) {
          startsWithId.push(pokemon);
        } else if (lowerName.includes(queryLower)) {
          containsName.push(pokemon);
        } else if (idString.includes(queryLower)) {
          containsId.push(pokemon);
        }
      });

      // Sort each group by relevance
      const sortByRelevance = (a: Pokemon, b: Pokemon) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        // Exact match first
        if (aName === queryLower && bName !== queryLower) return -1;
        if (bName === queryLower && aName !== queryLower) return 1;

        // Then alphabetical
        return aName.localeCompare(bName);
      };

      startsWithName.sort(sortByRelevance);
      startsWithId.sort((a, b) => a.id - b.id);
      containsName.sort(sortByRelevance);
      containsId.sort((a, b) => a.id - b.id);

      // Combine in priority order and limit results to 50 for performance
      const combinedResults = [
        ...startsWithName,
        ...startsWithId,
        ...containsName,
        ...containsId
      ].slice(0, 50);

      // Double-check this is still the current search before updating
      if (searchId === currentSearchIdRef.current) {
        setSearchResults(combinedResults);
      }
    } catch (error) {
      console.error('Error searching Pokemon:', error);
      // Only clear results if this is still the current search
      if (searchId === currentSearchIdRef.current) {
        setSearchResults([]);
      }
    } finally {
      // Only update loading state if this is still the current search
      if (searchId === currentSearchIdRef.current) {
        setIsSearching(false);
      }
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchQuery.length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      currentSearchIdRef.current = 0; // Reset search ID
      return;
    }

    // Increment search ID for this new search
    const searchId = ++currentSearchIdRef.current;

    const timeoutId = setTimeout(() => {
      performSearch(searchQuery, searchId);
    }, 150); // Short debounce for responsive feel

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching
  };
}
