import React from 'react';
import { TYPE_COLORS, PokemonDetails } from '../../../types/pokemon';
import PokemonImage from '../../common/PokemonImage';
import { formatName } from '../../../utils/helpers';

interface PokemonSearchCardProps {
  pokemon: PokemonDetails;
  isSelected: boolean;
  onSelect: (pokemon: PokemonDetails) => void;
}

const PokemonSearchCard: React.FC<PokemonSearchCardProps> = ({ 
  pokemon, 
  isSelected, 
  onSelect 
}) => {
  return (
    <div
      className={`
        p-4 bg-white border rounded-lg flex flex-col items-center cursor-pointer 
        transition-all duration-200 hover:shadow-md relative h-full
        ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:border-blue-300'}
      `}
      onClick={() => onSelect(pokemon)}
    >
      <div className="w-full flex justify-center relative pb-2">
        <div className="absolute top-0 left-0 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-br z-10">
          #{pokemon.id}
        </div>
        
        {isSelected && (
          <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center z-10">
            ✓
          </div>
        )}
        
        <div className="w-full h-20 sm:h-24 md:h-28 lg:h-24 flex items-center justify-center">
          <PokemonImage
            pokemon={pokemon}
            fallbackId={pokemon.id}
            alt={pokemon.name}
            size="lg"
          />
        </div>
      </div>
      
      <div className="mt-auto text-center w-full">
        <h3 className="text-xs sm:text-sm font-medium capitalize truncate mb-1">
          {formatName(pokemon.name)}
        </h3>
        
        <div className="flex flex-wrap justify-center gap-1">
          {/* Canonical types is string[], the existing logic handles this */} 
          {Array.isArray(pokemon.types) && pokemon.types.map(typeName => { 
            // Handle both string[] and {type:{name:string}}[] format (simplified)
            if (!typeName) return null;
            
            return (
              <span
                key={typeName}
                className={`${TYPE_COLORS[typeName] || 'bg-gray-300'} text-white text-xs px-2 py-0.5 rounded-full capitalize`}
              >
                {typeName}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PokemonSearchCard;
