import { supabase } from '../lib/supabase';
import type { GridGame } from '../components/pokegrid';

export interface GameProgress {
  id: number;
  game_data: any;
  completed: boolean;
  score: number;
  total_guesses: number;
  correct_guesses: number;
  completed_at?: string;
}

export interface GuessHistoryItem {
  cell_id: string;
  pokemon_id: number;
  pokemon_name: string;
  attempt_number: number;
  is_correct: boolean;
}

export interface PopularityData {
  cell_id: string;
  pokemon_id: number;
  pokemon_name: string;
  guess_count: number;
  popularity_percentage: number;
  correct_guess_count: number;
  incorrect_guess_count: number;
  avg_attempts_for_correct: number;
}

class PokegridService {
  async loadUserProgress(userId: string, gridDate: string): Promise<GameProgress | null> {
    if (!userId) return null;

    try {
      const { data, error } = await supabase.rpc('get_user_pokegrid_progress', {
        p_user_id: userId,
        p_grid_date: gridDate
      });

      if (error) {
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      return null;
    }
  }

  async saveUserProgress(
    userId: string,
    game: GridGame,
    sessionUndos: number,
    hasRecentMistake: boolean,
    mistakePokemon: any,
    bonusRetries: number
  ): Promise<boolean> {
    if (!userId) return false;

    try {
      const gameData = {
        cells: game.cells.map(cell => ({
          id: cell.id,
          row: cell.row,
          col: cell.col,
          pokemon: cell.pokemon,
          isCorrect: cell.isCorrect,
          attempts: cell.attempts,
          rarity: cell.rarity,
          isLocked: cell.isLocked,
          hasMistake: cell.hasMistake,
          mistakeCount: cell.mistakeCount
        })),
        constraints: game.constraints,
        score: game.score,
        completed: game.completed,
        perfectGame: game.perfectGame,
        startTime: game.startTime,
        endTime: game.endTime,
        totalGuesses: game.totalGuesses,
        correctGuesses: game.correctGuesses,
        streak: game.streak,
        bonusRetries,
        guessHistory: {
          hasRecentMistake,
          mistakePokemon: mistakePokemon ? {
            id: mistakePokemon.id,
            name: mistakePokemon.name
          } : null,
          sessionUndos
        }
      };

      const { error } = await supabase.rpc('save_pokegrid_progress', {
        p_user_id: userId,
        p_grid_date: game.date,
        p_game_data: gameData,
        p_completed: game.completed,
        p_score: game.score,
        p_total_guesses: game.totalGuesses,
        p_correct_guesses: game.correctGuesses
      });

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async loadGuessHistory(userId: string, gridDate: string): Promise<GuessHistoryItem[]> {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('pokegrid_guesses')
        .select('*')
        .eq('user_id', userId)
        .eq('grid_date', gridDate)
        .order('cell_id', { ascending: true })
        .order('attempt_number', { ascending: true });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }

  async saveIndividualGuess(
    userId: string,
    gridDate: string,
    cellId: string,
    pokemonId: number,
    pokemonName: string,
    attemptNumber: number,
    isCorrect: boolean
  ): Promise<boolean> {
    if (!userId) return false;

    try {
      const { error } = await supabase.rpc('save_pokegrid_guess', {
        p_user_id: userId,
        p_grid_date: gridDate,
        p_cell_id: cellId,
        p_pokemon_id: pokemonId,
        p_pokemon_name: pokemonName,
        p_attempt_number: attemptNumber,
        p_is_correct: isCorrect
      });

      if (error) {
        // Silently handle missing functions during migration
        if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
          return true;
        }
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async loadPopularityData(gridDate: string): Promise<PopularityData[]> {
    try {
      const { data, error } = await supabase.rpc('get_pokegrid_popularity', {
        p_grid_date: gridDate
      });

      if (error) {
        // Silently handle missing functions during migration
        if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
          return [];
        }
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }

  async getUserStats(userId: string): Promise<any> {
    if (!userId) return null;

    try {
      const { data, error } = await supabase.rpc('get_user_pokegrid_stats', {
        p_user_id: userId
      });

      if (error) {
        // Return default stats if function doesn't exist
        return {
          totalGames: 0,
          completedGames: 0,
          perfectGames: 0,
          averageScore: 0,
          bestScore: 0,
          currentStreak: 0,
          longestStreak: 0,
          averageGuesses: 0,
          totalGuesses: 0,
          accuracy: 0
        };
      }

      return data?.[0] || {
        totalGames: 0,
        completedGames: 0,
        perfectGames: 0,
        averageScore: 0,
        bestScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        averageGuesses: 0,
        totalGuesses: 0,
        accuracy: 0
      };
    } catch (error) {
      return {
        totalGames: 0,
        completedGames: 0,
        perfectGames: 0,
        averageScore: 0,
        bestScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        averageGuesses: 0,
        totalGuesses: 0,
        accuracy: 0
      };
    }
  }

  async getLeaderboard(timeframe: 'daily' | 'weekly' | 'all-time', gridDate?: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_pokegrid_leaderboard', {
        p_timeframe: timeframe,
        p_grid_date: gridDate
      });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }

  async getUserAchievements(userId: string): Promise<any[]> {
    if (!userId) return [];

    try {
      const { data, error } = await supabase.rpc('get_user_achievements', {
        p_user_id: userId
      });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }
}

export const pokegridService = new PokegridService();
