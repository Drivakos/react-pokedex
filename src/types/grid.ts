/**
 * Grid game state types used in gridStore and pokegrid-game.utils.
 */
import type { GridCell, GridConstraint } from '../components/pokegrid/types';

// ---------------------------------------------------------------------------
// Progress / guess history (persisted in Supabase)
// ---------------------------------------------------------------------------

export interface SavedGuessHistory {
  sessionUndos: number;
  hasRecentMistake: boolean;
  mistakePokemon: { id: number } | null;
}

export interface GameProgressData {
  perfectGame?: boolean;
  guessHistory?: SavedGuessHistory;
  [key: string]: unknown;
}

export interface GameProgress {
  score: number;
  total_guesses: number;
  completed: boolean;
  game_data?: GameProgressData;
}

export interface GuessHistoryEntry {
  cell_id: string;
  pokemon_id: number;
  is_correct: boolean;
  attempts: number;
}

// ---------------------------------------------------------------------------
// Popularity (from Supabase leaderboard data)
// ---------------------------------------------------------------------------

export interface PopularityData {
  cell_id: string;
  pokemon_id: number;
  popularity_percentage?: number | null;
  count?: number;
}

// ---------------------------------------------------------------------------
// Undo action snapshot
// ---------------------------------------------------------------------------

export interface GameAction {
  cells: GridCell[];
  totalGuesses: number;
  score: number;
  selectedCell: string;
}

// ---------------------------------------------------------------------------
// Pre-generated grid configuration (from database)
// ---------------------------------------------------------------------------

export interface PreGeneratedConfig {
  constraints?: {
    rows: GridConstraint[];
    cols: GridConstraint[];
  };
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Constraint with embedded cell statistics metadata
// ---------------------------------------------------------------------------

export interface CellStat {
  row: number;
  col: number;
  count: number;
}

export type ConstraintWithMeta = GridConstraint & {
  meta?: { cellStats?: CellStat[] };
};
