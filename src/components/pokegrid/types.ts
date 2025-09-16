import { Pokemon } from '../../types/pokemon';

// Enhanced constraint types for authentic PokéGrid experience
export type ConstraintType = 
  | 'type' 
  | 'generation' 
  | 'evolution-stage'
  | 'stat-range'
  | 'height-weight'
  | 'move-category'
  | 'type-effectiveness'
  | 'type-count';

export interface GridConstraint {
  id: string;
  type: ConstraintType;
  value: string;
  label: string;
  description: string;
  icon: string;
  svgIcon?: string;
}

export interface GridCellData {
  id: string;
  row: number;
  col: number;
  pokemon: Pokemon | null;
  isCorrect: boolean;
  attempts: number;
  rarity: number;
  isLocked: boolean;
}

// Extend the imported GridCellData with additional properties for game logic
export interface GridCell extends GridCellData {
  rowConstraint: GridConstraint;
  colConstraint: GridConstraint;
  hasMistake?: boolean; // Track if this cell had a wrong guess
  mistakeCount?: number; // Number of wrong guesses on this cell
}

export interface GridGame {
  id: string;
  date: string;
  size: 3;
  cells: GridCell[];
  constraints: {
    rows: GridConstraint[];
    cols: GridConstraint[];
  };
  score: number;
  completed: boolean;
  perfectGame: boolean;
  startTime: Date;
  endTime?: Date;
  totalGuesses: number;
  correctGuesses: number;
  streak: number;
}
