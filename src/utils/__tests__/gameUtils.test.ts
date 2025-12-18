import { GAME_CONSTANTS } from '../../components/game-constants';

// Test utility functions that might be extracted from the component
describe('Game Utility Functions', () => {
  describe('Score Calculation', () => {
    const calculateScore = (moves: number, time: number) => {
      const clampedMoves = Math.max(0, moves);
      const clampedTime = Math.max(0, time);
      return Math.max(
        GAME_CONSTANTS.BASE_SCORE -
        (clampedMoves * GAME_CONSTANTS.MOVE_PENALTY) -
        (clampedTime * GAME_CONSTANTS.TIME_PENALTY),
        GAME_CONSTANTS.MINIMUM_SCORE
      );
    };

    it('calculates perfect score', () => {
      expect(calculateScore(0, 0)).toBe(GAME_CONSTANTS.BASE_SCORE);
    });

    it('applies move penalties correctly', () => {
      const score = calculateScore(5, 0);
      expect(score).toBe(GAME_CONSTANTS.BASE_SCORE - (5 * GAME_CONSTANTS.MOVE_PENALTY));
    });

    it('applies time penalties correctly', () => {
      const score = calculateScore(0, 5);
      expect(score).toBe(GAME_CONSTANTS.BASE_SCORE - (5 * GAME_CONSTANTS.TIME_PENALTY));
    });

    it('applies both penalties correctly', () => {
      const score = calculateScore(3, 4);
      const expected = GAME_CONSTANTS.BASE_SCORE -
                      (3 * GAME_CONSTANTS.MOVE_PENALTY) -
                      (4 * GAME_CONSTANTS.TIME_PENALTY);
      expect(score).toBe(expected);
    });

    it('enforces minimum score', () => {
      const score = calculateScore(200, 500);
      expect(score).toBe(GAME_CONSTANTS.MINIMUM_SCORE);
    });

    it('handles edge cases', () => {
      expect(calculateScore(-1, -1)).toBe(GAME_CONSTANTS.BASE_SCORE);
      expect(calculateScore(0, 0)).toBe(GAME_CONSTANTS.BASE_SCORE);
    });
  });

  describe('Time Formatting', () => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    it('formats single digit seconds correctly', () => {
      expect(formatTime(5)).toBe('0:05');
      expect(formatTime(59)).toBe('0:59');
    });

    it('formats minutes and seconds correctly', () => {
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(125)).toBe('2:05');
      expect(formatTime(3599)).toBe('59:59');
    });

    it('handles zero correctly', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('handles large numbers', () => {
      expect(formatTime(3661)).toBe('61:01'); // 61 minutes, 1 second
    });
  });

  describe('Game Completion Logic', () => {
    const isGameComplete = (matchedPairs: number, totalPairs: number) => {
      return matchedPairs === totalPairs && totalPairs > 0;
    };

    it('returns true when all pairs are matched', () => {
      expect(isGameComplete(6, 6)).toBe(true);
      expect(isGameComplete(8, 8)).toBe(true);
      expect(isGameComplete(12, 12)).toBe(true);
    });

    it('returns false when pairs are not fully matched', () => {
      expect(isGameComplete(5, 6)).toBe(false);
      expect(isGameComplete(0, 6)).toBe(false);
      expect(isGameComplete(7, 8)).toBe(false);
    });

    it('returns false when total pairs is 0', () => {
      expect(isGameComplete(0, 0)).toBe(false);
      expect(isGameComplete(5, 0)).toBe(false);
    });

    it('handles edge cases', () => {
      expect(isGameComplete(-1, 6)).toBe(false);
      expect(isGameComplete(6, -1)).toBe(false);
    });
  });

  describe('Grid Layout Calculation', () => {
    const getGridClasses = (difficulty: string): string => {
      const grid = GAME_CONSTANTS.DIFFICULTY_LEVELS[difficulty as keyof typeof GAME_CONSTANTS.DIFFICULTY_LEVELS]?.grid;
      switch (grid) {
        case '3x4':
          return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
        case '4x4':
          return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
        case '4x6':
          return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
        default:
          return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
      }
    };

    it('returns correct classes for easy difficulty', () => {
      expect(getGridClasses('easy')).toBe('grid-cols-2 sm:grid-cols-3 md:grid-cols-4');
    });

    it('returns correct classes for medium difficulty', () => {
      expect(getGridClasses('medium')).toBe('grid-cols-2 sm:grid-cols-3 md:grid-cols-4');
    });

    it('returns correct classes for hard difficulty', () => {
      expect(getGridClasses('hard')).toBe('grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6');
    });

    it('returns default classes for invalid difficulty', () => {
      expect(getGridClasses('invalid')).toBe('grid-cols-2 sm:grid-cols-3 md:grid-cols-4');
      expect(getGridClasses('')).toBe('grid-cols-2 sm:grid-cols-3 md:grid-cols-4');
    });
  });

  describe('Progress Calculation', () => {
    const calculateProgress = (matchedPairs: number, totalPairs: number): number => {
      if (totalPairs === 0) return 0;
      return Math.round((matchedPairs / totalPairs) * 100);
    };

    it('calculates progress correctly', () => {
      expect(calculateProgress(3, 6)).toBe(50);
      expect(calculateProgress(6, 6)).toBe(100);
      expect(calculateProgress(0, 6)).toBe(0);
    });

    it('handles division by zero', () => {
      expect(calculateProgress(0, 0)).toBe(0);
      expect(calculateProgress(5, 0)).toBe(0);
    });

    it('rounds to nearest percentage', () => {
      expect(calculateProgress(1, 3)).toBe(33); // 33.33... rounds to 33
      expect(calculateProgress(2, 3)).toBe(67); // 66.66... rounds to 67
    });
  });

  describe('Pokemon Validation', () => {
    const isValidPokemon = (pokemon: any): boolean => {
      if (!pokemon) return false;
      if (typeof pokemon.id !== 'number') return false;
      if (!pokemon.name) return false;
      if (typeof pokemon.name !== 'string') return false;
      if (pokemon.name.trim().length === 0) return false;
      return true;
    };

    it('validates correct Pokemon data', () => {
      const validPokemon = {
        id: 1,
        name: 'bulbasaur',
        types: ['grass'],
        sprites: {},
        generation: 'generation-i'
      };
      expect(isValidPokemon(validPokemon)).toBe(true);
    });

    it('rejects Pokemon without id', () => {
      const invalidPokemon = {
        name: 'bulbasaur',
        types: ['grass']
      };
      expect(isValidPokemon(invalidPokemon)).toBe(false);
    });

    it('rejects Pokemon without name', () => {
      const invalidPokemon = {
        id: 1,
        types: ['grass']
      };
      expect(isValidPokemon(invalidPokemon)).toBe(false);
    });

    it('rejects Pokemon with empty name', () => {
      const invalidPokemon = {
        id: 1,
        name: '',
        types: ['grass']
      };
      expect(isValidPokemon(invalidPokemon)).toBe(false);
    });

    it('rejects null or undefined Pokemon', () => {
      expect(isValidPokemon(null)).toBe(false);
      expect(isValidPokemon(undefined)).toBe(false);
      expect(isValidPokemon({})).toBe(false);
    });
  });

  describe('Touch Target Validation', () => {
    it('ensures minimum touch target size', () => {
      expect(GAME_CONSTANTS.TOUCH_TARGET_SIZE).toBeGreaterThanOrEqual(44);
    });

    it('validates button sizing constants', () => {
      expect(GAME_CONSTANTS.STATS_PANEL_WIDTH).toBeGreaterThan(0);
      expect(GAME_CONSTANTS.PROGRESS_BAR_HEIGHT).toBeGreaterThan(0);
    });
  });

  describe('Animation Timing Validation', () => {
    it('has reasonable animation delays', () => {
      expect(GAME_CONSTANTS.MATCH_ANIMATION_DELAY).toBeGreaterThan(0);
      expect(GAME_CONSTANTS.MISMATCH_ANIMATION_DELAY).toBeGreaterThan(0);
      expect(GAME_CONSTANTS.CELEBRATION_DURATION).toBeGreaterThan(0);
      expect(GAME_CONSTANTS.TIMER_INTERVAL).toBeGreaterThan(0);
    });

    it('uses standard timer interval', () => {
      expect(GAME_CONSTANTS.TIMER_INTERVAL).toBe(1000); // 1 second
    });
  });
});
