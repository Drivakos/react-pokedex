import React from 'react';
import { Plus, X } from 'lucide-react';
import { TYPE_COLORS } from '../../types/pokemon';
import { formatName, formatPokemonId, getOfficialArtwork } from '../../utils/helpers';

interface Pokemon {
  id: number;
  name: string;
  types: {
    type: {
      name: string;
    };
  }[];
  sprites?: any; // Add sprites property for image display
}

interface TeamSlotProps {
  position: number;
  pokemon: Pokemon | null;
  onSelect: (position: number) => void;
  onRemove?: (position: number) => void;
  isActive?: boolean;
}

const TeamSlot: React.FC<TeamSlotProps> = ({
  position,
  pokemon,
  onSelect,
  onRemove,
  isActive = false
}) => {
  if (!pokemon) {
    return (
      <div 
        className={`
          aspect-square flex flex-col items-center justify-center bg-gray-50 
          border-2 border-dashed border-gray-300 rounded-lg cursor-pointer
          hover:bg-gray-100 transition-colors p-2
          ${isActive ? 'ring-2 ring-blue-500 shadow-lg' : ''}
        `}
        onClick={() => onSelect(position)}
      >
        <div className="text-center">
          <Plus className="text-gray-400 mb-1 mx-auto" size={24} />
          <span className="text-xs text-gray-500 block">Slot {position}</span>
          <span className="text-xs font-medium text-gray-600">Add Pokémon</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`
        aspect-square relative bg-white rounded-lg overflow-hidden shadow-md 
        hover:shadow-xl cursor-pointer transform transition-all duration-300 
        hover:scale-105 border border-gray-100
        ${isActive ? 'ring-2 ring-blue-500 shadow-lg' : ''}
      `}
      onClick={() => onSelect(position)}
    >
      {/* Position indicator */}
      <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-br z-10">
        {position}
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          className="absolute top-1 right-1 z-10 bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-1"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(position);
          }}
          title="Remove from team"
        >
          <X size={14} />
        </button>
      )}
      
      {/* Pokemon image with gradient background */}
      <div className="relative bg-gradient-to-b from-gray-50 to-gray-100 p-3 flex items-center justify-center h-2/3">
        <span className="absolute top-2 right-2 text-xs font-bold text-gray-500 bg-white/80 px-2 py-0.5 rounded-full">
          {formatPokemonId(pokemon.id)}
        </span>
        <img
          src={getOfficialArtwork(pokemon.sprites) || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
          alt={pokemon.name}
          title={formatName(pokemon.name)}
          className="w-full h-full object-contain transform transition-transform duration-300 hover:scale-110 drop-shadow-md"
          loading="lazy"
        />
      </div>
      
      {/* Pokemon info */}
      <div className="p-2 flex flex-col">
        <h3 className="text-sm font-bold capitalize text-gray-800 truncate">
          {formatName(pokemon.name)}
        </h3>
        
        <div className="flex gap-1 mt-1 flex-wrap">
          {pokemon.types.map((typeInfo) => (
            <span
              key={typeInfo.type.name}
              className={`
                ${TYPE_COLORS[typeInfo.type.name] || 'bg-gray-500'} 
                text-white text-xs px-1.5 py-0.5 rounded-full capitalize
              `}
            >
              {typeInfo.type.name}
            </span>
          ))}
        </div>
      </div>
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  );
};

export default TeamSlot;
