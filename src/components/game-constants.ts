// Game Constants - extracted from PokemonMemoryMatch to avoid CSS import issues in tests
export const GAME_CONSTANTS = {
  // Animation timings (ms)
  MATCH_ANIMATION_DELAY: 600,
  MISMATCH_ANIMATION_DELAY: 600,
  CELEBRATION_DURATION: 600,
  TIMER_INTERVAL: 1000,

  // Scoring system
  BASE_SCORE: 1000,
  MOVE_PENALTY: 10,
  TIME_PENALTY: 2,
  MINIMUM_SCORE: 100,

  // Difficulty levels
  DIFFICULTY_LEVELS: {
    easy: { pairs: 6, grid: '3x4' },
    medium: { pairs: 8, grid: '4x4' },
    hard: { pairs: 12, grid: '4x6' }
  },

  // UI measurements
  STATS_PANEL_WIDTH: 140,
  PROGRESS_BAR_HEIGHT: 3,
  TOUCH_TARGET_SIZE: 44,

  // Game mechanics
  MAX_FLIPPED_CARDS: 2,
} as const;
