import React from 'react';
import { RefreshCw } from 'lucide-react';
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
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  availableTypes,
  availableMoves,
}) => {
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

  const resetFilters = () => {
    onFilterChange({
      types: [],
      moves: [],
      generation: '',
      weight: { min: 0, max: 0 },
      height: { min: 0, max: 0 },
      hasEvolutions: null,
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Filters</h2>
        <button
          onClick={resetFilters}
          className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
        >
          <RefreshCw size={16} />
          Reset
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Types</h3>
          <div className="flex flex-wrap gap-2">
            {availableTypes.map(type => (
              <button
                key={type}
                onClick={() => handleTypeToggle(type)}
                className={`${
                  filters.types.includes(type) ? TYPE_COLORS[type as keyof typeof TYPE_COLORS] : 'bg-gray-100'
                } px-3 py-1 rounded-full text-sm capitalize ${
                  filters.types.includes(type) ? 'text-white' : 'text-gray-700'
                } transition-colors duration-200 hover:opacity-90`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Weight (kg)</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Min</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={filters.weight.min ? (filters.weight.min / 10).toFixed(1) : ''}
                onChange={(e) => onFilterChange({
                  ...filters,
                  weight: { ...filters.weight, min: Math.round(parseFloat(e.target.value) * 10) || 0 }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Max</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={filters.weight.max ? (filters.weight.max / 10).toFixed(1) : ''}
                onChange={(e) => onFilterChange({
                  ...filters,
                  weight: { ...filters.weight, max: Math.round(parseFloat(e.target.value) * 10) || 0 }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Height (decimeters)</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Min</label>
              <input
                type="number"
                min="0"
                value={filters.height.min || ''}
                onChange={(e) => onFilterChange({
                  ...filters,
                  height: { ...filters.height, min: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Max</label>
              <input
                type="number"
                min="0"
                value={filters.height.max || ''}
                onChange={(e) => onFilterChange({
                  ...filters,
                  height: { ...filters.height, max: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Evolution</h3>
          <div className="flex gap-4">
            <button
              onClick={() => onFilterChange({
                ...filters,
                hasEvolutions: filters.hasEvolutions === true ? null : true
              })}
              className={`flex-1 px-4 py-2 rounded-lg border ${
                filters.hasEvolutions === true
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Has Evolutions
            </button>
            <button
              onClick={() => onFilterChange({
                ...filters,
                hasEvolutions: filters.hasEvolutions === false ? null : false
              })}
              className={`flex-1 px-4 py-2 rounded-lg border ${
                filters.hasEvolutions === false
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              No Evolutions
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Generation</h3>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Moves</h3>
          <div className="flex flex-wrap gap-2">
            {availableMoves.map(move => (
              <button
                key={move}
                onClick={() => handleMoveToggle(move)}
                className={`${
                  filters.moves.includes(move) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                } px-3 py-1 rounded-full text-sm transition-colors duration-200 hover:opacity-90`}
              >
                {move}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};