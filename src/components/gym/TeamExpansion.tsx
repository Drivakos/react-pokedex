import React from 'react';
import { GymType, GymPokemon } from '../../utils/gym/types';
import { TYPE_COLORS } from '../../utils/gym/constants';
import { getRandomPokemonOfType } from '../../utils/gym/pokemonGenerator';

interface TeamExpansionProps {
  selectedType: GymType;
  gymTeam: GymPokemon[];
  allPokemon: any[];
  pokemonToReplace: GymPokemon | null;
  onTeamExpansion: (pokemon: any) => void;
  onPokemonReplacement: (pokemon: GymPokemon) => void;
  onCancelReplacement: () => void;
  onSkipAndContinue: () => void;
  onRefreshOptions: () => void;
}

const TeamExpansion: React.FC<TeamExpansionProps> = ({ 
  selectedType, 
  gymTeam, 
  allPokemon,
  pokemonToReplace, 
  onTeamExpansion, 
  onPokemonReplacement,
  onCancelReplacement,
  onSkipAndContinue,
  onRefreshOptions
}) => {
  // Get random Pokemon of the selected type, excluding those already in team
  const getAvailableOptions = () => {
    const typeOptions = getRandomPokemonOfType(allPokemon, selectedType, 20);
    const availableOptions = typeOptions.filter(p => !gymTeam.some(gp => gp.id === p.id));
    return availableOptions.slice(0, 3);
  };

  const availableOptions = getAvailableOptions();

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold">
          {gymTeam.length < 6 ? 'Expand Your Team!' : pokemonToReplace ? 'Replace Pokemon' : 'Team Management'}
        </h2>
        <div className="flex flex-wrap gap-2">
          {pokemonToReplace && (
            <button
              onClick={onCancelReplacement}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              Cancel Replacement
            </button>
          )}
          <button
            onClick={onRefreshOptions}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            🎲 Get New Options
          </button>
          {gymTeam.length === 6 && !pokemonToReplace && (
            <button
              onClick={onSkipAndContinue}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Skip & Continue
            </button>
          )}
        </div>
      </div>
      
      {pokemonToReplace ? (
        <p className="text-gray-600 mb-6">
          You're replacing <strong>{pokemonToReplace.name}</strong>. Choose a new {selectedType} type Pokémon:
        </p>
      ) : gymTeam.length < 6 ? (
        <p className="text-gray-600 mb-6">
          Great job! Choose a new {selectedType} type Pokémon to add to your gym team:
        </p>
      ) : (
        <p className="text-gray-600 mb-6">
          Your team is full! You can replace a Pokemon or skip to continue battling:
        </p>
      )}
      
      {/* New Pokemon Options */}
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4">Available {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Pokemon:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {availableOptions.map((pokemon) => (
            <div
              key={pokemon.id}
              className="border-2 border-gray-300 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
              onClick={() => onTeamExpansion(pokemon)}
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
      
      {/* Current Team (when team is full) */}
      {gymTeam.length === 6 && !pokemonToReplace && (
        <div>
          <h3 className="text-xl font-bold mb-4">Your Current Team (Click to Replace):</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {gymTeam.map((pokemon) => (
              <div
                key={pokemon.id}
                className="border-2 border-red-300 rounded-lg p-4 hover:border-red-500 cursor-pointer transition-colors bg-red-50"
                onClick={() => onPokemonReplacement(pokemon)}
              >
                <img
                  src={pokemon.sprites?.front_default}
                  alt={pokemon.name}
                  className="w-32 h-32 mx-auto mb-4 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/pokedex.svg';
                  }}
                />
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
                <div className="text-center mt-2">
                  <span className="text-xs text-red-600 font-semibold">Click to Replace</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamExpansion; 