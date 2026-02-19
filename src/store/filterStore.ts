import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Filters } from '../types/pokemon';
import { PokemonService } from '../services/pokemon.service';

interface FilterState {
  // Persisted state
  filters: Filters;
  searchTerm: string;
  
  // Transient state
  availableTypes: string[];
  availableMoves: string[];
  availableGenerations: string[];
  isLoadingOptions: boolean;
  optionsLoaded: boolean;
  lastUpdated: number; // Timestamp for cache busting/re-fetch triggers

  // Actions
  setSearchTerm: (term: string) => void;
  setFilters: (filters: Filters | ((prev: Filters) => Filters)) => void;
  resetFilters: () => void;
  loadFilterOptions: () => Promise<void>;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
}

const initialFilters: Filters = {
  types: [],
  moves: [],
  generation: '',
  weight: { min: 0, max: 0 },
  height: { min: 0, max: 0 },
  hasEvolutions: null,
};

export const useFilterStore = create<FilterState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      filters: initialFilters,
      searchTerm: '',
      availableTypes: [],
      availableMoves: [],
      availableGenerations: [],
      isLoadingOptions: false,
      optionsLoaded: false,
      lastUpdated: Date.now(),

      // Actions
      setSearchTerm: (term) => set({ searchTerm: term, lastUpdated: Date.now() }),

      setFilters: (filtersOrFn) => set((state) => {
        if (typeof filtersOrFn === 'function') {
          state.filters = filtersOrFn(state.filters);
        } else {
          state.filters = filtersOrFn;
        }
        state.lastUpdated = Date.now();
      }),

      resetFilters: () => set({ 
        filters: initialFilters, 
        searchTerm: '', 
        lastUpdated: Date.now() 
      }),

      updateFilter: (key, value) => set((state) => {
        state.filters[key] = value;
        state.lastUpdated = Date.now();
      }),

      loadFilterOptions: async () => {
        if (get().optionsLoaded || get().isLoadingOptions) return;

        set({ isLoadingOptions: true });
        try {
          const { types, moves, generations } = await PokemonService.getFilterOptions();
          set({
            availableTypes: types,
            availableMoves: moves,
            availableGenerations: generations,
            optionsLoaded: true,
          });
        } catch (error) {
          console.error('Error loading filter options:', error);
        } finally {
          set({ isLoadingOptions: false });
        }
      },
    })),
    {
      name: 'pokemon-filters',
      partialize: (state) => ({
        filters: state.filters,
        searchTerm: state.searchTerm,
      }),
    }
  )
);
