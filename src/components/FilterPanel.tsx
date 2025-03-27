import React from 'react';
import { X, ChevronDown, RefreshCw } from 'lucide-react';
import { Filters, TYPE_COLORS } from '../types/pokemon';

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
      canMegaEvolve: null,
      hasEvolutions: null,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Filters</h2>
        <button
          onClick={resetFilters}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          Reset All
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Types Filter */}
        <div>
          <h3 className="font-semibold mb-2">Types</h3>
          <div className="flex flex-wrap gap-2">
            {availableTypes.map((type) => (
              <button
                key={type}
                onClick={() => handleTypeToggle(type)}
                className={`${
                  filters.types.includes(type) ? TYPE_COLORS[type] : 'bg-gray-100'
                } px-3 py-1 rounded-full text-sm capitalize ${
                  filters.types.includes(type) ? 'text-white' : 'text-gray-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Moves Filter */}
        <div>
          <h3 className="font-semibold mb-2">Moves</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
            {availableMoves.map((move) => (
              <label key={move} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.moves.includes(move)}
                  onChange={() => handleMoveToggle(move)}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="capitalize">{move.replace('-', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Generation Filter */}
        <div>
          <h3 className="font-semibold mb-2">Generation</h3>
          <select
            className="w-full p-2 border rounded-lg"
            value={filters.generation}
            onChange={(e) => onFilterChange({ ...filters, generation: e.target.value })}
          >
            <option value="">All Generations</option>
            <option value="gen-i">Generation I</option>
            <option value="gen-ii">Generation II</option>
            <option value="gen-iii">Generation III</option>
            <option value="gen-iv">Generation IV</option>
            <option value="gen-v">Generation V</option>
            <option value="gen-vi">Generation VI</option>
            <option value="gen-vii">Generation VII</option>
            <option value="gen-viii">Generation VIII</option>
          </select>
        </div>

        {/* Evolution & Mega Evolution Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Has Evolutions</h3>
            <select
              className="w-full p-2 border rounded-lg"
              value={filters.hasEvolutions === null ? '' : filters.hasEvolutions.toString()}
              onChange={(e) => {
                const value = e.target.value === '' ? null : e.target.value === 'true';
                onFilterChange({ ...filters, hasEvolutions: value });
              }}
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Can Mega Evolve</h3>
            <select
              className="w-full p-2 border rounded-lg"
              value={filters.canMegaEvolve === null ? '' : filters.canMegaEvolve.toString()}
              onChange={(e) => {
                const value = e.target.value === '' ? null : e.target.value === 'true';
                onFilterChange({ ...filters, canMegaEvolve: value });
              }}
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        {/* Size Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Height Range</h3>
            <select
              className="w-full p-2 border rounded-lg"
              value={`${filters.height.min}-${filters.height.max}`}
              onChange={(e) => {
                const [min, max] = e.target.value.split('-').map(Number);
                onFilterChange({
                  ...filters,
                  height: { min, max }
                });
              }}
            >
              <option value="0-0">All Heights</option>
              <option value="0-1">Up to 1m</option>
              <option value="1-2">1m - 2m</option>
              <option value="2-3">2m - 3m</option>
              <option value="3-4">3m - 4m</option>
              <option value="4-999">4m+</option>
            </select>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Weight Range</h3>
            <select
              className="w-full p-2 border rounded-lg"
              value={`${filters.weight.min}-${filters.weight.max}`}
              onChange={(e) => {
                const [min, max] = e.target.value.split('-').map(Number);
                onFilterChange({
                  ...filters,
                  weight: { min, max }
                });
              }}
            >
              <option value="0-0">All Weights</option>
              <option value="0-10">Up to 10kg</option>
              <option value="10-25">10kg - 25kg</option>
              <option value="25-50">25kg - 50kg</option>
              <option value="50-100">50kg - 100kg</option>
              <option value="100-999">100kg+</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};