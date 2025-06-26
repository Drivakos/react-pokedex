import React from 'react';
import { GymType } from '../../utils/gym/types';
import { TYPE_COLORS } from '../../utils/gym/constants';

interface PokemonSelectionProps {
  selectedType: GymType;
  availablePokemon: any[];
  onPokemonSelect: (pokemon: any) => void;
  onRefreshOptions: () => void;
}

const PokemonSelection: React.FC<PokemonSelectionProps> = ({ 
  selectedType, 
  availablePokemon, 
  onPokemonSelect, 
  onRefreshOptions 
}) => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Choose Your Ace Pokémon</h2>
        <button
          onClick={onRefreshOptions}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          🎲 Get New Options
        </button>
      </div>
      <p className="text-gray-600 mb-6">
        Select your starter Pokémon for the {selectedType} type gym. Don't like these options? Click "Get New Options" for different choices!
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {availablePokemon.map((pokemon) => (
          <div
            key={pokemon.id}
            className="border-2 border-gray-300 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
            onClick={() => onPokemonSelect(pokemon)}
          >
            <img
              src={pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default}
              alt={pokemon.name}
              className="w-32 h-32 mx-auto mb-4 object-contain"
            />
            <h3 className="text-xl font-bold text-center capitalize">{pokemon.name}</h3>
            <div className="flex justify-center gap-2 mt-2">
              {pokemon.types?.map((type: string) => (
                <span
                  key={type}
                  className="px-2 py-1 rounded text-white text-xs font-bold"
                  style={{ backgroundColor: TYPE_COLORS[type] }}
                >
                  {type.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PokemonSelection; 