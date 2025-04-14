import React, { memo } from 'react';
import { Pokemon } from '../types/pokemon';
import { TYPE_COLORS } from '../types/pokemon';
import { formatName, formatPokemonId, getOfficialArtwork } from '../utils/helpers';

interface PokemonCardProps {
  pokemon: Pokemon;
  onClick: () => void;
}

export const PokemonCard: React.FC<PokemonCardProps> = memo(({ pokemon, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl cursor-pointer transform transition-all duration-300 hover:scale-105 h-[320px] flex flex-col border border-gray-100 relative group"
    >
      <div className="relative bg-gradient-to-b from-gray-50 to-gray-100 p-4">
        <span className="absolute top-2 right-2 text-xs font-bold text-gray-500 bg-white/80 px-2 py-1 rounded-full">
          {formatPokemonId(pokemon.id)}
        </span>
        <img
          src={getOfficialArtwork(pokemon.sprites)}
          alt={pokemon.name}
          title={`${formatName(pokemon.name)} - ${formatPokemonId(pokemon.id)}`}
          className="w-full h-40 object-contain transform transition-transform duration-300 group-hover:scale-110 drop-shadow-md"
          loading="lazy"
        />
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold capitalize text-gray-800">
          <span className="line-clamp-1">
            {formatName(pokemon.name)}
          </span>
        </h3>
        
        <div className="flex gap-2 mt-2">
          {pokemon.types.map((type) => (
            <span
              key={type}
              className={`${TYPE_COLORS[type]} text-white px-2 py-1 rounded-full text-xs font-medium capitalize shadow-sm`}
            >
              {type}
            </span>
          ))}
        </div>
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  );
});
