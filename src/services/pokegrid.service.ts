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

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  score: number;
  completed_at: string;
  perfect_game: boolean;
  total_guesses: number;
  rank: number;
  is_current_user?: boolean;
}

export interface WeeklyHistoryDay {
  grid_date: string;
  completed: boolean;
  score: number;
  total_guesses: number;
  perfect_game: boolean;
  rank_among_friends: number;
  friends_completed_count: number;
}

class PokegridService {
  private cache: Record<string, { data: any; timestamp: number }> = {};
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private getFromCache(key: string) {
    const cached = this.cache[key];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setInCache(key: string, data: any) {
    this.cache[key] = { data, timestamp: Date.now() };
  }

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
        p_grid_date: gridDate instanceof Date ? gridDate.toISOString().split('T')[0] : gridDate,
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

  async loadGridConfiguration(gridDate: string): Promise<any | null> {
    try {
      const { data, error } = await supabase.rpc('get_pokegrid_configuration', {
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

  async saveGridConfiguration(
    gridDate: string,
    configuration: any,
    difficulty: string = 'medium',
    seed?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('save_pokegrid_configuration', {
        p_grid_date: gridDate,
        p_configuration: configuration,
        p_difficulty_level: difficulty,
        p_generation_seed: seed
      });

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async getWeeklyLeaderboard(startDate: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_weekly_pokegrid_leaderboard', {
        p_start_date: startDate,
        p_limit: limit
      });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }

  async getUserStats(userId: string): Promise<any> {
    if (!userId) return null;

    const cacheKey = `stats_${userId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_user_pokegrid_stats', {
        p_user_id: userId
      });

      const result = data?.[0] || {
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

      if (!error) {
        this.setInCache(cacheKey, result);
      }

      return result;
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

    const cacheKey = `achievements_${userId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_user_achievements', {
        p_user_id: userId
      });

      const result = data || [];
      if (!error) {
        this.setInCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get friends-only leaderboard for a specific timeframe and date
   */
  async getFriendsLeaderboard(
    userId: string,
    timeframe: 'daily' | 'weekly' | 'all-time',
    gridDate?: string
  ): Promise<LeaderboardEntry[]> {
    if (!userId) return [];

    try {
      const { data, error } = await supabase.rpc('get_pokegrid_friends_leaderboard', {
        p_user_id: userId,
        p_timeframe: timeframe,
        p_grid_date: gridDate
      });

      if (error) {
        console.error('Error fetching friends leaderboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getFriendsLeaderboard:', error);
      return [];
    }
  }

  /**
   * Get user's weekly history (last 7 days)
   */
  async getWeeklyHistory(userId: string): Promise<WeeklyHistoryDay[]> {
    if (!userId) return [];

    try {
      const { data, error } = await supabase.rpc('get_user_weekly_history', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching weekly history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getWeeklyHistory:', error);
      return [];
    }
  }

  /**
   * Check if user has completed a specific date
   */
  async hasUserCompletedDate(userId: string, gridDate: string): Promise<boolean> {
    if (!userId) return false;

    try {
      const { data, error } = await supabase
        .from('pokegrid_progress')
        .select('completed')
        .eq('user_id', userId)
        .eq('grid_date', gridDate)
        .single();

      if (error) {
        return false;
      }

      return data?.completed || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all user submissions for a specific date (for friends view)
   */
  async getUserSubmissionsForDate(gridDate: string, userIds: string[]): Promise<any[]> {
    if (userIds.length === 0) return [];

    try {
      const { data, error } = await supabase
        .from('pokegrid_progress')
        .select(`
          user_id,
          completed,
          score,
          total_guesses,
          game_data,
          completed_at
        `)
        .eq('grid_date', gridDate)
        .in('user_id', userIds);

      if (error) {
        console.error('Error fetching user submissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserSubmissionsForDate:', error);
      return [];
    }
  }
}

export const pokegridService = new PokegridService();