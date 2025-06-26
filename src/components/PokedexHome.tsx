import React, { useState } from 'react';
import { RefreshCw, SlidersHorizontal, X, Trophy } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { PokemonDetail } from './PokemonDetail';
import { PokemonList } from './PokemonList';
import { SearchBar } from './SearchBar';
import { usePokemon } from '../hooks/usePokemon';
import { useUI } from '../hooks/useUI';
import Footer from './Footer';
import { FilterTabs } from './filters/FilterTabs';
import { TypesFilter } from './filters/TypesFilter';
import { MovesFilter } from './filters/MovesFilter';
import { OtherFilters } from './filters/OtherFilters';
import GymLeaderChallenge from './GymLeaderChallenge';

const PokedexHome: React.FC = () => {
  // Use our custom hooks
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
  
  // Filters are hidden by default on both desktop and mobile
  const { lastPokemonElementRef } = useUI();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('types');
  const [moveSearch, setMoveSearch] = useState('');
  const [showGymChallenge, setShowGymChallenge] = useState(false);
  
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

  // Calculate total active filters for display
  const getTotalFiltersCount = () => {
    let count = 0;
    count += filters.types.length;
    count += filters.moves.length;
    if (filters.generation) count++;
    if (filters.weight.min > 0 || (filters.weight.max > 0 && filters.weight.max < 1000)) count++;
    if (filters.height.min > 0 || (filters.height.max > 0 && filters.height.max < 100)) count++;
    if (filters.hasEvolutions !== null) count++;
    return count;
  };
  
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

  // Pokemon Detail Modal
  const detailModal = selectedPokemon && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <PokemonDetail 
        pokemon={selectedPokemon} 
        onClose={() => setSelectedPokemon(null)} 
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <Helmet>
        <title>Pokédex</title>
        <meta name="description" content="A modern Pokédex web application" />
        <link rel="canonical" href={window.location.origin} />
        <meta property="article:published_time" content="2025-04-01T00:00:00Z" />
        <meta property="article:modified_time" content="2025-04-07T00:00:00Z" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "headline": "Pokédex",
            "description": "A modern Pokédex web application",
            "datePublished": "2025-04-01T00:00:00Z",
            "dateModified": "2025-04-07T00:00:00Z",
            "publisher": {
              "@type": "Organization",
              "name": "Pokédex",
              "logo": {
                "@type": "ImageObject",
                "url": `${window.location.origin}/images/pokedex.svg`
              }
            }
          })}
        </script>
      </Helmet>
      
      <header className="mb-6">
        {/* Main heading for SEO and accessibility */}
        <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-6">
          Pokédex - Discover All Pokémon
        </h1>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4 md:gap-6 mb-6" data-component-name="PokedexHome">
          
          <div className="flex-1 max-w-2xl md:w-4/5 md:flex md:items-center" data-component-name="PokedexHome">
            <SearchBar 
              value={searchTerm}
              onChange={setSearchTerm}
              isSearching={isSearching}
              onToggleFilters={() => setShowDesktopFilters(!showDesktopFilters)}
              filterCount={getTotalFiltersCount()}
              showFilterButton={false}
            />
          </div>
          
          <div className="flex items-center justify-end md:w-1/5 md:h-12">
            <button
              onClick={() => setShowDesktopFilters(!showDesktopFilters)}
              className={`hidden md:flex items-center gap-2 px-5 py-3 rounded-md text-base font-semibold shadow-md transition-colors duration-200 ${getTotalFiltersCount() > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'}`} data-component-name="PokedexHome"
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
              {getTotalFiltersCount() > 0 && (
                <span className="bg-white text-blue-500 px-1.5 py-0.5 rounded-full text-xs font-bold ml-1">
                  {getTotalFiltersCount()}
                </span>
              )}
            </button>
            
            {getTotalFiltersCount() > 0 && (
              <button
                onClick={resetFilters}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200"
              >
                <RefreshCw size={16} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Gym Leader Challenge Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setShowGymChallenge(true)}
          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
        >
          <Trophy size={20} />
          <span>Gym Leader Challenge</span>
        </button>
      </div>
      
      <main className="flex flex-col gap-6">
        {/* Desktop Filters */}
        {showDesktopFilters && (
          <div className="hidden md:block w-full">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Filters</h2>
                {getTotalFiltersCount() > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <RefreshCw size={14} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
              
              <FilterTabs
                activeTab={activeFilterTab}
                setActiveTab={setActiveFilterTab}
                typeCount={filters.types.length}
                moveCount={filters.moves.length}
                otherCount={
                  (filters.generation ? 1 : 0) +
                  ((filters.weight.min > 0 || (filters.weight.max > 0 && filters.weight.max < 1000)) ? 1 : 0) +
                  ((filters.height.min > 0 || (filters.height.max > 0 && filters.height.max < 100)) ? 1 : 0) +
                  (filters.hasEvolutions !== null ? 1 : 0)
                }
              />
              
              <div className="mt-4">
                {activeFilterTab === 'types' && (
                  <TypesFilter
                    availableTypes={availableTypes}
                    selectedTypes={filters.types}
                    onTypeToggle={(type: string) => {
                      const newTypes = filters.types.includes(type)
                        ? filters.types.filter(t => t !== type)
                        : [...filters.types, type];
                      handleFilterChange({ ...filters, types: newTypes });
                    }}
                  />
                )}
                
                {activeFilterTab === 'moves' && (
                  <MovesFilter
                    availableMoves={availableMoves}
                    selectedMoves={filters.moves}
                    searchTerm={moveSearch}
                    onSearchChange={setMoveSearch}
                    onMoveToggle={(move: string) => {
                      const newMoves = filters.moves.includes(move)
                        ? filters.moves.filter(m => m !== move)
                        : [...filters.moves, move];
                      handleFilterChange({ ...filters, moves: newMoves });
                    }}
                  />
                )}
                
                {activeFilterTab === 'other' && (
                  <OtherFilters
                    filters={filters}
                    availableGenerations={availableGenerations}
                    onGenerationChange={(generation: string) => handleFilterChange({...filters, generation})}
                    onWeightChange={(min: number | null, max: number | null) => handleFilterChange({
                      ...filters,
                      weight: { 
                        min: min ? min * 10 : 0, 
                        max: max ? max * 10 : 1000 
                      }
                    })}
                    onHeightChange={(min: number | null, max: number | null) => handleFilterChange({
                      ...filters,
                      height: { 
                        min: min ? min * 10 : 0, 
                        max: max ? max * 10 : 100 
                      }
                    })}
                  />
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Pokemon List */}
        <div className="flex-1">
          <PokemonList 
            pokemon={displayedPokemon}
            isLoading={loading}
            onSelectPokemon={setSelectedPokemon}
            lastPokemonRef={setupObserver}
          />
        </div>
      </main>
      
      {/* Mobile Filter Panel */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300 ${showMobileFilters ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowMobileFilters(false)}></div>
      
      <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-lg z-50 md:hidden transform transition-transform duration-300 ease-in-out ${showMobileFilters ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Filters</h2>
              <button onClick={() => setShowMobileFilters(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <FilterTabs
              activeTab={activeFilterTab}
              setActiveTab={setActiveFilterTab}
              typeCount={filters.types.length}
              moveCount={filters.moves.length}
              otherCount={
                (filters.generation ? 1 : 0) +
                ((filters.weight.min > 0 || (filters.weight.max > 0 && filters.weight.max < 1000)) ? 1 : 0) +
                ((filters.height.min > 0 || (filters.height.max > 0 && filters.height.max < 100)) ? 1 : 0) +
                (filters.hasEvolutions !== null ? 1 : 0)
              }
            />
            
            <div className="mt-4">
              {activeFilterTab === 'types' && (
                <TypesFilter
                  availableTypes={availableTypes}
                  selectedTypes={filters.types}
                  onTypeToggle={(type) => {
                    const newTypes = filters.types.includes(type)
                      ? filters.types.filter(t => t !== type)
                      : [...filters.types, type];
                    handleFilterChange({ ...filters, types: newTypes });
                  }}
                />
              )}
              
              {activeFilterTab === 'moves' && (
                <MovesFilter
                  availableMoves={availableMoves}
                  selectedMoves={filters.moves}
                  searchTerm={moveSearch}
                  onSearchChange={setMoveSearch}
                  onMoveToggle={(move) => {
                    const newMoves = filters.moves.includes(move)
                      ? filters.moves.filter(m => m !== move)
                      : [...filters.moves, move];
                    handleFilterChange({ ...filters, moves: newMoves });
                  }}
                />
              )}
              
              {activeFilterTab === 'other' && (
                <OtherFilters
                  filters={filters}
                  availableGenerations={availableGenerations}
                  onGenerationChange={(generation) => handleFilterChange({...filters, generation})}
                  onWeightChange={(min, max) => handleFilterChange({
                    ...filters,
                    weight: { 
                      min: min ? min * 10 : 0, 
                      max: max ? max * 10 : 1000 
                    }
                  })}
                  onHeightChange={(min, max) => handleFilterChange({
                    ...filters,
                    height: { 
                      min: min ? min * 10 : 0, 
                      max: max ? max * 10 : 100 
                    }
                  })}
                />
              )}
            </div>
          </div>
          
          <div className="p-4 border-t">
            <button
              onClick={() => {
                resetFilters();
                setShowMobileFilters(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200"
            >
              <RefreshCw size={16} />
              <span>Reset All Filters</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Fixed filter button for mobile */}
      <button
        onClick={() => setShowMobileFilters(true)}
        className="fixed bottom-4 right-4 z-20 p-3 bg-blue-500 text-white rounded-full shadow-lg md:hidden flex items-center justify-center">
        <SlidersHorizontal size={24} />
        {getTotalFiltersCount() > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
            {getTotalFiltersCount()}
          </span>
        )}
      </button>
      
      {detailModal}
      
      {/* Gym Leader Challenge Modal */}
      {showGymChallenge && (
        <div className="fixed inset-0 z-50">
          <GymLeaderChallenge onBack={() => setShowGymChallenge(false)} />
        </div>
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
