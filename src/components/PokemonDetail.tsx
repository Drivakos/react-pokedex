import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pokemon } from '../types/pokemon';
import { TYPE_COLORS } from '../types/pokemon';
import { X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import FavoritePokemon from './FavoritePokemon';

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

  const uniqueMoves = Array.from(new Set(pokemon.moves)).slice(0, 9);
  
  const [movesExpanded, setMovesExpanded] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={handleOverlayClick}>
      <div className="bg-white rounded-lg max-w-2xl w-full overflow-y-auto p-6 relative" style={{ maxHeight: movesExpanded || infoExpanded ? '90vh' : 'fit-content' }}>
        <div className="flex justify-between items-center absolute top-4 right-4 gap-2">
          <FavoritePokemon pokemonId={pokemon.id} />
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`}
            alt={pokemon.name}
            title={`${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} - #${String(pokemon.id).padStart(3, '0')}`}
            className="w-48 h-48 object-contain mb-4"
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
            <button 
              className="flex items-center justify-between w-full text-left text-xl font-semibold mb-2 hover:text-blue-600 transition-colors"
              onClick={() => setMovesExpanded(!movesExpanded)}
            >
              <span>Moves</span>
              {movesExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {movesExpanded && (
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
            )}
          </div>

          <div className="mt-4 w-full">
            <button 
              className="flex items-center justify-between w-full text-left text-xl font-semibold mb-2 hover:text-blue-600 transition-colors"
              onClick={() => setInfoExpanded(!infoExpanded)}
            >
              <span>Additional Info</span>
              {infoExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {infoExpanded && (
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
            )}
          </div>
          
          <div className="mt-6 w-full">
            <Link 
              to={`/pokemon/${pokemon.id}`} 
              className="flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              <span>See Full Details</span>
              <ExternalLink size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
