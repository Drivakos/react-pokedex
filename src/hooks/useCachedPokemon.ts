/**
 * Custom hook for fetching Pokemon with Redis caching
 * Drop-in replacement for usePokemon with automatic caching
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Pokemon, Filters, PokemonDetails } from '../types/pokemon';
import { PokemonService } from '../services/cached-pokemon.service';
import { fetchFilterOptions } from '../services/api';

export const POKEMON_PER_PAGE = 20;
export const SEARCH_DEBOUNCE_MS = 250;

/**
 * Hook for fetching Pokemon with automatic Redis caching
 * This is a cached version of usePokemon
 */
export const useCachedPokemon = () => {
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

  // State for available filter options
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

  // Load filter options (cached)
  useEffect(() => {
    const loadFilterOptions = async () => {
      if (filterOptionsLoaded) return;

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
        setFilterOptionsLoaded(true);
      }
    };

    loadFilterOptions();
  }, [filterOptionsLoaded]);

  // Fetch Pokemon data with caching
  useEffect(() => {
    if (!filterOptionsLoaded) return;

    setIsSearching(true);
    const fetchPokemon = async () => {
      try {
        if (initialLoad) {
          setLoading(true);
          setLoadingProgress(20);
        }

        setLoadingProgress(50);
        
        // Use cached service
        const results = await PokemonService.getList(
          POKEMON_PER_PAGE,
          0,
          debouncedSearchTerm,
          filters
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
        console.error('Error fetching Pokemon data:', error);
        setLoading(false);
        setIsSearching(false);
      }
    };

    fetchPokemon();
  }, [debouncedSearchTerm, filters, initialLoad, filterOptionsLoaded]);

  // Load more Pokemon when scrolling (with caching)
  const loadMorePokemon = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    
    loadingRef.current = true;
    
    try {
      const nextPage = page + 1;
      const offset = nextPage * POKEMON_PER_PAGE;
      
      // Use cached service
      const newPokemon = await PokemonService.getList(
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
    }
  }, [page, hasMore, debouncedSearchTerm, filters]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
  }, []);

  // Get a single Pokemon by ID (with caching)
  const getPokemonById = useCallback(async (id: number): Promise<Pokemon> => {
    return PokemonService.getById(id);
  }, []);
  
  // Get detailed Pokemon data (with caching)
  const getPokemonDetails = useCallback(async (id: number): Promise<PokemonDetails> => {
    return PokemonService.getDetails(id);
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

export default useCachedPokemon;


