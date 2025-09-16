import React, { useState, useEffect } from 'react';
import { PokemonMemoryMatch } from './PokemonMemoryMatch';
import { usePokemon } from '../hooks/usePokemon';
import { Pokemon } from '../types/pokemon';
import { fetchPokemonData } from '../services/api';

interface GameStats {
  moves: number;
  matches: number;
  time: number;
  score: number;
}

const PokemonMemoryGame: React.FC = () => {
  const { displayedPokemon, loading, loadMorePokemon, hasMore } = usePokemon();
  const [gamePokemon, setGamePokemon] = useState<Pokemon[]>([]);
  const [gameLoading, setGameLoading] = useState(false);

  // Load a diverse set of Pokemon for the game
  useEffect(() => {
    const loadGamePokemon = async () => {
      if (loading) return;

      setGameLoading(true);
      try {
        // Load 100 Pokemon directly for fast loading and good diversity
        const pokemon = await fetchPokemonData(100, 0, '', {
          types: [],
          moves: [],
          generation: '',
          weight: { min: 0, max: 0 },
          height: { min: 0, max: 0 },
          hasEvolutions: null,
        });

        setGamePokemon(pokemon);

      } catch (error) {
        // Fallback to displayed Pokemon
        setGamePokemon(displayedPokemon);
      } finally {
        setGameLoading(false);
      }
    };

    loadGamePokemon();
  }, [loading, displayedPokemon]);

  const handleGameComplete = (stats: GameStats) => {
  };

  if (loading || gameLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Pokemon...</p>
        </div>
      </div>
    );
  }

  if (gamePokemon.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            🎮 Pokemon Memory Match
          </h1>
          <p className="text-gray-600">
            No Pokemon data available. Please check your connection and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 py-4 px-3 sm:px-6">
      <PokemonMemoryMatch
        pokemonList={gamePokemon}
        onGameComplete={handleGameComplete}
      />
    </div>
  );
};

export default PokemonMemoryGame;
