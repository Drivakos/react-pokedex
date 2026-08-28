import { useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { Pokemon } from '../types/pokemon';
import { useGridStore } from '../store/gridStore';
import {
  isGameCompleted
} from '../utils/pokegrid-game.utils';
import { GAME_CONSTANTS } from '../components/pokegrid/constants';

export function usePokegridGame(displayedPokemon: Pokemon[], gameMode: 'daily') {
  const { user } = useAuth();
  const store = useGridStore();
  const {
    initializeGame: initializeStoredGame,
    handlePokemonSelect: selectPokemon,
    handleUndo: undoLastAction,
  } = store;

  const initializeGame = useCallback(async (date: Date, mode: 'daily' | 'endless') => {
    return initializeStoredGame(date, mode, user, displayedPokemon);
  }, [user, displayedPokemon, initializeStoredGame]);

  const handlePokemonSelect = useCallback(async (pokemon: Pokemon) => {
    return selectPokemon(pokemon, user, gameMode);
  }, [user, gameMode, selectPokemon]);

  const handleUndo = useCallback(async () => {
    return undoLastAction(user);
  }, [user, undoLastAction]);

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
