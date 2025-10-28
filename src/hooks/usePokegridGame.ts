import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { Pokemon } from '../types/pokemon';
import { GridCellData } from '../components/pokegrid';
import type { GridGame } from '../components/pokegrid';
import { pokegridService } from '../services/pokegrid.service';
import { 
  generateDailyGrid, 
  generateEndlessGrid, 
  checkConstraint, 
  calculateScore,
  isGameCompleted,
  isPerfectGame,
  isOutOfGuesses
} from '../utils/pokegrid-game.utils';
import { GAME_CONSTANTS } from '../components/pokegrid/constants';

type ExtendedGridCell = GridCellData & {
  rowConstraint: any;
  colConstraint: any;
  hasMistake?: boolean;
  mistakeCount?: number;
};

export interface PokegridGameState {
  currentGame: GridGame | null;
  selectedCell: ExtendedGridCell | null;
  bonusRetries: number;
  sessionUndos: number;
  lastAction: any;
  hasRecentMistake: boolean;
  mistakePokemon: Pokemon | null;
  popularityData: any[];
}

export function usePokegridGame(displayedPokemon: Pokemon[], gameMode: 'daily') {
  const { user } = useAuth();
  
  // Core game state
  const [currentGame, setCurrentGame] = useState<GridGame | null>(null);
  const [selectedCell, setSelectedCell] = useState<ExtendedGridCell | null>(null);
  const [bonusRetries, setBonusRetries] = useState(0);
  const [sessionUndos, setSessionUndos] = useState(0);
  const [lastAction, setLastAction] = useState<any>(null);
  const [hasRecentMistake, setHasRecentMistake] = useState(false);
  const [mistakePokemon, setMistakePokemon] = useState<Pokemon | null>(null);
  const [popularityData, setPopularityData] = useState<any[]>([]);
  
  // Track initialization to prevent spam
  const initializedRef = useRef<{[key: string]: boolean}>({});

  // Initialize game
  const initializeGame = useCallback(async (date: Date, mode: 'daily' | 'endless') => {
    const gridKey = `${mode}-${date.toISOString().split('T')[0]}`;
    
    if (mode === 'endless' || !initializedRef.current[gridKey]) {
      
      if (mode !== 'endless') {
        initializedRef.current[gridKey] = true;
      }

      if (mode === 'daily') {
        const dateString = date.toISOString().split('T')[0];
        
        // Load data in parallel, including pre-generated grid configuration
        const [gridConfig, popularityData, guessHistory, progress] = await Promise.all([
          pokegridService.loadGridConfiguration(dateString),
          pokegridService.loadPopularityData(dateString),
          user ? pokegridService.loadGuessHistory(user.id, dateString) : Promise.resolve([]),
          user ? pokegridService.loadUserProgress(user.id, dateString) : Promise.resolve(null)
        ]);

        // Generate game using pre-generated config or fallback to seeded random
        const game = generateDailyGrid(date, gridConfig?.configuration);

        setPopularityData(popularityData);

        if (progress?.game_data) {
          // Restore game state
          const restoredGame = restoreGameFromProgress(game, progress, guessHistory, displayedPokemon);
          setCurrentGame(restoredGame);
          
          // Restore UI state
          if (progress.game_data.guessHistory) {
            const savedHistory = progress.game_data.guessHistory;
            if (savedHistory.sessionUndos !== undefined) {
              setSessionUndos(savedHistory.sessionUndos);
            }
            if (savedHistory.hasRecentMistake && savedHistory.mistakePokemon) {
              setHasRecentMistake(true);
              const pokemonObject = displayedPokemon.find(p => p.id === savedHistory.mistakePokemon.id);
              if (pokemonObject) setMistakePokemon(pokemonObject);
            }
          }
          
          if (restoredGame.perfectGame) {
            setBonusRetries(GAME_CONSTANTS.BONUS_RETRIES);
          }
        } else {
          setCurrentGame(game);
        }
      } else {
        setCurrentGame(generateEndlessGrid());
      }
    }
  }, [user, displayedPokemon]);

  // Handle Pokemon selection
  const handlePokemonSelect = useCallback(async (pokemon: Pokemon) => {
    if (!currentGame || !selectedCell) return;

    const rowValid = checkConstraint(pokemon, selectedCell.rowConstraint);
    const colValid = checkConstraint(pokemon, selectedCell.colConstraint);
    const isValid = rowValid && colValid;

    // Save state for undo
    setLastAction({
      cells: currentGame.cells.map(cell => ({ ...cell })),
      totalGuesses: currentGame.totalGuesses,
      score: currentGame.score,
      selectedCell: selectedCell.id
    });

    // Update cells
    const updatedCells = currentGame.cells.map((cell: any) => {
      if (cell.id === selectedCell.id) {
        return {
          ...cell,
          pokemon,
          isCorrect: isValid,
          attempts: cell.attempts + 1,
          isLocked: isValid,
          rarity: 1,
          hasMistake: !isValid,
          mistakeCount: (cell.mistakeCount || 0) + (isValid ? 0 : 1)
        };
      }
      return cell;
    });

    // Calculate new game state
    const score = calculateScore(updatedCells, popularityData);
    const totalGuesses = currentGame.totalGuesses + (isValid ? 0 : 1);
    const correctGuesses = currentGame.correctGuesses + (isValid ? 1 : 0);
    const newStreak = isValid ? currentGame.streak + 1 : 0;
    const completed = isGameCompleted(updatedCells);
    const perfectGame = isPerfectGame(updatedCells);
    
    if (perfectGame && bonusRetries === 0) {
      setBonusRetries(GAME_CONSTANTS.BONUS_RETRIES);
    }

    const isOutOfGuess = isOutOfGuesses(totalGuesses, bonusRetries, perfectGame);

    const updatedGame = {
      ...currentGame,
      cells: updatedCells,
      score,
      completed: completed && !isOutOfGuess,
      perfectGame,
      totalGuesses,
      correctGuesses,
      streak: newStreak,
      endTime: (completed && !isOutOfGuess) ? new Date() : undefined
    };

        // Save to database
        if (user && gameMode === 'daily') {
      await Promise.all([
        pokegridService.saveIndividualGuess(
          user.id,
          currentGame.date,
          selectedCell.id,
          pokemon.id,
          pokemon.name,
          selectedCell.attempts + 1,
          isValid
        ),
        pokegridService.saveUserProgress(
          user.id,
          updatedGame,
          sessionUndos,
          hasRecentMistake,
          mistakePokemon,
          bonusRetries
        )
      ]);
    }

    setCurrentGame(updatedGame);

    // Update mistake state
    if (isValid) {
      setHasRecentMistake(false);
      setMistakePokemon(null);
    } else {
      setHasRecentMistake(true);
      setMistakePokemon(pokemon);
    }

    // Clear selection unless it's a mistake and we're not out of guesses
    if (isValid || isOutOfGuess) {
      setSelectedCell(null);
      setHasRecentMistake(false);
      setMistakePokemon(null);
    }
  }, [currentGame, selectedCell, popularityData, bonusRetries, sessionUndos, hasRecentMistake, mistakePokemon, user, gameMode]);

  // Handle cell click
  const handleCellClick = useCallback((cell: any) => {
    if (!currentGame) return;

    const cellData = currentGame.cells.find((c: any) => c.id === cell.id);
    if (!cellData) return;

    // Allow clicking on empty cells or cells with mistakes
    if (!cellData.pokemon || cellData.hasMistake) {
      setSelectedCell(cellData);
      setHasRecentMistake(false);
      setMistakePokemon(null);
    }
  }, [currentGame]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (!lastAction || !currentGame || sessionUndos >= GAME_CONSTANTS.MAX_UNDO_PER_SESSION) return;

    // Restore previous state
    setCurrentGame({
      ...currentGame,
      cells: lastAction.cells,
      totalGuesses: lastAction.totalGuesses,
      score: lastAction.score
    });

    // Update selected cell
    const restoredCell = lastAction.cells.find((cell: any) => cell.id === lastAction.selectedCell);
    setSelectedCell(restoredCell || null);

    // Clear undo state
    setLastAction(null);
    setSessionUndos(prev => prev + 1);
    setHasRecentMistake(false);
    setMistakePokemon(null);

    // Save updated state
    if (user && currentGame) {
      pokegridService.saveUserProgress(user.id, currentGame, sessionUndos + 1, false, null, bonusRetries);
    }
  }, [lastAction, currentGame, sessionUndos, user, bonusRetries]);

  return {
    // State
    currentGame,
    selectedCell,
    bonusRetries,
    sessionUndos,
    hasRecentMistake,
    mistakePokemon,
    popularityData,
    
    // Actions
    initializeGame,
    handlePokemonSelect,
    handleCellClick,
    handleUndo,
    setSelectedCell,
    
    // Computed values
    canUndo: !!lastAction && sessionUndos < GAME_CONSTANTS.MAX_UNDO_PER_SESSION,
    guessesLeft: GAME_CONSTANTS.MAX_TOTAL_GUESSES - (currentGame?.totalGuesses || 0),
    isGameCompleted: currentGame ? isGameCompleted(currentGame.cells) : false
  };
}

function restoreGameFromProgress(
  baseGame: GridGame, 
  progress: any, 
  guessHistory: any[], 
  displayedPokemon: Pokemon[]
): GridGame {
  const restoredGame = {
    ...baseGame,
    cells: baseGame.cells.map((cell: any) => {
      const savedCell = progress.game_data.cells.find((c: any) => c.id === cell.id);
      if (savedCell) {
        let restoredPokemon = null;
        if (savedCell.pokemon && savedCell.pokemon.id) {
          restoredPokemon = displayedPokemon.find(p => p.id === savedCell.pokemon.id) ||
                           displayedPokemon.find(p => p.name.toLowerCase() === savedCell.pokemon.name.toLowerCase()) ||
                           createFallbackPokemon(savedCell.pokemon);
        }

        return {
          ...cell,
          pokemon: restoredPokemon,
          isCorrect: savedCell.isCorrect,
          attempts: savedCell.attempts,
          rarity: savedCell.rarity,
          isLocked: savedCell.isLocked,
          hasMistake: savedCell.hasMistake || false,
          mistakeCount: savedCell.mistakeCount || 0
        };
      }
      return cell;
    }),
    score: progress.game_data.score || 0,
    completed: progress.completed || false,
    perfectGame: progress.game_data.perfectGame || false,
    totalGuesses: progress.total_guesses || 0,
    correctGuesses: progress.correct_guesses || 0,
    streak: progress.game_data.streak || 0
  };

  // Enhance with guess history if available
  if (guessHistory.length > 0) {
    const wrongAttemptsFromHistory = guessHistory.filter((h: any) => !h.is_correct).length;
    const correctGuessesFromHistory = guessHistory.filter((h: any) => h.is_correct).length;
    
    restoredGame.totalGuesses = wrongAttemptsFromHistory;
    restoredGame.correctGuesses = correctGuessesFromHistory;

    restoredGame.cells = restoredGame.cells.map((cell: any) => {
      const cellHistory = guessHistory.filter((h: any) => h.cell_id === cell.id);
      if (cellHistory.length > 0) {
        const lastAttempt = cellHistory[cellHistory.length - 1];
        const mistakeCount = cellHistory.filter((h: any) => !h.is_correct).length;

        let pokemonObject = null;
        if (lastAttempt.is_correct && lastAttempt.pokemon_id) {
          pokemonObject = displayedPokemon.find(p => p.id === lastAttempt.pokemon_id) ||
                         displayedPokemon.find(p => p.name.toLowerCase() === lastAttempt.pokemon_name.toLowerCase()) ||
                         createFallbackPokemon({ id: lastAttempt.pokemon_id, name: lastAttempt.pokemon_name });
        }

        return {
          ...cell,
          pokemon: pokemonObject,
          isCorrect: lastAttempt.is_correct,
          attempts: cellHistory.length,
          hasMistake: !lastAttempt.is_correct,
          mistakeCount
        };
      }
      return cell;
    });
  }

  return restoredGame;
}

function createFallbackPokemon(savedPokemon: any): Pokemon {
  return {
    id: savedPokemon.id,
    name: savedPokemon.name,
    height: 0,
    weight: 0,
    types: savedPokemon.types || [],
    moves: [],
    sprites: { front_default: savedPokemon.sprites?.front_default || '' },
    generation: '',
    has_evolutions: false,
    is_default: true,
    base_experience: 0
  };
}
