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

// Type effectiveness chart for checking weaknesses and resistances
const TYPE_EFFECTIVENESS: Record<string, { weak_to: string[], resists: string[] }> = {
  fire: { weak_to: ['water', 'ground', 'rock'], resists: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'] },
  water: { weak_to: ['electric', 'grass'], resists: ['fire', 'water', 'ice', 'steel'] },
  grass: { weak_to: ['fire', 'ice', 'poison', 'flying', 'bug'], resists: ['water', 'electric', 'grass', 'ground'] },
  electric: { weak_to: ['ground'], resists: ['electric', 'flying', 'steel'] },
  psychic: { weak_to: ['bug', 'ghost', 'dark'], resists: ['fighting', 'psychic'] },
  ice: { weak_to: ['fire', 'fighting', 'rock', 'steel'], resists: ['ice'] },
  dragon: { weak_to: ['ice', 'dragon', 'fairy'], resists: ['fire', 'water', 'electric', 'grass'] },
  flying: { weak_to: ['electric', 'ice', 'rock'], resists: ['grass', 'fighting', 'bug'] },
  normal: { weak_to: ['fighting'], resists: [] },
  fighting: { weak_to: ['flying', 'psychic', 'fairy'], resists: ['rock', 'bug', 'dark'] },
  poison: { weak_to: ['ground', 'psychic'], resists: ['grass', 'fighting', 'poison', 'bug', 'fairy'] },
  ground: { weak_to: ['water', 'grass', 'ice'], resists: ['poison', 'rock'] },
  rock: { weak_to: ['water', 'grass', 'fighting', 'ground', 'steel'], resists: ['normal', 'fire', 'poison', 'flying'] },
  bug: { weak_to: ['fire', 'flying', 'rock'], resists: ['grass', 'fighting', 'ground'] },
  ghost: { weak_to: ['ghost', 'dark'], resists: ['poison', 'bug'] },
  steel: { weak_to: ['fire', 'fighting', 'ground'], resists: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'] },
  dark: { weak_to: ['fighting', 'bug', 'fairy'], resists: ['ghost', 'dark'] },
  fairy: { weak_to: ['poison', 'steel'], resists: ['fighting', 'bug', 'dark'] },
};

// Common starter Pokemon names for better detection
const STARTER_POKEMON = [
  'bulbasaur', 'charmander', 'squirtle', // Gen 1
  'chikorita', 'cyndaquil', 'totodile', // Gen 2
  'treecko', 'torchic', 'mudkip', // Gen 3
  'turtwig', 'chimchar', 'piplup', // Gen 4
  'snivy', 'tepig', 'oshawott', // Gen 5
  'chespin', 'fennekin', 'froakie', // Gen 6
  'rowlet', 'litten', 'popplio', // Gen 7
  'grookey', 'scorbunny', 'sobble', // Gen 8
  'sprigatito', 'fuecoco', 'quaxly', // Gen 9
];

// Legendary and Mythical Pokemon (partial list - would need complete data)
const LEGENDARY_POKEMON = [
  'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew',
  'raikou', 'entei', 'suicune', 'lugia', 'ho-oh', 'celebi',
  'regirock', 'regice', 'registeel', 'latios', 'latias', 'kyogre', 'groudon', 'rayquaza', 'jirachi', 'deoxys',
];

export function checkConstraint(pokemon: Pokemon, constraint: GridConstraint): boolean {
  switch (constraint.type) {
    case 'type':
      return pokemon.types.includes(constraint.value as string);
    
    case 'generation':
      return pokemon.generation === constraint.value;
    
    case 'evolution-stage':
      const pokemonName = pokemon.name.toLowerCase();
      
      if (constraint.value === 'starter') {
        return STARTER_POKEMON.includes(pokemonName) || pokemon.is_starter === true;
      }
      if (constraint.value === 'first') {
        // First evolution - has evolved from something but can still evolve
        return pokemon.evolution_chain?.evolves_from && pokemon.has_evolutions;
      }
      if (constraint.value === 'final') {
        return !pokemon.has_evolutions;
      }
      if (constraint.value === 'none') {
        return !pokemon.has_evolutions && !pokemon.evolution_chain?.evolves_from;
      }
      if (constraint.value === 'legendary') {
        return pokemon.is_legendary === true || 
               LEGENDARY_POKEMON.includes(pokemonName) ||
               pokemon.base_experience > 300;
      }
      if (constraint.value === 'mythical') {
        return pokemon.is_mythical === true;
      }
      return false;
    
    case 'type-count':
      if (constraint.value === 'single') return pokemon.types.length === 1;
      if (constraint.value === 'dual') return pokemon.types.length === 2;
      return false;
    
    case 'stat-range':
      if (!pokemon.stats) return false; // No stat data available
      
      const statValue = constraint.value as string;
      if (statValue === 'hp-high') return pokemon.stats.hp >= 100;
      if (statValue === 'hp-low') return pokemon.stats.hp <= 50;
      if (statValue === 'attack-high') return pokemon.stats.attack >= 120;
      if (statValue === 'attack-low') return pokemon.stats.attack <= 60;
      if (statValue === 'defense-high') return pokemon.stats.defense >= 100;
      if (statValue === 'defense-low') return pokemon.stats.defense <= 60;
      if (statValue === 'speed-high') return pokemon.stats.speed >= 100;
      if (statValue === 'speed-low') return pokemon.stats.speed <= 50;
      return false;
    
    case 'height-weight':
      const sizeValue = constraint.value as string;
      if (sizeValue === 'small') {
        return pokemon.height < 10 && pokemon.weight < 300; // height in decimeters, weight in hectograms
      }
      if (sizeValue === 'medium') {
        return pokemon.height >= 10 && pokemon.height <= 20;
      }
      if (sizeValue === 'large') {
        return pokemon.height > 20 || pokemon.weight > 1000;
      }
      if (sizeValue === 'light') {
        return pokemon.weight < 100; // < 10kg
      }
      if (sizeValue === 'heavy') {
        return pokemon.weight > 2000; // > 200kg
      }
      return false;
    
    case 'move-category':
      const moveValue = constraint.value as string;
      const pokemonMoves = pokemon.moves.map(move => move.toLowerCase().replace(/[^a-z]/g, ''));
      
      if (moveValue === 'earthquake') return pokemonMoves.includes('earthquake');
      if (moveValue === 'surf') return pokemonMoves.includes('surf');
      if (moveValue === 'fly') return pokemonMoves.includes('fly');
      if (moveValue === 'thunder-wave') return pokemonMoves.includes('thunderwave');
      if (moveValue === 'toxic') return pokemonMoves.includes('toxic');
      if (moveValue === 'ice-beam') return pokemonMoves.includes('icebeam');
      return false;
    
    case 'type-effectiveness':
      const effectValue = constraint.value as string;
      
      if (effectValue.startsWith('weak-')) {
        const attackingType = effectValue.replace('weak-', '');
        return pokemon.types.some(type => 
          TYPE_EFFECTIVENESS[type]?.weak_to.includes(attackingType)
        );
      }
      
      if (effectValue.startsWith('resist-')) {
        const attackingType = effectValue.replace('resist-', '');
        return pokemon.types.some(type => 
          TYPE_EFFECTIVENESS[type]?.resists.includes(attackingType)
        );
      }
      
      return false;
    
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
