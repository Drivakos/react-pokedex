import { useState } from 'react';
import { SlidersHorizontal, RefreshCw } from 'lucide-react';
import { PokemonDetail } from './components/PokemonDetail';
import { FilterPanel } from './components/FilterPanel';
import { PokemonList } from './components/PokemonList';
import { SearchBar } from './components/SearchBar';
import { usePokemon } from './hooks/usePokemon';
import { useUI } from './hooks/useUI';


function App() {
  // Use our custom hooks
  const { 
    displayedPokemon,
    hasMore,
    loading,
    loadingProgress,
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
  
  // Show filters by default on desktop, hidden on mobile
  const { lastPokemonElementRef } = useUI();
  const [showFilters, setShowFilters] = useState(true);

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

  return (
    <div className="max-w-screen-xl mx-auto p-4 min-h-screen">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-center mb-6">Pokédex</h1>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 flex items-center gap-2">
            <SearchBar 
              value={searchTerm}
              onChange={setSearchTerm}
              onToggleFilters={() => setShowFilters(!showFilters)}
              filterCount={getTotalFiltersCount()}
              isSearching={isSearching}
              showFilterButton={false} // Hide filter toggle on mobile
            />
            
            {/* Desktop Reset Filters Button - Only show when filters are active */}
            {getTotalFiltersCount() > 0 && (
              <button
                onClick={() => resetFilters()}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                <RefreshCw size={16} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Filters Panel */}
      <div className="mb-6 hidden md:block">
        {showFilters && (
          <FilterPanel
            isDesktop={true}
            filters={filters}
            onFilterChange={handleFilterChange}
            availableTypes={availableTypes}
            availableMoves={availableMoves}
            availableGenerations={availableGenerations}
            isMobileOpen={false}
            setIsMobileOpen={() => {}}
          />
        )}
      </div>

      <main className="flex flex-col gap-6">
        {/* Mobile Filter Button - Fixed */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="fixed bottom-4 right-4 md:hidden z-50 bg-blue-500 text-white p-3 rounded-full shadow-lg flex items-center justify-center"
        >
          <SlidersHorizontal size={24} />
          {getTotalFiltersCount() > 0 && (
            <span className="bg-white text-blue-500 px-1.5 py-0.5 rounded-full text-xs font-bold ml-1">
              {getTotalFiltersCount()}
            </span>
          )}
        </button>
        
        {/* Mobile Filters - fixed positioning */}
        <div className="md:hidden">
          <div 
            className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ${showFilters ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setShowFilters(false)}
          />
          <FilterPanel
            isDesktop={false}
            filters={filters}
            onFilterChange={handleFilterChange}
            availableTypes={availableTypes}
            availableMoves={availableMoves}
            availableGenerations={availableGenerations}
            isMobileOpen={showFilters}
            setIsMobileOpen={setShowFilters}
          />
        </div>

        {/* Pokemon Grid */}
        <div className="flex-1">
          {loading && loadingProgress < 100 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <div className="w-full max-w-xs bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-blue-500 h-4 transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="mt-2 text-gray-600">Loading Pokémon...</p>
            </div>
          ) : displayedPokemon.length > 0 ? (
            <PokemonList 
              pokemon={displayedPokemon}
              onSelectPokemon={setSelectedPokemon}
              lastPokemonRef={setupObserver}
              isLoading={loading}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xl text-gray-600 mb-2">No Pokémon found</p>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </main>

      {/* Pokemon Detail Modal */}
      {selectedPokemon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <PokemonDetail 
            pokemon={selectedPokemon} 
            onClose={() => setSelectedPokemon(null)} 
          />
        </div>
      )}
    </div>
  );
}

export default App;