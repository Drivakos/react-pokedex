import React, { useState } from 'react';
import { RefreshCw, ChevronDown, Search } from 'lucide-react';
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
}

// Add helper function to format move names
const formatMoveName = (move: string): string => {
  return move
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  availableTypes,
  availableMoves,
  availableGenerations,
}) => {
  const [activeTab, setActiveTab] = useState<'types' | 'moves' | 'other'>('types');
  const [moveSearch, setMoveSearch] = useState('');
  const [showAllMoves, setShowAllMoves] = useState(false);

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
        min: min ? min * 10 : 0, // Convert kg to hectograms
        max: max ? max * 10 : 1000 // Convert kg to hectograms
      },
    });
  };

  const handleHeightChange = (min: number | null, max: number | null) => {
    onFilterChange({
      ...filters,
      height: { 
        min: min ? min * 10 : 0, // Convert meters to decimeters
        max: max ? max * 10 : 100 // Convert meters to decimeters
      },
    });
  };

  const resetFilters = () => {
    onFilterChange({
      types: [],
      moves: [],
      generation: '',
      weight: { min: 0, max: 1000 }, // 100kg in hectograms
      height: { min: 0, max: 100 }, // 10m in decimeters
      hasEvolutions: null
    });
    setMoveSearch('');
  };

  const getTypeFiltersCount = () => filters.types.length;

  const getMoveFiltersCount = () => filters.moves.length;

  const getOtherFiltersCount = () => {
    let count = 0;
    if (filters.generation) count++;
    if (filters.weight.min > 0 || filters.weight.max < 1000) count++;
    if (filters.height.min > 0 || filters.height.max < 100) count++;
    if (filters.hasEvolutions !== null) count++;
    return count;
  };

  const filteredMoves = availableMoves
    .filter(move => formatMoveName(move).toLowerCase().includes(moveSearch.toLowerCase()))
    .slice(0, showAllMoves ? undefined : 20);

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg space-y-4 mb-4 md:mb-6">
      {/* Header with Reset */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Filters</h2>
        <button
          onClick={resetFilters}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <RefreshCw size={16} />
          Reset
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 ${
            activeTab === 'types'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('types')}
        >
          Types {getTypeFiltersCount() > 0 && `(${getTypeFiltersCount()})`}
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === 'moves'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('moves')}
        >
          Moves {getMoveFiltersCount() > 0 && `(${getMoveFiltersCount()})`}
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === 'other'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('other')}
        >
          Other {getOtherFiltersCount() > 0 && `(${getOtherFiltersCount()})`}
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'types' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
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
            <div className="relative">
              <input
                type="text"
                value={moveSearch}
                onChange={(e) => setMoveSearch(e.target.value)}
                placeholder="Search moves..."
                className="w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
            </div>

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
  );
};