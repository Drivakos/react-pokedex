import React, { memo } from 'react';

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

interface TypesFilterProps {
  availableTypes: string[];
  selectedTypes: string[];
  onTypeToggle: (type: string) => void;
}

export const TypesFilter: React.FC<TypesFilterProps> = memo(({ 
  availableTypes, 
  selectedTypes, 
  onTypeToggle 
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-3 gap-2 overflow-x-hidden">
        {availableTypes.map(type => (
          <button
            key={type}
            onClick={() => onTypeToggle(type)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:opacity-90 mb-2 ${
              selectedTypes.includes(type) 
                ? `${TYPE_COLORS[type as keyof typeof TYPE_COLORS]} text-white` 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
});

export default TypesFilter;
