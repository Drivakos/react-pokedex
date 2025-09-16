import { Pokemon } from '../types/pokemon';
import type { GridGame, GridCell, GridConstraint } from '../components/pokegrid';
import { TYPE_CONSTRAINTS, OTHER_CONSTRAINTS, GAME_CONSTANTS } from '../components/pokegrid/constants';

export function generateGridId(date: string): string {
  return `grid-${date}`;
}

export function createSeededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return function() {
    hash = ((hash * 9301) + 49297) % 233280;
    return hash / 233280;
  };
}

export function checkConstraint(pokemon: Pokemon, constraint: GridConstraint): boolean {
  switch (constraint.type) {
    case 'type':
      return pokemon.types.includes(constraint.value);
    
    case 'generation':
      return pokemon.generation === constraint.value;
    
    case 'evolution-stage':
      if (constraint.value === 'starter') {
        return pokemon.name.toLowerCase().includes('bulbasaur') || 
               pokemon.name.toLowerCase().includes('charmander') || 
               pokemon.name.toLowerCase().includes('squirtle');
      }
      if (constraint.value === 'final') {
        return !pokemon.has_evolutions;
      }
      if (constraint.value === 'legendary') {
        return pokemon.base_experience > 300;
      }
      return false;
    
    case 'type-count':
      if (constraint.value === 'single') return pokemon.types.length === 1;
      if (constraint.value === 'dual') return pokemon.types.length === 2;
      return false;
    
    case 'stat-range':
      // Note: This would need actual stat data from Pokemon
      return true; // Placeholder for now
    
    case 'height-weight':
      if (constraint.value === 'small') {
        return pokemon.height < 10 && pokemon.weight < 300;
      }
      if (constraint.value === 'large') {
        return pokemon.height > 20 || pokemon.weight > 1000;
      }
      return false;
    
    case 'move-category':
      return pokemon.moves.length > 0; // Simplified check
    
    default:
      return false;
  }
}

export function shuffleArray<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateDailyGrid(date: Date): GridGame {
  const dateString = date.toISOString().split('T')[0];
  const random = createSeededRandom(dateString);
  
  // Select 3 random type constraints for rows
  const shuffledTypes = shuffleArray(TYPE_CONSTRAINTS, random);
  const rowConstraints = shuffledTypes.slice(0, 3);
  
  // Select 3 random other constraints for columns
  const shuffledOthers = shuffleArray(OTHER_CONSTRAINTS, random);
  const colConstraints = shuffledOthers.slice(0, 3);
  
  // Generate cells
  const cells: GridCell[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      cells.push({
        id: `cell-${row}-${col}`,
        row,
        col,
        pokemon: null,
        isCorrect: false,
        attempts: 0,
        rarity: 0,
        isLocked: false,
        rowConstraint: rowConstraints[row],
        colConstraint: colConstraints[col],
        hasMistake: false,
        mistakeCount: 0
      });
    }
  }
  
  return {
    id: generateGridId(dateString),
    date: dateString,
    size: 3,
    cells,
    constraints: {
      rows: rowConstraints,
      cols: colConstraints
    },
    score: 0,
    completed: false,
    perfectGame: false,
    startTime: new Date(),
    totalGuesses: 0,
    correctGuesses: 0,
    streak: 0
  };
}

export function generateEndlessGrid(): GridGame {
  const random = Math.random;
  
  // Select 3 random type constraints for rows
  const shuffledTypes = shuffleArray(TYPE_CONSTRAINTS, random);
  const rowConstraints = shuffledTypes.slice(0, 3);
  
  // Select 3 random other constraints for columns
  const shuffledOthers = shuffleArray(OTHER_CONSTRAINTS, random);
  const colConstraints = shuffledOthers.slice(0, 3);
  
  // Generate cells
  const cells: GridCell[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      cells.push({
        id: `cell-${row}-${col}`,
        row,
        col,
        pokemon: null,
        isCorrect: false,
        attempts: 0,
        rarity: 0,
        isLocked: false,
        rowConstraint: rowConstraints[row],
        colConstraint: colConstraints[col],
        hasMistake: false,
        mistakeCount: 0
      });
    }
  }
  
  const endlessId = `endless-${Date.now()}`;
  
  return {
    id: endlessId,
    date: new Date().toISOString().split('T')[0],
    size: 3,
    cells,
    constraints: {
      rows: rowConstraints,
      cols: colConstraints
    },
    score: 0,
    completed: false,
    perfectGame: false,
    startTime: new Date(),
    totalGuesses: 0,
    correctGuesses: 0,
    streak: 0
  };
}

export function calculateScore(
  cells: GridCell[], 
  popularityData: any[] = []
): number {
  return cells.reduce((total, cell) => {
    if (cell.isCorrect && cell.pokemon) {
      const baseScore = 100;
      const rarityBonus = cell.rarity * 20;
      const attemptPenalty = Math.max(0, cell.attempts - 1) * 10;

      // Find popularity data for this cell and pokemon
      const cellPopularity = popularityData.find(
        (p: any) => p.cell_id === cell.id && p.pokemon_id === cell.pokemon?.id
      );

      let popularityMultiplier = 1.0;
      if (popularityData.length > 0 && cellPopularity && cellPopularity.popularity_percentage !== null) {
        // Inverse relationship: more popular = lower score, less popular = higher score
        if (cellPopularity.popularity_percentage < 0.1) {
          popularityMultiplier = 2.0; // High bonus for very rare guesses
        } else if (cellPopularity.popularity_percentage < 0.25) {
          popularityMultiplier = 1.5; // Good bonus for uncommon guesses
        } else if (cellPopularity.popularity_percentage < 0.5) {
          popularityMultiplier = 1.2; // Moderate bonus
        } else if (cellPopularity.popularity_percentage < 0.75) {
          popularityMultiplier = 0.9; // Small penalty for somewhat popular
        } else {
          popularityMultiplier = 0.7; // Larger penalty for very popular guesses
        }
      } else if (cell.attempts > 1) {
        // Fallback scoring with attempt penalty
        popularityMultiplier = Math.max(0.5, 1 - (cell.attempts - 1) * 0.1);
      }

      const cellScore = Math.round((baseScore + rarityBonus) * popularityMultiplier - attemptPenalty);
      return total + Math.max(0, cellScore);
    }
    return total;
  }, 0);
}

export function isGameCompleted(cells: GridCell[]): boolean {
  return cells.every(cell => cell.pokemon && cell.isCorrect);
}

export function isPerfectGame(cells: GridCell[]): boolean {
  return isGameCompleted(cells) && cells.every(cell => cell.attempts === 1);
}

export function getEffectiveMaxGuesses(bonusRetries: number, perfectGame: boolean): number {
  return GAME_CONSTANTS.MAX_TOTAL_GUESSES + (perfectGame ? GAME_CONSTANTS.BONUS_RETRIES : 0);
}

export function isOutOfGuesses(totalGuesses: number, bonusRetries: number, perfectGame: boolean): boolean {
  const maxEffectiveGuesses = getEffectiveMaxGuesses(bonusRetries, perfectGame);
  return totalGuesses >= maxEffectiveGuesses;
}
