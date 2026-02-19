import { useState, useEffect, useRef, useCallback } from 'react';
import { Pokemon, Filters, PokemonDetails } from '../types/pokemon';
import { fetchPokemonData, fetchFilterOptions, fetchPokemonById, fetchPokemonDetails } from '../services/api';

export const POKEMON_PER_PAGE = 20;
export const SEARCH_DEBOUNCE_MS = 250; // Reduced for better responsiveness

export const usePokemon = (options: { skipFetch?: boolean } = {}) => {
  const { skipFetch = false } = options;

  // State for Pokemon data
  const [displayedPokemon, setDisplayedPokemon] = useState<Pokemon[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const loadingRef = useRef(false);
  const searchTimeoutRef = useRef<number>();

  // State for selected Pokemon
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);

  // State for filters
  const [filters, setFilters] = useState<Filters>({
    types: [],
    moves: [],
    generation: '',
    weight: { min: 0, max: 0 },
    height: { min: 0, max: 0 },
    hasEvolutions: null,
  });

  // State for available filter options - cache these to avoid refetching
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableMoves, setAvailableMoves] = useState<string[]>([]);
  const [availableGenerations, setAvailableGenerations] = useState<string[]>([]);
  const [filterOptionsLoaded, setFilterOptionsLoaded] = useState(false);

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
    const loadFilterOptions = async () => {
      if (filterOptionsLoaded || skipFetch) return;

      try {
        setLoadingProgress(5);
        const { types, moves, generations } = await fetchFilterOptions();
        setAvailableTypes(types);
        setAvailableMoves(moves);
        setAvailableGenerations(generations);
        setFilterOptionsLoaded(true);
        setLoadingProgress(20);
      } catch (error) {
        console.error('Error fetching filter options:', error);
        setFilterOptionsLoaded(true); // Don't block loading if filter options fail
      }
    };

    loadFilterOptions();
  }, [filterOptionsLoaded, skipFetch]);

  // Fetch Pokemon data when search or filters change
  useEffect(() => {
    if (skipFetch) {
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    if (!filterOptionsLoaded) return; // Wait for filter options to load first

    const controller = new AbortController();
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
          controller.signal
        );

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
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, filters, filterOptionsLoaded, skipFetch]);

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
        filters
      );

      setDisplayedPokemon(prev => [...prev, ...newPokemon]);
      setHasMore(newPokemon.length === POKEMON_PER_PAGE);
      setPage(nextPage);
    } catch (error) {
      console.error('Error loading more Pokemon:', error);
    } finally {
      loadingRef.current = false;
      setLoading(false); // Clear loading state
    }
  }, [page, hasMore, debouncedSearchTerm, filters]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
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
