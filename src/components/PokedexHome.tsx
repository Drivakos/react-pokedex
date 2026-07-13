import React, { useState, useCallback } from 'react';
import { PokemonList } from './PokemonList';
import { HomeSEO } from './HomeSEO';
import { HomeHeader } from './HomeHeader';
import { FilterManager } from './FilterManager';
import { PokemonDetailModal } from './PokemonDetailModal';
import { usePokemon } from '../hooks/usePokemon';
import { useUI } from '../hooks/useUI';
import { useFilterStore } from '../store/filterStore';
import Footer from './Footer';

const PokedexHome: React.FC = () => {
  const {
    displayedPokemon,
    hasMore,
    loading,
    selectedPokemon,
    setSelectedPokemon,
    loadMorePokemon,
    isSearching,
  } = usePokemon();

  const { searchTerm, setSearchTerm } = useFilterStore();

  const { lastPokemonElementRef } = useUI();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);

  // Setup the intersection observer for infinite scrolling - stable reference
  const setupObserver = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = lastPokemonElementRef(node);
    if (observer) {
      observer(() => {
        if (hasMore) {
          loadMorePokemon();
        }
      });
    }
  }, [hasMore, loadMorePokemon, lastPokemonElementRef]);

  return (
    <div className="min-h-screen bg-gray-200 md:p-8">
      <HomeSEO />
      
      <HomeHeader 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isSearching={isSearching}
      />

      <main className="flex flex-col gap-6">
        <FilterManager 
          showDesktopFilters={showDesktopFilters}
          setShowDesktopFilters={setShowDesktopFilters}
          showMobileFilters={showMobileFilters}
          setShowMobileFilters={setShowMobileFilters}
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
