import React from 'react';
import { Plus, X } from 'lucide-react';
import { TYPE_COLORS } from '../../types/pokemon';
import { formatName, getOfficialArtwork } from '../../utils/helpers';

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
          aspect-square flex items-center justify-center bg-gray-50 
          border border-dashed border-gray-200 rounded cursor-pointer
          hover:bg-gray-100 transition-colors
          ${isActive ? 'ring-1 ring-blue-400' : ''}
        `}
        onClick={() => onSelect(position)}
      >
        <div className="text-center">
          <Plus className="text-gray-400 mx-auto" size={16} />
          <span className="text-xs text-gray-400 mt-1 block">{position}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`
        aspect-square relative bg-white rounded
        cursor-pointer border border-gray-100
        ${isActive ? 'ring-1 ring-blue-400' : ''}
      `}
      onClick={() => onSelect(position)}
    >
      {/* Position indicator */}
      <div className="absolute top-0 left-0 bg-blue-400 text-white text-xs w-4 h-4 flex items-center justify-center z-10">
        {position}
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          className="absolute top-0 right-0 z-10 bg-white/80 text-gray-500 hover:text-red-500 w-5 h-5 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(position);
          }}
          title="Remove"
        >
          <X size={12} />
        </button>
      )}
      
      {/* Pokemon image - reduced height */}
      <div className="flex items-center justify-center h-2/3 bg-gray-50 relative overflow-hidden">
        <img
          src={getOfficialArtwork(pokemon.sprites) || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
          alt={pokemon.name}
          title={formatName(pokemon.name)}
          className="w-full h-full object-contain p-1"
          loading="lazy"
        />
      </div>
      
      {/* Pokemon info - increased height */}
      <div className="px-1 py-1 h-1/3 flex flex-col justify-between bg-white">
        {/* Pokemon name and ID */}
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-medium capitalize text-gray-700 truncate max-w-[70%]">
            {formatName(pokemon.name)}
          </h3>
          <span className="text-xs text-gray-400 flex-shrink-0">
            #{pokemon.id}
          </span>
        </div>
        
        {/* Type badges */}
        <div className="flex flex-wrap gap-0.5 mt-1">
          {pokemon.types.slice(0, 2).map((typeInfo) => (
            <span
              key={typeInfo.type.name}
              className={`
                ${TYPE_COLORS[typeInfo.type.name] || 'bg-gray-500'} 
                text-white text-[7px] px-1 py-0 rounded-sm capitalize inline-block
              `}
            >
              {typeInfo.type.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(TeamSlot);
