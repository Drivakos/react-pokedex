import React, { useState, useEffect, useCallback, memo } from 'react';
import { RefreshCw, ChevronDown, Search, X } from 'lucide-react';
import { Filters } from '../types/pokemon';

// Add type colors mapping
const TYPE_COLORS = {
  normal: 'bg-gray-400',
  fire: 'bg-red-500',
  water: 'bg-blue-500',
  electric: 'bg-yellow-400',
  grass: 'bg-green-500',
  ice: 'bg-blue-200',
  fighting: 'bg-red-700',
  poison: 'bg-purple-500',
  ground: 'bg-yellow-600',
  flying: 'bg-indigo-400',
  psychic: 'bg-pink-500',
  bug: 'bg-lime-500',
  rock: 'bg-yellow-800',
  ghost: 'bg-purple-700',
  dragon: 'bg-indigo-700',
  dark: 'bg-gray-700',
  steel: 'bg-gray-500',
  fairy: 'bg-pink-300',
} as const;

interface FilterPanelProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  availableTypes: string[];
  availableMoves: string[];
  availableGenerations: string[];
  isDesktop?: boolean;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

// Add helper function to format move names
const formatMoveName = (move: string): string => {
  return move
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Extract SearchMovesInput to prevent focus loss
const SearchMovesInput = memo(({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search moves..."
        className="w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        data-component-name="PokedexHome"
      />
      <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
    </div>
  );
});

// Extract FilterContent outside of FilterPanel
interface FilterContentProps {
  isDesktop?: boolean;
  activeTab: 'types' | 'moves' | 'other';
  setActiveTab: (tab: 'types' | 'moves' | 'other') => void;
  filters: Filters;
  moveSearch: string;
  setMoveSearch: (value: string) => void;
  availableTypes: string[];
  availableMoves: string[];
  availableGenerations: string[];
  filteredMoves: string[];
  showAllMoves: boolean;
  setShowAllMoves: (show: boolean) => void;
  handleTypeToggle: (type: string) => void;
  handleMoveToggle: (move: string) => void;
  handleGenerationChange: (generation: string) => void;
  handleWeightChange: (min: number | null, max: number | null) => void;
  handleHeightChange: (min: number | null, max: number | null) => void;
  resetFilters: () => void;
  getTypeFiltersCount: () => number;
  getMoveFiltersCount: () => number;
  getOtherFiltersCount: () => number;
  getTotalFiltersCount: () => number;
  handleMobileClose: (open: boolean) => void;
}

const FilterContent = memo(({ 
  isDesktop = false,
  activeTab,
  setActiveTab,
  filters,
  moveSearch,
  setMoveSearch,
  availableTypes,
  availableMoves,
  availableGenerations,
  filteredMoves,
  showAllMoves,
  setShowAllMoves,
  handleTypeToggle,
  handleMoveToggle,
  handleGenerationChange,
  handleWeightChange,
  handleHeightChange,
  resetFilters,
  getTypeFiltersCount,
  getMoveFiltersCount,
  getOtherFiltersCount,
  getTotalFiltersCount,
  handleMobileClose
}: FilterContentProps) => {
  return (
    <div className={`bg-white ${isDesktop ? 'p-4 rounded-lg' : 'h-full'} flex flex-col relative`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Filters</h2>
        <div className="flex items-center">
          <button
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 md:flex hidden whitespace-nowrap"
            onClick={resetFilters}
          >
            <RefreshCw size={16} /><span>Reset</span>
          </button>
          <button
            onClick={() => handleMobileClose(false)}
            className="md:hidden text-gray-600 hover:text-gray-800 ml-4 p-2"
            aria-label="Close filters"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 mt-4 overflow-y-auto pb-16">
        {/* Filter Tabs */}
        <div className="flex border-b overflow-x-auto no-scrollbar w-full">
          <button
            className={`px-3 py-2 flex-shrink-0 min-w-0 ${
              activeTab === 'types'
                ? 'border-b-2 border-blue-500 text-blue-500 font-medium'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('types')}
          >
            <span className="truncate">Types{getTypeFiltersCount() > 0 ? ` (${getTypeFiltersCount()})` : ''}</span>
          </button>
          <button
            className={`px-3 py-2 flex-shrink-0 min-w-0 ${
              activeTab === 'moves'
                ? 'border-b-2 border-blue-500 text-blue-500 font-medium'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('moves')}
          >
            <span className="truncate">Moves{getMoveFiltersCount() > 0 ? ` (${getMoveFiltersCount()})` : ''}</span>
          </button>
          <button
            className={`px-3 py-2 flex-shrink-0 min-w-0 ${
              activeTab === 'other'
                ? 'border-b-2 border-blue-500 text-blue-500 font-medium'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('other')}
          >
            <span className="truncate">Other{getOtherFiltersCount() > 0 ? ` (${getOtherFiltersCount()})` : ''}</span>
          </button>
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {activeTab === 'types' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 overflow-x-hidden">
                {availableTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => handleTypeToggle(type)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:opacity-90 mb-2 ${
                      filters.types.includes(type)
                        ? `${TYPE_COLORS[type as keyof typeof TYPE_COLORS]} text-white`
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'moves' && (
            <div className="space-y-4">
              {/* Move Search */}
              <SearchMovesInput value={moveSearch} onChange={setMoveSearch} />

              {/* Move List */}
              <div className="max-h-60 overflow-y-auto space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {filteredMoves.map(move => (
                    <button
                      key={move}
                      onClick={() => handleMoveToggle(move)}
                      className={`${
                        filters.moves.includes(move)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700'
                      } px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:opacity-90 mb-2 text-left truncate`}
                    >
                      {formatMoveName(move)}
                    </button>
                  ))}
                </div>
                {!showAllMoves && availableMoves.length > 20 && (
                  <button
                    onClick={() => setShowAllMoves(true)}
                    className="w-full text-blue-500 hover:text-blue-600 flex items-center justify-center gap-1 mt-2"
                  >
                    Show all moves <ChevronDown size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'other' && (
            <div className="space-y-4">
              {/* Generation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generation
                </label>
                <select
                  value={filters.generation}
                  onChange={(e) => handleGenerationChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Generations</option>
                  {availableGenerations.map(gen => (
                    <option key={gen} value={gen}>
                      {gen.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Weight Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight Range (kg)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Min"
                    value={filters.weight.min / 10} // Convert hectograms to kg
                    onChange={(e) => handleWeightChange(e.target.value ? Number(e.target.value) : null, filters.weight.max / 10)}
                    className="w-1/2 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Max"
                    value={filters.weight.max === 1000 ? '' : filters.weight.max / 10} // Convert hectograms to kg
                    onChange={(e) => handleWeightChange(filters.weight.min / 10, e.target.value ? Number(e.target.value) : null)}
                    className="w-1/2 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Height Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height Range (m)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Min"
                    value={filters.height.min / 10} // Convert decimeters to meters
                    onChange={(e) => handleHeightChange(e.target.value ? Number(e.target.value) : null, filters.height.max / 10)}
                    className="w-1/2 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Max"
                    value={filters.height.max === 100 ? '' : filters.height.max / 10} // Convert decimeters to meters
                    onChange={(e) => handleHeightChange(filters.height.min / 10, e.target.value ? Number(e.target.value) : null)}
                    className="w-1/2 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Reset Button - Fixed at bottom */}
      <button
        onClick={resetFilters}
        className="md:hidden w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors sticky bottom-0 shadow-lg"
      >
        <RefreshCw size={16} />
        Reset all filters {getTotalFiltersCount() > 0 && `(${getTotalFiltersCount()})`}
      </button>
    </div>
  );
});

export const FilterPanel: React.FC<FilterPanelProps> = ({ 
  filters, 
  onFilterChange, 
  availableTypes, 
  availableMoves, 
  availableGenerations,
  isDesktop = false,
  isMobileOpen = false,
  setIsMobileOpen = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<'types' | 'moves' | 'other'>('types');
  const [moveSearch, setMoveSearch] = useState('');
  const [debouncedMoveSearch, setDebouncedMoveSearch] = useState('');
  const [showAllMoves, setShowAllMoves] = useState(false);
  const searchTimeoutRef = React.useRef<number>();

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      setDebouncedMoveSearch(moveSearch);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [moveSearch]);

  const handleTypeToggle = (type: string) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    onFilterChange({ ...filters, types: newTypes });
  };

  const handleMoveToggle = (move: string) => {
    const newMoves = filters.moves.includes(move)
      ? filters.moves.filter(m => m !== move)
      : [...filters.moves, move];
    onFilterChange({ ...filters, moves: newMoves });
  };

  const handleGenerationChange = (generation: string) => {
    onFilterChange({ ...filters, generation });
  };

  const handleWeightChange = (min: number | null, max: number | null) => {
    onFilterChange({
      ...filters,
      weight: { 
        min: min ? min * 10 : 0, 
        max: max ? max * 10 : 1000 
      },
    });
  };

  const handleHeightChange = (min: number | null, max: number | null) => {
    onFilterChange({
      ...filters,
      height: { 
        min: min ? min * 10 : 0, 
        max: max ? max * 10 : 100 
      },
    });
  };

  const resetFilters = () => {
    onFilterChange({
      types: [],
      moves: [],
      generation: '',
      weight: { min: 0, max: 0 }, 
      height: { min: 0, max: 0 }, 
      hasEvolutions: null
    });
    setMoveSearch('');
  };

  const getTypeFiltersCount = () => filters.types.length;

  const getMoveFiltersCount = () => filters.moves.length;

  const getOtherFiltersCount = () => {
    let count = 0;
    if (filters.generation) count++;
    if (filters.weight.min > 0 || (filters.weight.max > 0 && filters.weight.max < 1000)) count++;
    if (filters.height.min > 0 || (filters.height.max > 0 && filters.height.max < 100)) count++;
    if (filters.hasEvolutions !== null) count++;
    return count;
  };

  const getTotalFiltersCount = () => {
    return getTypeFiltersCount() + getMoveFiltersCount() + getOtherFiltersCount();
  };

  const filteredMoves = availableMoves
    .filter(move => formatMoveName(move).toLowerCase().includes(debouncedMoveSearch.toLowerCase()))
    .slice(0, showAllMoves ? undefined : 20);

  // Define our callback handlers
  const handleMoveSearchCallback = useCallback((value: string) => {
    setMoveSearch(value);
  }, []);

  // Don't render anything if we're on mobile and the panel is closed
  if (!isDesktop && !isMobileOpen) {
    return null;
  }
  
  return (
    <>
      {/* Filter Panel */}
      <div
        className={`${isDesktop ? '' : 'fixed'} md:relative inset-y-0 right-0 w-80 md:w-auto bg-white p-4 shadow-lg z-50 h-full md:h-auto ${isDesktop ? '' : 'transform transition-transform duration-300 ease-in-out'} ${!isDesktop && !isMobileOpen ? 'translate-x-full' : ''}`}
      >
        <FilterContent 
          isDesktop={isDesktop}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          filters={filters}
          moveSearch={moveSearch}
          setMoveSearch={handleMoveSearchCallback}
          availableTypes={availableTypes}
          availableMoves={availableMoves}
          availableGenerations={availableGenerations}
          filteredMoves={filteredMoves}
          showAllMoves={showAllMoves}
          setShowAllMoves={setShowAllMoves}
          handleTypeToggle={handleTypeToggle}
          handleMoveToggle={handleMoveToggle}
          handleGenerationChange={handleGenerationChange}
          handleWeightChange={handleWeightChange}
          handleHeightChange={handleHeightChange}
          resetFilters={resetFilters}
          getTypeFiltersCount={getTypeFiltersCount}
          getMoveFiltersCount={getMoveFiltersCount}
          getOtherFiltersCount={getOtherFiltersCount}
          getTotalFiltersCount={getTotalFiltersCount}
          handleMobileClose={setIsMobileOpen}
        />
      </div>
    </>
  );
};