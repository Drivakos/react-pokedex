import React from 'react';
import { Pokemon } from '../types/pokemon';
import { TYPE_COLORS } from '../types/pokemon';
import { X } from 'lucide-react';

interface PokemonDetailProps {
  pokemon: Pokemon;
  onClose: () => void;
}

export const PokemonDetail: React.FC<PokemonDetailProps> = ({ pokemon, onClose }) => {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Get unique moves by filtering out duplicates
  const uniqueMoves = Array.from(new Set(pokemon.moves)).slice(0, 9);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={handleOverlayClick}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col items-center">
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`}
            alt={pokemon.name}
            className="w-64 h-64 object-contain mb-4"
          />
          
          <h2 className="text-3xl font-bold capitalize mb-2">
            {pokemon.name} #{String(pokemon.id).padStart(3, '0')}
          </h2>

          <div className="flex gap-2 mb-4">
            {pokemon.types.map((type) => (
              <span
                key={type}
                className={`${TYPE_COLORS[type]} text-white px-3 py-1 rounded-full text-sm capitalize`}
              >
                {type}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mb-6">
            <div className="text-center">
              <p className="text-gray-600">Height</p>
              <p className="text-xl font-semibold">{pokemon.height / 10}m</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Weight</p>
              <p className="text-xl font-semibold">{pokemon.weight / 10}kg</p>
            </div>
          </div>

          <div className="w-full">
            <h3 className="text-xl font-semibold mb-2">Moves</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {uniqueMoves.map((move, index) => (
                <span
                  key={`${move}-${index}`}
                  className="bg-gray-100 px-3 py-1 rounded-full text-sm capitalize text-center"
                >
                  {move.replace('-', ' ')}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 w-full">
            <h3 className="text-xl font-semibold mb-2">Additional Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Generation</p>
                <p className="font-semibold capitalize">{pokemon.generation}</p>
              </div>
              <div>
                <p className="text-gray-600">Base Experience</p>
                <p className="font-semibold">{pokemon.base_experience}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};