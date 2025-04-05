import { useState } from 'react';
import { RefreshCw, SlidersHorizontal, X, Search } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PokemonDetail } from './components/PokemonDetail';
import { PokemonList } from './components/PokemonList';
import { SearchBar } from './components/SearchBar';
import { usePokemon } from './hooks/usePokemon';
import { useUI } from './hooks/useUI';
import PokemonPage from './components/PokemonPage';
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
  
  // Filters are hidden by default on both desktop and mobile
  const { lastPokemonElementRef } = useUI();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('types');
  
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
      </Helmet>
      
      <header className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Pokédex</h1>
          
          <div className="flex-1 max-w-2xl">
            <SearchBar 
              value={searchTerm}
              onChange={setSearchTerm}
              isSearching={isSearching}
              onToggleFilters={() => setShowDesktopFilters(!showDesktopFilters)}
              filterCount={getTotalFiltersCount()}
              showFilterButton={false}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDesktopFilters(!showDesktopFilters)}
              className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${getTotalFiltersCount() > 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
              {getTotalFiltersCount() > 0 && (
                <span className="ml-1 bg-white text-blue-500 rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {getTotalFiltersCount()}
                </span>
              )}
            </button>
            
            {getTotalFiltersCount() > 0 && (
              <button
                onClick={resetFilters}
                className="invisible md:visible hidden md:flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200"
              >
                <RefreshCw size={16} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Filters Panel - shown only when toggled */}
      <div className="mb-6 hidden md:block">
        {showDesktopFilters && (
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Filters</h2>
              <button 
                onClick={() => setShowDesktopFilters(false)}
                className="p-2 text-gray-600"
                aria-label="Close filters"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="filter-tabs border-b mb-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveFilterTab('types')} 
                  className={`px-4 py-2 ${activeFilterTab === 'types' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-600'}`}
                >
                  Types
                </button>
                <button 
                  onClick={() => setActiveFilterTab('moves')} 
                  className={`px-4 py-2 ${activeFilterTab === 'moves' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-600'}`}
                >
                  Moves
                </button>
                <button 
                  onClick={() => setActiveFilterTab('other')} 
                  className={`px-4 py-2 ${activeFilterTab === 'other' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-600'}`}
                >
                  Other
                </button>
              </div>
            </div>
            
            <div className="filter-content">
              {activeFilterTab === 'types' && (
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {availableTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        const newTypes = filters.types.includes(type)
                          ? filters.types.filter(t => t !== type)
                          : [...filters.types, type];
                        handleFilterChange({ ...filters, types: newTypes });
                      }}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:opacity-90 mb-2 ${
                        filters.types.includes(type) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              )}
              
              {activeFilterTab === 'moves' && (
                <div className="moves-filter">
                  <div className="mb-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search moves..."
                        className="w-full p-2 pl-10 border border-gray-300 rounded-md"
                      />
                      <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {availableMoves.slice(0, 10).map(move => (
                      <button
                        key={move}
                        onClick={() => {
                          const newMoves = filters.moves.includes(move)
                            ? filters.moves.filter(m => m !== move)
                            : [...filters.moves, move];
                          handleFilterChange({ ...filters, moves: newMoves });
                        }}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:opacity-90 mb-2 ${
                          filters.moves.includes(move) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {move.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {activeFilterTab === 'other' && (
                <div className="other-filters flex flex-col md:flex-row md:gap-6 space-y-4 md:space-y-0">
                  <div className="generation-filter md:w-1/3">
                    <h3 className="font-medium mb-2">Generation</h3>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={filters.generation}
                      onChange={(e) => handleFilterChange({...filters, generation: e.target.value})}
                    >
                      <option value="">All Generations</option>
                      {availableGenerations.map(gen => (
                        <option key={gen} value={gen}>
                          Generation {gen}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="weight-filter md:w-1/3">
                    <h3 className="font-medium mb-2">Weight Range (kg)</h3>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="Min" 
                        className="w-1/2 p-2 border border-gray-300 rounded-md"
                        value={filters.weight.min || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : Number(e.target.value);
                          handleFilterChange({...filters, weight: {...filters.weight, min: value}})
                        }}
                      />
                      <input 
                        type="number" 
                        placeholder="Max" 
                        className="w-1/2 p-2 border border-gray-300 rounded-md"
                        value={filters.weight.max || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : Number(e.target.value);
                          handleFilterChange({...filters, weight: {...filters.weight, max: value}})
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="height-filter md:w-1/3">
                    <h3 className="font-medium mb-2">Height Range (m)</h3>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="Min" 
                        className="w-1/2 p-2 border border-gray-300 rounded-md"
                        value={filters.height.min || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : Number(e.target.value);
                          handleFilterChange({...filters, height: {...filters.height, min: value}})
                        }}
                      />
                      <input 
                        type="number" 
                        placeholder="Max" 
                        className="w-1/2 p-2 border border-gray-300 rounded-md"
                        value={filters.height.max || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : Number(e.target.value);
                          handleFilterChange({...filters, height: {...filters.height, max: value}})
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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

      {/* Mobile Filters */}
      <div>
        {/* Mobile overlay */}
        {showMobileFilters && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setShowMobileFilters(false)}
          />
        )}
        
        {/* Mobile filter panel */}
        <div className={`fixed inset-y-0 right-0 w-80 bg-white p-4 shadow-lg transform transition-transform duration-300 ease-in-out z-40 h-full ${showMobileFilters ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Filters</h2>
            <button 
              onClick={() => setShowMobileFilters(false)}
              className="p-2 text-gray-600"
              aria-label="Close filters"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="filter-tabs border-b mb-4">
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveFilterTab('types')} 
                className={`px-4 py-2 ${activeFilterTab === 'types' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-600'}`}
              >
                Types
              </button>
              <button 
                onClick={() => setActiveFilterTab('moves')} 
                className={`px-4 py-2 ${activeFilterTab === 'moves' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-600'}`}
              >
                Moves
              </button>
              <button 
                onClick={() => setActiveFilterTab('other')} 
                className={`px-4 py-2 ${activeFilterTab === 'other' ? 'border-b-2 border-blue-500 text-blue-500 font-medium' : 'text-gray-600'}`}
              >
                Other
              </button>
            </div>
          </div>
          
          <div className="filter-content overflow-y-auto pb-20">
            {activeFilterTab === 'types' && (
              <div className="grid grid-cols-3 gap-2">
                {availableTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      const newTypes = filters.types.includes(type)
                        ? filters.types.filter(t => t !== type)
                        : [...filters.types, type];
                      handleFilterChange({ ...filters, types: newTypes });
                    }}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:opacity-90 mb-2 ${
                      filters.types.includes(type) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            )}
            
            {activeFilterTab === 'moves' && (
              <div className="moves-filter">
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search moves..."
                      className="w-full p-2 pl-10 border border-gray-300 rounded-md"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {availableMoves.slice(0, 10).map(move => (
                    <button
                      key={move}
                      onClick={() => {
                        const newMoves = filters.moves.includes(move)
                          ? filters.moves.filter(m => m !== move)
                          : [...filters.moves, move];
                        handleFilterChange({ ...filters, moves: newMoves });
                      }}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:opacity-90 mb-2 ${
                        filters.moves.includes(move) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {move.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {activeFilterTab === 'other' && (
              <div className="other-filters flex flex-col md:flex-row md:gap-6 space-y-4 md:space-y-0">
                <div className="generation-filter md:w-1/3">
                  <h3 className="font-medium mb-2">Generation</h3>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={filters.generation}
                    onChange={(e) => handleFilterChange({...filters, generation: e.target.value})}
                  >
                    <option value="">All Generations</option>
                    {availableGenerations.map(gen => (
                      <option key={gen} value={gen}>
                        Generation {gen}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="weight-filter md:w-1/3">
                  <h3 className="font-medium mb-2">Weight Range (kg)</h3>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Min" 
                      className="w-1/2 p-2 border border-gray-300 rounded-md"
                      value={filters.weight.min || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                        handleFilterChange({...filters, weight: {...filters.weight, min: value}})
                      }}
                    />
                    <input 
                      type="number" 
                      placeholder="Max" 
                      className="w-1/2 p-2 border border-gray-300 rounded-md"
                      value={filters.weight.max || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                        handleFilterChange({...filters, weight: {...filters.weight, max: value}})
                      }}
                    />
                  </div>
                </div>
                
                <div className="height-filter md:w-1/3">
                  <h3 className="font-medium mb-2">Height Range (m)</h3>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Min" 
                      className="w-1/2 p-2 border border-gray-300 rounded-md"
                      value={filters.height.min || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                        handleFilterChange({...filters, height: {...filters.height, min: value}})
                      }}
                    />
                    <input 
                      type="number" 
                      placeholder="Max" 
                      className="w-1/2 p-2 border border-gray-300 rounded-md"
                      value={filters.height.max || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                        handleFilterChange({...filters, height: {...filters.height, max: value}})
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Reset button at bottom */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
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
      <Footer />
    </div>
  );
}

export default App;
