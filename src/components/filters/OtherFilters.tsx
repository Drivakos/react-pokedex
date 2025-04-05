import React, { memo } from 'react';
import { Filters } from '../../types/pokemon';

interface OtherFiltersProps {
  filters: Filters;
  availableGenerations: string[];
  onGenerationChange: (generation: string) => void;
  onWeightChange: (min: number | null, max: number | null) => void;
  onHeightChange: (min: number | null, max: number | null) => void;
}

export const OtherFilters: React.FC<OtherFiltersProps> = memo(({
  filters,
  availableGenerations,
  onGenerationChange,
  onWeightChange,
  onHeightChange
}) => {
  return (
    <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-3 md:gap-4" data-component-name="_c">
      {/* Generation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Generation
        </label>
        <select
          value={filters.generation}
          onChange={(e) => onGenerationChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
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
            placeholder="Min" 
            className="w-1/2 p-2 border border-gray-300 rounded-md"
            value={filters.weight.min ? filters.weight.min / 10 : ''}
            onChange={(e) => {
              const value = e.target.value === '' ? null : Number(e.target.value);
              onWeightChange(value, filters.weight.max ? filters.weight.max / 10 : null);
            }}
          />
          <input 
            type="number" 
            placeholder="Max" 
            className="w-1/2 p-2 border border-gray-300 rounded-md"
            value={filters.weight.max ? filters.weight.max / 10 : ''}
            onChange={(e) => {
              const value = e.target.value === '' ? null : Number(e.target.value);
              onWeightChange(filters.weight.min ? filters.weight.min / 10 : null, value);
            }}
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
            placeholder="Min" 
            className="w-1/2 p-2 border border-gray-300 rounded-md"
            value={filters.height.min ? filters.height.min / 10 : ''}
            onChange={(e) => {
              const value = e.target.value === '' ? null : Number(e.target.value);
              onHeightChange(value, filters.height.max ? filters.height.max / 10 : null);
            }}
          />
          <input 
            type="number" 
            placeholder="Max" 
            className="w-1/2 p-2 border border-gray-300 rounded-md"
            value={filters.height.max ? filters.height.max / 10 : ''}
            onChange={(e) => {
              const value = e.target.value === '' ? null : Number(e.target.value);
              onHeightChange(filters.height.min ? filters.height.min / 10 : null, value);
            }}
          />
        </div>
      </div>
    </div>
  );
});

export default OtherFilters;
