import React, { memo } from 'react';
import { Pokemon } from '../types/pokemon';
import { TYPE_COLORS } from '../types/pokemon';
import { formatName, formatPokemonId } from '../utils/helpers';
import PokemonImage from './PokemonImage';

export interface MemoryCardProps {
  pokemon: Pokemon;
  isFlipped: boolean;
  isMatched: boolean;
  onClick: () => void;
  disabled?: boolean;
}

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
        <PokemonImage
          pokemonId={pokemon.id}
          alt={pokemon.name}
          title={`${formatName(pokemon.name)} - ${formatPokemonId(pokemon.id)}`}
          className="w-full h-40 object-contain transform transition-transform duration-300 group-hover:scale-110 drop-shadow-md"
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

export const MemoryCard: React.FC<MemoryCardProps> = memo(({
  pokemon,
  isFlipped,
  isMatched,
  onClick,
  disabled = false
}) => {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        bg-gradient-to-br from-white to-red-50 rounded-lg overflow-hidden shadow-md cursor-pointer transform transition-all duration-300 h-[280px] sm:h-[320px] flex flex-col border border-red-100 relative group
        ${isMatched ? 'ring-2 ring-green-500 ring-opacity-75 memory-match-found' : ''}
        ${isFlipped ? 'hover:scale-105 active:scale-95' : 'hover:scale-102 active:scale-98 memory-card-pulse'}
        ${disabled ? 'cursor-not-allowed opacity-75' : ''}
        memory-card-enter memory-card-enter-active
        select-none touch-manipulation
      `}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 w-full h-full pointer-events-none opacity-5">
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="0.5"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
          <line x1="2" y1="12" x2="8" y2="12" stroke="currentColor" strokeWidth="0.5"/>
          <line x1="16" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="0.5"/>
        </svg>
      </div>

      {/* Card Back */}
      <div className={`
        absolute inset-0 w-full h-full backface-hidden transition-transform duration-500 preserve-3d
        ${isFlipped ? 'rotate-y-180' : ''}
      `}>
        <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center rounded-lg relative">
          {/* Background SVG Pattern */}
          <div className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="0.5"/>
              <circle cx="12" cy="12" r="3" fill="white"/>
              <line x1="2" y1="12" x2="8" y2="12" stroke="white" strokeWidth="0.5"/>
              <line x1="16" y1="12" x2="22" y2="12" stroke="white" strokeWidth="0.5"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Card Front */}
      <div className={`
        absolute inset-0 w-full h-full backface-hidden transition-transform duration-500 preserve-3d rotate-y-180
        ${isFlipped ? 'rotate-y-0' : ''}
      `}>
        <div className="relative bg-gradient-to-b from-white to-red-50 p-3 sm:p-4 h-full">
          <span className="absolute top-2 right-2 text-xs font-bold text-gray-500 bg-white/80 px-2 py-1 rounded-full">
            {formatPokemonId(pokemon.id)}
          </span>
          <PokemonImage
            pokemonId={pokemon.id}
            alt={pokemon.name}
            title={`${formatName(pokemon.name)} - ${formatPokemonId(pokemon.id)}`}
            className="w-full h-32 sm:h-40 object-contain transform transition-transform duration-300 drop-shadow-md"
          />
        </div>

        <div className="p-3 sm:p-4 flex flex-col flex-grow">
          <h3 className="text-base sm:text-lg font-bold capitalize text-gray-800">
            <span className="line-clamp-1">
              {formatName(pokemon.name)}
            </span>
          </h3>

          <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
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

        <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    </div>
  );
});
