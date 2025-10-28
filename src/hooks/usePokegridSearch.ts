import { useState, useEffect, useRef, useCallback } from 'react';
import { Pokemon } from '../types/pokemon';
import { fetchPokemonData } from '../services/api';

const DEBOUNCE_DELAY = 1000; // 1 second

export function usePokegridSearch(displayedPokemon: Pokemon[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pokemon[]>([]);
  const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
  const [loadingAllPokemon, setLoadingAllPokemon] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [minLoadingTime, setMinLoadingTime] = useState(false);
  const allPokemonLoadedRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounce search query
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    if (allPokemonLoadedRef.current || loadingAllPokemon) return;

    const loadPokemonForSearch = async () => {
      setLoadingAllPokemon(true);
      try {
        const pokemonList: Pokemon[] = [];
        const BATCH_SIZE = 100;
        const MAX_POKEMON = 500;

        for (let offset = 0; offset < MAX_POKEMON; offset += BATCH_SIZE) {
          try {
            const filters = {
              types: [],
              moves: [],
              generation: '',
              weight: { min: 0, max: 0 },
              height: { min: 0, max: 0 },
              hasEvolutions: null,
            };

            const batch = await fetchPokemonData(BATCH_SIZE, offset, '', filters);

            if (batch.length === 0) break; // No more Pokemon
            pokemonList.push(...batch);
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            console.warn(`Failed to load Pokemon batch at offset ${offset}:`, error);
            break;
          }
        }

        if (pokemonList.length > 0) {
          setAllPokemon(pokemonList);
        } else {
          setAllPokemon(displayedPokemon);
        }

      } catch (error) {
        console.error('Error loading Pokemon for search:', error);
        setAllPokemon(displayedPokemon);
      } finally {
        setLoadingAllPokemon(false);
        allPokemonLoadedRef.current = true;
      }
    };

    const timer = setTimeout(loadPokemonForSearch, 500);
    return () => clearTimeout(timer);
  }, [displayedPokemon, loadingAllPokemon]);

  const pokemonForSearch = allPokemon.length > 0 ? allPokemon : displayedPokemon;

  useEffect(() => {
    if (debouncedSearchQuery.length > 0) {
      setIsSearching(true);
      setMinLoadingTime(true);

      setTimeout(() => {
        setMinLoadingTime(false);
      }, 300);

      const query = debouncedSearchQuery.toLowerCase().trim();

      const startsWithName: Pokemon[] = [];
      const startsWithId: Pokemon[] = [];
      const containsName: Pokemon[] = [];
      const containsId: Pokemon[] = [];

      pokemonForSearch.forEach(pokemon => {
        const lowerName = pokemon.name.toLowerCase();
        const idString = pokemon.id.toString();

        if (lowerName.startsWith(query)) {
          startsWithName.push(pokemon);
        } else if (idString.startsWith(query)) {
          startsWithId.push(pokemon);
        } else if (lowerName.includes(query)) {
          containsName.push(pokemon);
        } else if (idString.includes(query)) {
          containsId.push(pokemon);
        }
      });


      // Sort each group by relevance (exact match first, then alphabetical)
      const sortByRelevance = (a: Pokemon, b: Pokemon) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        // Exact match first
        if (aName === query && bName !== query) return -1;
        if (bName === query && aName !== query) return 1;

        // Then alphabetical
        return aName.localeCompare(bName);
      };

      startsWithName.sort(sortByRelevance);
      startsWithId.sort((a, b) => a.id - b.id);
      containsName.sort(sortByRelevance);
      containsId.sort((a, b) => a.id - b.id);

      // Combine in priority order and limit results
      const combinedResults = [
        ...startsWithName,
        ...startsWithId,
        ...containsName,
        ...containsId
      ].slice(0, 50);

      setSearchResults(combinedResults);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, pokemonForSearch]);

  // Handle minimum loading time
  useEffect(() => {
    if (minLoadingTime) {
      const timer = setTimeout(() => {
        setMinLoadingTime(false);
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [minLoadingTime]);

  const resetSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setMinLoadingTime(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isLoadingAllPokemon: loadingAllPokemon && !allPokemonLoadedRef.current,
    isSearching,
    resetSearch
  };
}
