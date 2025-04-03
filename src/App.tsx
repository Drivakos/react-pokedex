import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PokemonDetail } from './components/PokemonDetail';
import { FilterPanel } from './components/FilterPanel';
import { PokemonList } from './components/PokemonList';
import { SearchBar } from './components/SearchBar';
import { usePokemon } from './hooks/usePokemon';
import { useUI } from './hooks/useUI';
import PokemonPage from './components/PokemonPage';
import { PokedexLayout } from './components/PokedexLayout';
import Footer from './components/Footer';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PokedexHome />} />
        <Route path="/pokemon/:id" element={<PokemonPage />} />
      </Routes>
    </Router>
  );
}

function PokedexHome() {
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
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Content for both layouts
  const pokemonContent = (
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
  );
  
  // Filter panel for both layouts
  const filterPanel = (
    <FilterPanel
      isDesktop={!isMobile}
      filters={filters}
      onFilterChange={handleFilterChange}
      availableTypes={availableTypes}
      availableMoves={availableMoves}
      availableGenerations={availableGenerations}
      isMobileOpen={showFilters}
      setIsMobileOpen={setShowFilters}
    />
  );
  
  // Pokemon detail modal for both layouts
  const detailModal = selectedPokemon && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <PokemonDetail 
        pokemon={selectedPokemon} 
        onClose={() => setSelectedPokemon(null)} 
      />
    </div>
  );
  
  // Mobile Pokedex Layout
  if (isMobile) {
    return (
      <PokedexLayout
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isSearching={isSearching}
        filterCount={getTotalFiltersCount()}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onResetFilters={resetFilters}
      >
        {pokemonContent}
        
        {/* Mobile Filters - fixed positioning */}
        <div>
          <div 
            className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ${showFilters ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setShowFilters(false)}
          />
          {filterPanel}
        </div>
        
        {detailModal}
      </PokedexLayout>
    );
  }

  // Desktop Layout
  return (
    <div className="max-w-screen-xl mx-auto p-4 min-h-screen">
      <Helmet>
        <title>Pokédex | Complete Pokémon Database</title>
        <meta name="description" content="Browse the complete Pokédex with detailed information on all Pokémon including stats, abilities, evolutions, and more." />
        <link rel="canonical" href={`${window.location.origin}/`} />
        
        {/* Open Graph tags */}
        <meta property="og:title" content="Pokédex | Complete Pokémon Database" />
        <meta property="og:description" content="Browse the complete Pokédex with detailed information on all Pokémon including stats, abilities, evolutions, and more." />
        <meta property="og:image" content={`${window.location.origin}/images/pokedex.svg`} />
        <meta property="og:url" content={window.location.origin} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Pokédex" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@pokedex" />
        <meta name="twitter:title" content="Pokédex | Complete Pokémon Database" />
        <meta name="twitter:description" content="Browse the complete Pokédex with detailed information on all Pokémon including stats, abilities, evolutions, and more." />
        <meta name="twitter:image" content={`${window.location.origin}/images/pokedex.svg`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Pokédex",
            "url": window.location.origin,
            "description": "A comprehensive database of all Pokémon with detailed information on stats, abilities, evolutions, and more.",
            "applicationCategory": "Reference",
            "operatingSystem": "Any",
            "copyrightHolder": {
              "@type": "Organization",
              "name": "The Pokémon Company",
              "url": "https://www.pokemon.com/"
            },
            "license": "This is a fan project. Pokémon and Pokémon character names are trademarks of Nintendo. Data provided by PokéAPI and Pokémon TCG API."
          })}
        </script>
      </Helmet>
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
              showFilterButton={true}
            />
            
            {/* Desktop Reset Filters Button - Only show when filters are active */}
            {getTotalFiltersCount() > 0 && (
              <button
                onClick={() => resetFilters()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                <RefreshCw size={16} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Filters Panel */}
      <div className="mb-6">
        {showFilters && filterPanel}
      </div>

      <main className="flex flex-col gap-6">
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
      <Footer />
    </div>
  );
}

export default App;