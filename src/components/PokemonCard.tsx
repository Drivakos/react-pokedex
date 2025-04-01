import React from 'react';
import { Pokemon } from '../types/pokemon';
import { TYPE_COLORS } from '../types/pokemon';

interface PokemonCardProps {
  pokemon: Pokemon;
  onClick: () => void;
}

export const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-lg p-4 cursor-pointer transform transition-transform hover:scale-105 h-[320px] flex flex-col"
    >
      <img
        src={pokemon.sprites.other['official-artwork'].front_default}
        alt={pokemon.name}
        className="w-full h-48 object-contain"
      />
      <h3 className="text-xl font-bold capitalize min-h-[3rem] flex items-center">
        <span className="line-clamp-2">
          {pokemon.name} #{String(pokemon.id).padStart(3, '0')}
        </span>
      </h3>
      <div className="flex gap-2 mt-auto">
        {pokemon.types.map((type) => (
          <span
            key={type}
            className={`${TYPE_COLORS[type]} text-white px-2 py-1 rounded-full text-sm capitalize`}
          >
            {type}
          </span>
        ))}
      </div>
    </div>
  );
};