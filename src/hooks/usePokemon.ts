import { useState, useEffect, useRef, useCallback } from 'react';
import { Pokemon, Filters, PokemonDetails } from '../types/pokemon';
import { fetchPokemonData, fetchPokemonById, fetchPokemonDetails } from '../services/api';
import { useFilterStore } from '../store/filterStore';

export const POKEMON_PER_PAGE = 20;
export const SEARCH_DEBOUNCE_MS = 250; // Reduced for better responsiveness

export const usePokemon = (options: { skipFetch?: boolean } = {}) => {
  const { skipFetch = false } = options;

  // Store state with granular selectors
  const filters = useFilterStore(state => state.filters);
  const searchTerm = useFilterStore(state => state.searchTerm);
  const setSearchTerm = useFilterStore(state => state.setSearchTerm);
  const availableTypes = useFilterStore(state => state.availableTypes);
  const availableMoves = useFilterStore(state => state.availableMoves);
  const availableGenerations = useFilterStore(state => state.availableGenerations);
  const loadFilterOptions = useFilterStore(state => state.loadFilterOptions);
  const optionsLoaded = useFilterStore(state => state.optionsLoaded);
  const lastUpdated = useFilterStore(state => state.lastUpdated);

  // State for Pokemon data
  const [displayedPokemon, setDisplayedPokemon] = useState<Pokemon[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // State for search and filters
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [isSearching, setIsSearching] = useState(false);
  const loadingRef = useRef(false);
  const searchTimeoutRef = useRef<number>();
  const abortControllerRef = useRef<AbortController | null>(null);

  // State for selected Pokemon
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);

  // Debounce search term
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Separate effect for loading filter options (only once)
  useEffect(() => {
    if (!skipFetch) {
      loadFilterOptions();
    }
  }, [skipFetch, loadFilterOptions]);

  // Fetch Pokemon data when search or filters change
  useEffect(() => {
    if (skipFetch) {
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    if (!optionsLoaded) return; // Wait for filter options to load first

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsSearching(true);
    const fetchPokemon = async () => {
      try {
        if (initialLoad) {
          setLoading(true);
          setLoadingProgress(20);
        }

        // Fetch first page of Pokemon
        setLoadingProgress(50);
        const results = await fetchPokemonData(
          POKEMON_PER_PAGE,
          0,
          debouncedSearchTerm,
          filters,
          signal
        );

        if (signal.aborted) return;

        setLoadingProgress(90);
        setDisplayedPokemon(results);
        setHasMore(results.length === POKEMON_PER_PAGE);
        setPage(0);
        setInitialLoad(false);
        setLoading(false);
        setIsSearching(false);
        setLoadingProgress(100);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        
        console.error('Error fetching Pokemon data:', error);
        setLoading(false);
        setIsSearching(false);
      }
    };

    fetchPokemon();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, filters, optionsLoaded, skipFetch, lastUpdated]);

  // Load more Pokemon when scrolling
  const loadMorePokemon = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    setLoading(true); // Set loading state for UI feedback

    try {
      const nextPage = page + 1;
      const offset = nextPage * POKEMON_PER_PAGE;

      const newPokemon = await fetchPokemonData(
        POKEMON_PER_PAGE,
        offset,
        debouncedSearchTerm,
        filters,
        abortControllerRef.current?.signal
      );

      setDisplayedPokemon(prev => [...prev, ...newPokemon]);
      setHasMore(newPokemon.length === POKEMON_PER_PAGE);
      setPage(nextPage);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Error loading more Pokemon:', error);
    } finally {
      loadingRef.current = false;
      setLoading(false); // Clear loading state
    }
  }, [page, hasMore, debouncedSearchTerm, filters, lastUpdated]);

  // Handle filter changes - now just a proxy to the store if needed, 
  // but better to use useFilterStore directly in components
  const handleFilterChange = useCallback((newFilters: Filters) => {
    useFilterStore.getState().setFilters(newFilters);
  }, []);

  // Get a single Pokemon by ID
  const getPokemonById = useCallback(async (id: number): Promise<Pokemon> => {
    try {
      return await fetchPokemonById(id);
    } catch (error) {
      console.error(`Error in getPokemonById for ID ${id}:`, error);
      throw error;
    }
  }, []);
  
  // Get detailed Pokemon data from REST API
  const getPokemonDetails = useCallback(async (id: number): Promise<PokemonDetails> => {
    try {
      return await fetchPokemonDetails(id);
    } catch (error) {
      console.error(`Error in getPokemonDetails for ID ${id}:`, error);
      throw error;
    }
  }, []);

  return {
    // Pokemon data
    displayedPokemon,
    hasMore,
    loading,
    loadingProgress,
    selectedPokemon,
    
    // Actions
    setSelectedPokemon,
    loadMorePokemon,
    getPokemonById,
    getPokemonDetails,
    
    // Search
    searchTerm,
    setSearchTerm,
    isSearching,
    
    // Filters
    filters,
    handleFilterChange,
    availableTypes,
    availableMoves,
    availableGenerations,
  };
};

export default usePokemon;
