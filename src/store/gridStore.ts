import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import toast from 'react-hot-toast';
import type { User } from '@supabase/supabase-js';
import { Pokemon } from '../types/pokemon';
import { GridCellData } from '../components/pokegrid';
import type { GridGame, GridCell } from '../components/pokegrid';
import type { GameProgress, GameAction, PopularityData, GuessHistoryEntry } from '../types/grid';
import { pokegridService } from '../services/pokegrid.service';
import { PokemonService } from '../services/pokemon.service';
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

interface GridState {
  currentGame: GridGame | null;
  selectedCell: GridCell | null;
  bonusRetries: number;
  sessionUndos: number;
  lastAction: GameAction | null;
  hasRecentMistake: boolean;
  mistakePokemon: Pokemon | null;
  popularityData: PopularityData[];
  isLoading: boolean;

  // Actions
  initializeGame: (date: Date, mode: 'daily' | 'endless', user: User | null, displayedPokemon: Pokemon[]) => Promise<void>;
  handlePokemonSelect: (pokemon: Pokemon, user: User | null, gameMode: 'daily') => Promise<void>;
  handleCellClick: (cell: GridCellData) => void;
  handleUndo: (user: User | null) => Promise<void>;
  setSelectedCell: (cell: GridCell | null) => void;
  setHasRecentMistake: (hasMistake: boolean) => void;
  setMistakePokemon: (pokemon: Pokemon | null) => void;
}

// Helper to restore game from progress
const restoreGameFromProgress = (
  baseGame: GridGame,
  progress: GameProgress,
  guessHistory: GuessHistoryEntry[],
  displayedPokemon: Pokemon[]
): GridGame => {
  const cells = baseGame.cells.map(cell => {
    const savedGuess = guessHistory.find(g => g.cell_id === cell.id);
    if (savedGuess) {
      const pokemon = displayedPokemon.find(p => p.id === savedGuess.pokemon_id);
      return {
        ...cell,
        pokemon: pokemon || null,
        isCorrect: savedGuess.is_correct,
        attempts: savedGuess.attempts,
        isLocked: savedGuess.is_correct,
        hasMistake: !savedGuess.is_correct,
        mistakeCount: savedGuess.is_correct ? 0 : savedGuess.attempts
      };
    }
    return cell;
  });

  return {
    ...baseGame,
    cells,
    score: progress.score || 0,
    totalGuesses: progress.total_guesses || 0,
    correctGuesses: cells.filter(c => c.isCorrect).length,
    completed: progress.completed || false,
    perfectGame: progress.game_data?.perfectGame || false
  };
};

export const useGridStore = create<GridState>()(
  persist(
    immer((set, get) => ({
      currentGame: null,
      selectedCell: null,
      bonusRetries: 0,
      sessionUndos: 0,
      lastAction: null,
      hasRecentMistake: false,
      mistakePokemon: null,
      popularityData: [],
      isLoading: false,

      setSelectedCell: (cell) => set({ selectedCell: cell }),
      setHasRecentMistake: (hasMistake) => set({ hasRecentMistake: hasMistake }),
      setMistakePokemon: (pokemon) => set({ mistakePokemon: pokemon }),

      initializeGame: async (date, mode, user, displayedPokemon) => {
        set({ isLoading: true });
        try {
          if (mode === 'daily') {
            const dateString = date.toISOString().split('T')[0];

            const results = await Promise.allSettled([
              pokegridService.loadGridConfiguration(dateString),
              pokegridService.loadPopularityData(dateString),
              user ? pokegridService.loadGuessHistory(user.id, dateString) : Promise.resolve([]),
              user ? pokegridService.loadUserProgress(user.id, dateString) : Promise.resolve(null)
            ]);

            const gridConfig     = results[0].status === 'fulfilled' ? results[0].value : null;
            const popularityData = results[1].status === 'fulfilled' ? results[1].value : null;
            const guessHistory   = results[2].status === 'fulfilled' ? results[2].value : [];
            const progress       = results[3].status === 'fulfilled' ? results[3].value : null;

            // Ensure all relevant pokemon are loaded for restoration
            let allRelevantPokemon = [...displayedPokemon];
            if (guessHistory.length > 0) {
              const missingIds = guessHistory
                .map(g => g.pokemon_id)
                .filter(id => id && !allRelevantPokemon.some(p => p.id === id));

              if (missingIds.length > 0) {
                const extraPokemon = await PokemonService.getBatch(missingIds);
                allRelevantPokemon = [...allRelevantPokemon, ...extraPokemon];
              }
            }

            const game = generateDailyGrid(date, gridConfig?.configuration);
            set({ popularityData: (popularityData ?? []) as PopularityData[] });

            if (progress?.game_data) {
              const restoredGame = restoreGameFromProgress(
                game,
                progress as GameProgress,
                (guessHistory as GuessHistoryEntry[]),
                allRelevantPokemon
              );
              set({ currentGame: restoredGame });

              if (progress.game_data.guessHistory) {
                const savedHistory = progress.game_data.guessHistory;
                set({ sessionUndos: savedHistory.sessionUndos || 0 });
                if (savedHistory.hasRecentMistake && savedHistory.mistakePokemon) {
                  set({ hasRecentMistake: true });
                  const pokemonObject = allRelevantPokemon.find(p => p.id === savedHistory.mistakePokemon?.id);
                  if (pokemonObject) set({ mistakePokemon: pokemonObject });
                }
              }

              if (restoredGame.perfectGame) {
                set({ bonusRetries: GAME_CONSTANTS.BONUS_RETRIES });
              }
            } else {
              set({
                currentGame: game,
                sessionUndos: 0,
                bonusRetries: 0,
                hasRecentMistake: false,
                mistakePokemon: null
              });
            }
          } else {
            set({ currentGame: generateEndlessGrid() });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      handlePokemonSelect: async (pokemon, user, gameMode) => {
        const { currentGame, selectedCell, bonusRetries, sessionUndos, popularityData, hasRecentMistake, mistakePokemon } = get();
        if (!currentGame || !selectedCell) return;

        const isAlreadyUsed = currentGame.cells.some(
          cell => cell.isCorrect && cell.pokemon && cell.pokemon.id === pokemon.id
        );

        if (isAlreadyUsed) {
          toast.error(`${pokemon.name} has already been used in this grid!`, {
            icon: '🚫',
            duration: 3000
          });
          return;
        }

        const rowValid = checkConstraint(pokemon, selectedCell.rowConstraint);
        const colValid = checkConstraint(pokemon, selectedCell.colConstraint);
        const isValid = rowValid && colValid;

        // Save last action for undo
        set({
          lastAction: {
            cells: currentGame.cells.map(cell => ({ ...cell })),
            totalGuesses: currentGame.totalGuesses,
            score: currentGame.score,
            selectedCell: selectedCell.id
          }
        });

        const updatedCells = currentGame.cells.map((cell: GridCell) => {
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

        const score = calculateScore(updatedCells, popularityData);
        const totalGuesses = currentGame.totalGuesses + (isValid ? 0 : 1);
        const correctGuesses = currentGame.correctGuesses + (isValid ? 1 : 0);
        const newStreak = isValid ? currentGame.streak + 1 : 0;
        const completed = isGameCompleted(updatedCells);
        const perfectGame = isPerfectGame(updatedCells);

        if (perfectGame && bonusRetries === 0) {
          set({ bonusRetries: GAME_CONSTANTS.BONUS_RETRIES });
        }

        const isOutOfGuess = isOutOfGuesses(totalGuesses, get().bonusRetries);

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
              !isValid, // hasRecentMistake
              !isValid ? pokemon : null, // mistakePokemon
              get().bonusRetries
            )
          ]);
        }

        set({
          currentGame: updatedGame,
          selectedCell: null,
          hasRecentMistake: !isValid,
          mistakePokemon: !isValid ? pokemon : null
        });

        if (isValid) {
          set({ hasRecentMistake: false, mistakePokemon: null });
        }
      },

      handleCellClick: (cell) => {
        const { currentGame } = get();
        if (!currentGame) return;

        const cellData = currentGame.cells.find(c => c.id === cell.id);
        if (!cellData) return;

        if (!cellData.pokemon || cellData.hasMistake) {
          set({
            selectedCell: cellData,
            hasRecentMistake: false,
            mistakePokemon: null
          });
        }
      },

      handleUndo: async (user) => {
        const { lastAction, currentGame, sessionUndos, bonusRetries } = get();
        if (!lastAction || !currentGame || sessionUndos >= GAME_CONSTANTS.MAX_UNDO_PER_SESSION) return;

        const updatedGame = {
          ...currentGame,
          cells: lastAction.cells,
          totalGuesses: lastAction.totalGuesses,
          score: lastAction.score
        };

        const restoredCell = lastAction.cells.find(cell => cell.id === lastAction.selectedCell);

        set({
          currentGame: updatedGame,
          selectedCell: restoredCell || null,
          lastAction: null,
          sessionUndos: sessionUndos + 1,
          hasRecentMistake: false,
          mistakePokemon: null
        });

        if (user) {
          await pokegridService.saveUserProgress(user.id, updatedGame, sessionUndos + 1, false, null, bonusRetries);
        }
      }
    })),
    {
      name: 'pokegrid-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentGame: state.currentGame,
        bonusRetries: state.bonusRetries,
        sessionUndos: state.sessionUndos
      }),
    }
  )
);
