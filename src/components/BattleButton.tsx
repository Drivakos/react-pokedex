import React, { useState } from 'react';
import { Swords, Zap, X } from 'lucide-react';
import NativeShowdownBattle from './NativeShowdownBattle';
import { selectPokemonMoves } from '../services/moves';

interface BattleButtonProps {
  pokemon: any;
  className?: string;
}

const BattleButton: React.FC<BattleButtonProps> = ({ pokemon, className = '' }) => {
  const [showBattle, setShowBattle] = useState(false);
  const [opponent, setOpponent] = useState<any>(null);
  const [battlePokemon, setBattlePokemon] = useState<any>(null);

  // Prepare player's Pokemon with proper moves
  const preparePlayerPokemon = async (pokemon: any) => {
    const pokemonTypes = pokemon.types || ['normal'];
    const pokemonId = pokemon.id || 1;
    const level = 50; // Default level for battles
    
    try {
      const movesData = await selectPokemonMoves(pokemonId, pokemonTypes, level, 4);
      
      return {
        ...pokemon,
        moves: movesData.map(move => ({
          ...move,
          currentPP: move.pp
        }))
      };
    } catch (error) {
      console.warn('Failed to get moves for player Pokemon, using fallback', error);
      return {
        ...pokemon,
        moves: [
          { name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, currentPP: 35, damageClass: 'physical', description: 'A physical attack.' },
          { name: 'growl', type: 'normal', power: 0, accuracy: 100, pp: 40, currentPP: 40, damageClass: 'status', description: 'Lowers Attack.', effect: 'lower_attack' }
        ]
      };
    }
  };

  // Random opponent generator
  const generateRandomOpponent = async () => {
    const randomId = Math.floor(Math.random() * 1010) + 1; // All Pokemon up to Gen 8
    
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
      const opponentData = await response.json();
      
      // Get moves for the opponent using the new moves service
      const opponentTypes = opponentData.types.map((type: any) => type.type.name);
      const level = 50;
      
      let movesResponse;
      try {
        const movesData = await selectPokemonMoves(randomId, opponentTypes, level, 4);
        movesResponse = movesData.map(move => ({
          ...move,
          currentPP: move.pp
        }));
      } catch (error) {
        console.warn('Failed to get moves for opponent, using fallback', error);
        // Fallback moves
        movesResponse = [
          { name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, currentPP: 35, damageClass: 'physical', description: 'A physical attack.' },
          { name: 'growl', type: 'normal', power: 0, accuracy: 100, pp: 40, currentPP: 40, damageClass: 'status', description: 'Lowers Attack.', effect: 'lower_attack' }
        ];
      }

      const formattedOpponent = {
        id: opponentData.id,
        name: opponentData.name,
        types: opponentData.types.map((type: any) => type.type.name),
        stats: {
          hp: opponentData.stats.find((stat: any) => stat.stat.name === 'hp')?.base_stat || 100,
          attack: opponentData.stats.find((stat: any) => stat.stat.name === 'attack')?.base_stat || 80,
          defense: opponentData.stats.find((stat: any) => stat.stat.name === 'defense')?.base_stat || 80,
          'special-attack': opponentData.stats.find((stat: any) => stat.stat.name === 'special-attack')?.base_stat || 80,
          'special-defense': opponentData.stats.find((stat: any) => stat.stat.name === 'special-defense')?.base_stat || 80,
          speed: opponentData.stats.find((stat: any) => stat.stat.name === 'speed')?.base_stat || 80,
        },
        sprites: opponentData.sprites,
        moves: movesResponse
      };

      return formattedOpponent;
    } catch (error) {
      console.error('Error generating opponent:', error);
      // Fallback opponent
      return {
        id: 25,
        name: 'pikachu',
        types: ['electric'],
        stats: { hp: 35, attack: 55, defense: 40, 'special-attack': 50, 'special-defense': 50, speed: 90 },
        sprites: {
          front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
          back_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/25.png'
        },
        moves: [
          { name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, pp: 15, currentPP: 15, damageClass: 'special', description: 'A strong electric attack.' },
          { name: 'quick-attack', type: 'normal', power: 40, accuracy: 100, pp: 30, currentPP: 30, damageClass: 'physical', description: 'A fast attack.' }
        ]
      };
    }
  };

  const handleBattleClick = async () => {
    try {
      // Prepare both Pokémon simultaneously
      const [playerPokemon, opponentPokemon] = await Promise.all([
        preparePlayerPokemon(pokemon),
        generateRandomOpponent()
      ]);
      
      setBattlePokemon(playerPokemon);
      setOpponent(opponentPokemon);
      setShowBattle(true);
    } catch (error) {
      console.error('Error preparing battle:', error);
    }
  };

  const closeBattle = () => {
    setShowBattle(false);
    setOpponent(null);
    setBattlePokemon(null);
  };

  return (
    <>
      <button
        onClick={handleBattleClick}
        className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:from-red-600 hover:to-orange-600 transition-all duration-200 transform hover:scale-105 shadow-lg ${className}`}
      >
        <Swords size={20} />
        <span className="font-medium">Battle!</span>
        <Zap size={16} className="animate-pulse" />
      </button>

      {/* Native Showdown Battle */}
      {showBattle && opponent && battlePokemon && (
        <NativeShowdownBattle
          playerPokemon={battlePokemon}
          opponentPokemon={opponent}
          onBack={closeBattle}
          onBattleEnd={(playerWon) => {
            console.log('Battle ended, player won:', playerWon);
            // Handle battle end if needed
          }}
        />
      )}
    </>
  );
};

export default BattleButton; 