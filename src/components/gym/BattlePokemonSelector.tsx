import React from 'react';
import { GymPokemon } from '../../utils/gym/types';
import { TYPE_COLORS } from '../../utils/gym/constants';

interface BattlePokemonSelectorProps {
  gymTeam: GymPokemon[];
  comingFromLoss: boolean;
  selectedBattlePokemon?: GymPokemon | null;
  onPokemonSelect: (pokemon: GymPokemon) => void;
}

const BattlePokemonSelector: React.FC<BattlePokemonSelectorProps> = ({ 
  gymTeam, 
  comingFromLoss, 
  selectedBattlePokemon,
  onPokemonSelect 
}) => {
  const availablePokemon = gymTeam.filter(p => p.currentHp > 0);

  return (
    <div className={`${comingFromLoss ? 'bg-red-50 border-2 border-red-200 rounded-lg' : ''} p-6`}>
      <h2 className={`text-2xl font-bold mb-4 ${comingFromLoss ? 'text-red-700' : ''}`}>
        {comingFromLoss ? 'Pokemon Defeated!' : 'Choose Your Pokemon for Battle'}
      </h2>
      <p className="text-gray-600 mb-6">
        {comingFromLoss ? 
          "Your Pokemon was defeated! Choose your next Pokemon to continue the challenge:" :
          "Click on your Pokemon below to select them for battle:"
        }
      </p>
      
      
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {gymTeam.length === 0 ? (
          <div className="col-span-full text-center text-gray-500">
            No Pokemon in your gym team. This might be a bug.
          </div>
        ) : availablePokemon.length === 0 ? (
          <div className="col-span-full text-center text-gray-500">
            All your Pokemon have fainted!
          </div>
        ) : (
          availablePokemon.map((pokemon) => (
            <div
              key={pokemon.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                selectedBattlePokemon?.id === pokemon.id 
                  ? 'border-blue-500 bg-blue-50 shadow-lg' 
                  : 'border-gray-300 hover:border-blue-500'
              }`}
              onClick={() => onPokemonSelect(pokemon)}
            >
              {pokemon.sprites?.front_default ? (
                <img
                  src={pokemon.sprites.front_default}
                  alt={pokemon.name}
                  className="w-32 h-32 mx-auto mb-4 object-contain"
                  onError={(e) => {
                    console.log('Failed to load sprite for', pokemon.name, pokemon.sprites.front_default);
                    (e.target as HTMLImageElement).src = '/images/pokedex.svg';
                  }}
                />
              ) : (
                <div className="w-32 h-32 mx-auto mb-4 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-xs">No Image</span>
                </div>
              )}
              <h3 className="text-xl font-bold text-center capitalize">{pokemon.name}</h3>
              <div className="text-center mt-2">
                <div className="text-sm text-gray-600">Level {pokemon.level}</div>
                <div className="text-sm font-semibold">HP: {pokemon.currentHp}/{pokemon.maxHp}</div>
              </div>
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
          ))
        )}
      </div>
    </div>
  );
};

export default BattlePokemonSelector; 