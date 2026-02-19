import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { Pokemon } from '../types/pokemon';
import { useGridStore } from '../store/gridStore';
import {
  isGameCompleted
} from '../utils/pokegrid-game.utils';
import { GAME_CONSTANTS } from '../components/pokegrid/constants';

export function usePokegridGame(displayedPokemon: Pokemon[], gameMode: 'daily') {
  const { user } = useAuth();
  const store = useGridStore();

  const initializeGame = useCallback(async (date: Date, mode: 'daily' | 'endless') => {
    return store.initializeGame(date, mode, user, displayedPokemon);
  }, [user, displayedPokemon, store.initializeGame]);

  const handlePokemonSelect = useCallback(async (pokemon: Pokemon) => {
    return store.handlePokemonSelect(pokemon, user, gameMode);
  }, [user, gameMode, store.handlePokemonSelect]);

  const handleUndo = useCallback(async () => {
    return store.handleUndo(user);
  }, [user, store.handleUndo]);

  return useMemo(() => ({
    // State
    currentGame: store.currentGame,
    selectedCell: store.selectedCell,
    bonusRetries: store.bonusRetries,
    sessionUndos: store.sessionUndos,
    hasRecentMistake: store.hasRecentMistake,
    mistakePokemon: store.mistakePokemon,
    popularityData: store.popularityData,
    isLoading: store.isLoading,
    
    // Actions
    initializeGame,
    handlePokemonSelect,
    handleCellClick: store.handleCellClick,
    handleUndo,
    setSelectedCell: store.setSelectedCell,
    
    // Computed values
    canUndo: !!store.lastAction && store.sessionUndos < GAME_CONSTANTS.MAX_UNDO_PER_SESSION,
    guessesLeft: GAME_CONSTANTS.MAX_TOTAL_GUESSES - (store.currentGame?.totalGuesses || 0),
    isGameCompleted: store.currentGame ? isGameCompleted(store.currentGame.cells) : false
  }), [
    store.currentGame,
    store.selectedCell,
    store.bonusRetries,
    store.sessionUndos,
    store.hasRecentMistake,
    store.mistakePokemon,
    store.popularityData,
    store.isLoading,
    store.lastAction,
    store.handleCellClick,
    store.setSelectedCell,
    initializeGame,
    handlePokemonSelect,
    handleUndo
  ]);
}
