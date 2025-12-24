/**
 * Generic reusable search hook with debouncing and race condition handling
 * Can be used across the application for consistent search behavior
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSearchOptions<T> {
  /** Function to perform the actual search */
  searchFn: (query: string, searchId: number) => Promise<T[]>;
  /** Debounce delay in milliseconds (default: 250ms) */
  debounceMs?: number;
  /** Minimum query length to trigger search (default: 0) */
  minQueryLength?: number;
}

export interface UseSearchReturn<T> {
  /** Current search query */
  query: string;
  /** Update the search query */
  setQuery: (query: string) => void;
  /** Search results */
  results: T[];
  /** Whether a search is currently in progress */
  isSearching: boolean;
  /** Reset search to initial state */
  reset: () => void;
  /** Manually trigger a search */
  search: (query?: string) => void;
}

/**
 * Generic search hook with debouncing and race condition prevention
 */
export function useSearch<T = any>(
  options: UseSearchOptions<T>
): UseSearchReturn<T> {
  const {
    searchFn,
    debounceMs = 250,
    minQueryLength = 0
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Track the current search request ID to prevent race conditions
  const currentSearchIdRef = useRef<number>(0);
  const timeoutRef = useRef<number>();

  // Perform search with race condition handling
  const performSearch = useCallback(async (searchQuery: string, searchId: number) => {
    // Check minimum query length
    if (searchQuery.length < minQueryLength) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // Empty query
    if (searchQuery.length === 0) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const searchResults = await searchFn(searchQuery, searchId);

      // Check if this is still the most recent search
      if (searchId === currentSearchIdRef.current) {
        setResults(searchResults);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Only clear results if this is still the current search
      if (searchId === currentSearchIdRef.current) {
        setResults([]);
      }
    } finally {
      // Only update loading state if this is still the current search
      if (searchId === currentSearchIdRef.current) {
        setIsSearching(false);
      }
    }
  }, [searchFn, minQueryLength]);

  // Debounced search effect
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset for empty query
    if (query.length === 0) {
      setResults([]);
      setIsSearching(false);
      currentSearchIdRef.current = 0;
      return;
    }

    // Increment search ID for this new search
    const searchId = ++currentSearchIdRef.current;

    // Debounce the search
    timeoutRef.current = setTimeout(() => {
      performSearch(query, searchId);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, debounceMs, performSearch]);

  // Reset search to initial state
  const reset = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsSearching(false);
    currentSearchIdRef.current = 0;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Manually trigger a search
  const search = useCallback((searchQuery?: string) => {
    const queryToSearch = searchQuery !== undefined ? searchQuery : query;
    const searchId = ++currentSearchIdRef.current;
    performSearch(queryToSearch, searchId);
  }, [query, performSearch]);

  return {
    query,
    setQuery,
    results,
    isSearching,
    reset,
    search
  };
}

