import React, { memo, useMemo } from 'react';
import { Search } from 'lucide-react';

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

// Neutral backgrounds for all types
const TYPE_BACKGROUND_COLORS = {
  normal: 'bg-gray-100',
  fire: 'bg-gray-100',
  water: 'bg-gray-100',
  electric: 'bg-gray-100',
  grass: 'bg-gray-100',
  ice: 'bg-gray-100',
  fighting: 'bg-gray-100',
  poison: 'bg-gray-100',
  ground: 'bg-gray-100',
  flying: 'bg-gray-100',
  psychic: 'bg-gray-100',
  bug: 'bg-gray-100',
  rock: 'bg-gray-100',
  ghost: 'bg-gray-100',
  dragon: 'bg-gray-100',
  dark: 'bg-gray-100',
  steel: 'bg-gray-100',
  fairy: 'bg-gray-100',
} as const;

// Type icon paths
const TYPE_ICONS = {
  normal: '/icons/types/normal.svg',
  fire: '/icons/types/fire.svg',
  water: '/icons/types/water.svg',
  electric: '/icons/types/electric.svg',
  grass: '/icons/types/grass.svg',
  ice: '/icons/types/ice.svg',
  fighting: '/icons/types/fighting.svg',
  poison: '/icons/types/poison.svg',
  ground: '/icons/types/ground.svg',
  flying: '/icons/types/flying.svg',
  psychic: '/icons/types/psychic.svg',
  bug: '/icons/types/bug.svg',
  rock: '/icons/types/rock.svg',
  ghost: '/icons/types/ghost.svg',
  dragon: '/icons/types/dragon.svg',
  dark: '/icons/types/dark.svg',
  steel: '/icons/types/steel.svg',
  fairy: '/icons/types/fairy.svg',
} as const;

// CSS filters to color the SVG icons by type
const TYPE_ICON_FILTERS = {
  normal: 'brightness(0) saturate(100%) invert(37%) sepia(7%) saturate(0%) hue-rotate(0deg) brightness(60%)',
  fire: 'brightness(0) saturate(100%) invert(24%) sepia(96%) saturate(7471%) hue-rotate(0deg) brightness(60%)',
  water: 'brightness(0) saturate(100%) invert(50%) sepia(100%) saturate(2410%) hue-rotate(190deg) brightness(60%)',
  electric: 'brightness(0) saturate(100%) invert(78%) sepia(100%) saturate(1446%) hue-rotate(25deg) brightness(60%)',
  grass: 'brightness(0) saturate(100%) invert(47%) sepia(100%) saturate(345%) hue-rotate(80deg) brightness(60%)',
  ice: 'brightness(0) saturate(100%) invert(89%) sepia(29%) saturate(1761%) hue-rotate(170deg) brightness(60%)',
  fighting: 'brightness(0) saturate(100%) invert(23%) sepia(100%) saturate(7471%) hue-rotate(0deg) brightness(60%)',
  poison: 'brightness(0) saturate(100%) invert(44%) sepia(100%) saturate(1206%) hue-rotate(258deg) brightness(60%)',
  ground: 'brightness(0) saturate(100%) invert(71%) sepia(100%) saturate(379%) hue-rotate(25deg) brightness(60%)',
  flying: 'brightness(0) saturate(100%) invert(40%) sepia(100%) saturate(2410%) hue-rotate(240deg) brightness(60%)',
  psychic: 'brightness(0) saturate(100%) invert(76%) sepia(100%) saturate(7471%) hue-rotate(300deg) brightness(60%)',
  bug: 'brightness(0) saturate(100%) invert(77%) sepia(44%) saturate(524%) hue-rotate(35deg) brightness(60%)',
  rock: 'brightness(0) saturate(100%) invert(59%) sepia(32%) saturate(316%) hue-rotate(15deg) brightness(60%)',
  ghost: 'brightness(0) saturate(100%) invert(44%) sepia(100%) saturate(1206%) hue-rotate(258deg) brightness(60%)',
  dragon: 'brightness(0) saturate(100%) invert(40%) sepia(100%) saturate(2410%) hue-rotate(240deg) brightness(60%)',
  dark: 'brightness(0) saturate(100%) invert(23%) sepia(7%) saturate(0%) hue-rotate(0deg) brightness(60%)',
  steel: 'brightness(0) saturate(100%) invert(71%) sepia(15%) saturate(423%) hue-rotate(160deg) brightness(60%)',
  fairy: 'brightness(0) saturate(100%) invert(76%) sepia(100%) saturate(7471%) hue-rotate(300deg) brightness(60%)',
} as const;

interface TypesFilterProps {
  availableTypes: string[];
  selectedTypes: string[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onTypeToggle: (type: string) => void;
}

export const TypesFilter: React.FC<TypesFilterProps> = memo(({
  availableTypes,
  selectedTypes,
  searchTerm,
  onSearchChange,
  onTypeToggle
}) => {
  // Memoize filtered types for better performance
  const filteredTypes = useMemo(() => {
    if (!searchTerm) {
      return availableTypes;
    }

    const search = searchTerm.toLowerCase();
    return availableTypes.filter(type =>
      type.toLowerCase().includes(search)
    );
  }, [availableTypes, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search types..."
          className="w-full p-2 pl-10 border border-gray-300 rounded-md"
          data-component-name="PokedexHome"
        />
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
      </div>

      <div className="grid grid-cols-3 gap-2 overflow-x-hidden">
        {filteredTypes.map(type => (
          <button
            key={type}
            onClick={() => onTypeToggle(type)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:opacity-90 mb-2 flex items-center justify-between ${
              selectedTypes.includes(type)
                ? `${TYPE_COLORS[type as keyof typeof TYPE_COLORS]} text-white`
                : `${TYPE_BACKGROUND_COLORS[type as keyof typeof TYPE_BACKGROUND_COLORS]} text-gray-700`
            }`}
          >
            <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
            {!selectedTypes.includes(type) && (
              <img
                src={TYPE_ICONS[type as keyof typeof TYPE_ICONS]}
                alt={`${type} type icon`}
                className="w-5 h-5 ml-2"
                style={{
                  filter: TYPE_ICON_FILTERS[type as keyof typeof TYPE_ICON_FILTERS]
                }}
              />
            )}
          </button>
        ))}
      </div>

      {filteredTypes.length === 0 && searchTerm && (
        <div className="text-center text-gray-500 py-4">
          No types found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
});

export default TypesFilter;
