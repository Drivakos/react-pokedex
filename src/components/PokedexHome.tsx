import React, { useState, useMemo } from 'react';
import { PokemonList } from './PokemonList';
import { HomeSEO } from './HomeSEO';
import { HomeHeader } from './HomeHeader';
import { FilterManager } from './FilterManager';
import { PokemonDetailModal } from './PokemonDetailModal';
import { usePokemon } from '../hooks/usePokemon';
import { useUI } from '../hooks/useUI';
import Footer from './Footer';

const PokedexHome: React.FC = () => {
  const {
    displayedPokemon,
    hasMore,
    loading,
    selectedPokemon,
    setSelectedPokemon,
    loadMorePokemon,
    searchTerm,
    setSearchTerm,
    isSearching,
    filters,
    handleFilterChange,
    availableTypes,
    availableMoves,
    availableGenerations,
  } = usePokemon();

  const { lastPokemonElementRef } = useUI();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);

  // Setup the intersection observer for infinite scrolling
  const setupObserver = (node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = lastPokemonElementRef(node);
    if (observer) {
      observer(() => {
        if (hasMore) {
          loadMorePokemon();
        }
      });
    }
  };

  // Calculate total active filters
  const totalFiltersCount = useMemo(() => {
    let count = 0;
    count += filters.types.length;
    count += filters.moves.length;
    if (filters.generation) count++;
    if (filters.weight.min > 0 || (filters.weight.max > 0 && filters.weight.max < 1000)) count++;
    if (filters.height.min > 0 || (filters.height.max > 0 && filters.height.max < 100)) count++;
    if (filters.hasEvolutions !== null) count++;
    return count;
  }, [filters]);

  const resetFilters = () => {
    handleFilterChange({
      types: [],
      moves: [],
      generation: '',
      weight: { min: 0, max: 0 },
      height: { min: 0, max: 0 },
      hasEvolutions: null
    });
  };

  return (
    <div className="min-h-screen bg-gray-200 md:p-8">
      <HomeSEO />
      
      <HomeHeader 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isSearching={isSearching}
        totalFiltersCount={totalFiltersCount}
        onToggleFilters={() => setShowDesktopFilters(!showDesktopFilters)}
      />

      <main className="flex flex-col gap-6">
        <FilterManager 
          showDesktopFilters={showDesktopFilters}
          showMobileFilters={showMobileFilters}
          setShowMobileFilters={setShowMobileFilters}
          filters={filters}
          handleFilterChange={handleFilterChange}
          availableTypes={availableTypes}
          availableMoves={availableMoves}
          availableGenerations={availableGenerations}
          totalFiltersCount={totalFiltersCount}
          resetFilters={resetFilters}
        />

        <div className="flex-1">
          <PokemonList
            pokemon={displayedPokemon}
            isLoading={loading}
            onSelectPokemon={setSelectedPokemon}
            lastPokemonRef={setupObserver}
          />
        </div>
      </main>

      {selectedPokemon && (
        <PokemonDetailModal 
          pokemon={selectedPokemon}
          onClose={() => setSelectedPokemon(null)}
        />
      )}

      <div className="container mx-auto px-4 py-4 mt-8">
        <div className="text-sm text-gray-500 flex justify-between">
          <div>
            <span className="font-medium">Published:</span> April 1, 2025
          </div>
          <div>
            <span className="font-medium">Last Modified:</span> April 7, 2025
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PokedexHome;
