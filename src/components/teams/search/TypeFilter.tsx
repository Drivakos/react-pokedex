import React from 'react';
import { TYPE_COLORS } from '../../../types/pokemon';

interface TypeFilterProps {
  selectedTypes: string[];
  onTypeToggle: (type: string) => void;
}

const POKEMON_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 
  'fighting', 'poison', 'ground', 'flying', 'psychic', 
  'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];

const TypeFilter: React.FC<TypeFilterProps> = ({ selectedTypes, onTypeToggle }) => {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Type</h3>
      <div className="flex flex-wrap gap-2">
        {POKEMON_TYPES.map(type => (
          <button
            key={type}
            onClick={() => onTypeToggle(type)}
            className={`
              px-3 py-1 rounded-full text-xs font-medium capitalize transition-all
              ${selectedTypes.includes(type) 
                ? `${TYPE_COLORS[type] || 'bg-gray-700'} text-white ring-2 ring-offset-1 ring-gray-300` 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
            `}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TypeFilter;
