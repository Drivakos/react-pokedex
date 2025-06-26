import React from 'react';
import { useGymChallenge } from '../../hooks/gym';
import { 
  TypeSelection, 
  PokemonSelection, 
  BattlePokemonSelector, 
  TeamExpansion, 
  GameOver 
} from './index';
import BattleSimulator from '../BattleSimulator';

interface GymLeaderChallengeProps {
  onExit: () => void;
}

const GymLeaderChallenge: React.FC<GymLeaderChallengeProps> = ({ onExit }) => {
  const { state, actions } = useGymChallenge();
  


  // Show loading while fetching Pokemon data
  if (state.loading) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Loading Gym Challenge...</h2>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }

  // Battle Phase
  if (state.gamePhase === 'battling' && state.selectedBattlePokemon && state.currentChallenger) {
    return (
      <BattleSimulator
        playerPokemon={state.selectedBattlePokemon}
        opponentPokemon={state.currentChallenger.pokemon[0]}
        onBack={() => actions.setGamePhase('pokemon-select-for-battle')}
        onBattleEnd={actions.handleBattleComplete}
      />
    );
  }

  // Phase-based rendering
  return (
    <div className="relative p-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold">Gym Leader Challenge</h1>
        <p className="text-gray-600 mt-2">
          Build your gym team and defend against challenging trainers!
        </p>
        {state.selectedType && (
          <div className="mt-4">
            <span className="text-lg font-semibold">
              {state.selectedType.charAt(0).toUpperCase() + state.selectedType.slice(1)} Type Gym
            </span>
            {state.battleWins > 0 && (
              <span className="ml-4 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                {state.battleWins} Victories
              </span>
            )}
          </div>
        )}
      </div>

      {/* Phase Components */}
      {state.gamePhase === 'type-selection' && (
        <TypeSelection onTypeSelect={actions.handleTypeSelection} />
      )}

      {state.gamePhase === 'pokemon-selection' && state.selectedType && (
        <PokemonSelection
          selectedType={state.selectedType}
          availablePokemon={state.availablePokemon}
          onPokemonSelect={actions.handlePokemonSelection}
          onRefreshOptions={actions.refreshAvailablePokemon}
        />
      )}

      {state.gamePhase === 'pokemon-select-for-battle' && (
        <div>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800">Ready for Battle!</h3>
            <p className="text-blue-700">Your Pokemon team is ready. Select a Pokemon to fight or start the challenge!</p>
          </div>
          
          <BattlePokemonSelector
            gymTeam={state.gymTeam}
            comingFromLoss={state.comingFromLoss}
            selectedBattlePokemon={state.selectedBattlePokemon}
            onPokemonSelect={actions.handleBattlePokemonSelection}
          />
          
          <div className="mt-6 text-center">
            <div className="text-gray-600">
              <p className="mb-2">👆 Click on a Pokemon above to start battling!</p>
              <p className="text-sm text-gray-500">The battle will begin immediately after selection</p>
            </div>
          </div>
        </div>
      )}

      {state.gamePhase === 'team-expansion' && state.selectedType && (
        <TeamExpansion
          selectedType={state.selectedType}
          gymTeam={state.gymTeam}
          allPokemon={state.allPokemon}
          pokemonToReplace={state.pokemonToReplace}
          onTeamExpansion={actions.handleTeamExpansion}
          onPokemonReplacement={actions.handlePokemonReplacement}
          onCancelReplacement={() => actions.setPokemonToReplace(null)}
          onSkipAndContinue={() => actions.setGamePhase('pokemon-select-for-battle')}
          onRefreshOptions={actions.refreshAvailablePokemon}
        />
      )}

      {state.gamePhase === 'game-over' && (
        <GameOver
          battleWins={state.battleWins}
          teamSize={state.gymTeam.length}
          onTryAgain={actions.resetChallenge}
          onExit={onExit}
        />
      )}

      {/* Exit Button (only visible in game over and top right) */}
      {(state.gamePhase === 'game-over' || state.gamePhase === 'type-selection') && (
        <div className="absolute top-4 right-4">
          <button
            onClick={onExit}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default GymLeaderChallenge; 