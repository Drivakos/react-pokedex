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
      className="bg-white rounded-lg shadow-lg p-4 cursor-pointer transform transition-transform hover:scale-105"
    >
      <img
        src={pokemon.sprites.other['official-artwork'].front_default}
        alt={pokemon.name}
        className="w-full h-48 object-contain mb-4"
      />
      <h3 className="text-xl font-bold capitalize mb-2">
        {pokemon.name} #{String(pokemon.id).padStart(3, '0')}
      </h3>
      <div className="flex gap-2 mb-2">
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