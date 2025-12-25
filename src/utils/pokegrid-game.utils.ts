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

// Common starter Pokemon names for better detection (including all evolutions)
const STARTER_POKEMON = [
  // Gen 1
  'bulbasaur', 'ivysaur', 'venusaur',
  'charmander', 'charmeleon', 'charizard',
  'squirtle', 'wartortle', 'blastoise',
  // Gen 2
  'chikorita', 'bayleef', 'meganium',
  'cyndaquil', 'quilava', 'typhlosion',
  'totodile', 'croconaw', 'feraligatr',
  // Gen 3
  'treecko', 'grovyle', 'sceptile',
  'torchic', 'combusken', 'blaziken',
  'mudkip', 'marshtomp', 'swampert',
  // Gen 4
  'turtwig', 'grotle', 'torterra',
  'chimchar', 'monferno', 'infernape',
  'piplup', 'prinplup', 'empoleon',
  // Gen 5
  'snivy', 'servine', 'serperior',
  'tepig', 'pignite', 'emboar',
  'oshawott', 'dewott', 'samurott',
  // Gen 6
  'chespin', 'quilladin', 'chesnaught',
  'fennekin', 'braixen', 'delphox',
  'froakie', 'frogadier', 'greninja',
  // Gen 7
  'rowlet', 'decidueye',
  'litten', 'torracat', 'incineroar',
  'popplio', 'brionne', 'primarina',
  // Gen 8
  'grookey', 'thwackey', 'rillaboom',
  'scorbunny', 'raboot', 'cinderace',
  'sobble', 'drizzile', 'inteleon',
  // Gen 9
  'sprigatito', 'floragato', 'meowscarada',
  'fuecoco', 'crocalor', 'skeledirge',
  'quaxly', 'quaxwell', 'quaquaval'
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
    
    case 'evolution-stage': {
      const pokemonName = pokemon.name.toLowerCase();

      if (constraint.value === 'starter') {
        return STARTER_POKEMON.includes(pokemonName) ||
               pokemon.is_starter === true ||
               (pokemon.evolution_chain?.evolves_from === null && pokemon.has_evolutions);
      }
      if (constraint.value === 'first') {
        // First evolution - has evolved from something but can still evolve
        const hasEvolvedFrom = pokemon.evolution_chain?.evolves_from !== null &&
                              pokemon.evolution_chain?.evolves_from !== undefined;
        const canStillEvolve = pokemon.has_evolutions === true;
        return hasEvolvedFrom && canStillEvolve;
      }
      if (constraint.value === 'final') {
        // Final evolution - cannot evolve further
        return pokemon.has_evolutions === false ||
               pokemon.has_evolutions === null ||
               pokemon.has_evolutions === undefined;
      }
      if (constraint.value === 'none') {
        // No evolution - cannot evolve and has not evolved
        const neverEvolves = pokemon.has_evolutions === false ||
                            pokemon.has_evolutions === null ||
                            pokemon.has_evolutions === undefined;
        const hasNotEvolved = !pokemon.evolution_chain?.evolves_from;
        return neverEvolves && hasNotEvolved;
      }
      if (constraint.value === 'legendary') {
        return pokemon.is_legendary === true ||
               LEGENDARY_POKEMON.includes(pokemonName) ||
               (pokemon.base_experience && pokemon.base_experience > 300) ||
               pokemon.is_mythical === true; // Some mythicals are also treated as legendary
      }
      if (constraint.value === 'mythical') {
        return pokemon.is_mythical === true;
      }
      return false;
    }
    
    case 'type-count':
      if (constraint.value === 'single') return pokemon.types.length === 1;
      if (constraint.value === 'dual') return pokemon.types.length === 2;
      return false;
    
    case 'stat-range': {
      if (!pokemon.stats) return false; // No stat data available

      const statValue = constraint.value as string;

      // Handle HP stats
      if (statValue === 'hp-high') return (pokemon.stats.hp || 0) >= 100;
      if (statValue === 'hp-low') return (pokemon.stats.hp || 0) <= 50 && (pokemon.stats.hp || 0) > 0;

      // Handle Attack stats
      if (statValue === 'attack-high') return (pokemon.stats.attack || 0) >= 120;
      if (statValue === 'attack-low') return (pokemon.stats.attack || 0) <= 60 && (pokemon.stats.attack || 0) > 0;

      // Handle Defense stats
      if (statValue === 'defense-high') return (pokemon.stats.defense || 0) >= 100;
      if (statValue === 'defense-low') return (pokemon.stats.defense || 0) <= 60 && (pokemon.stats.defense || 0) > 0;

      // Handle Speed stats
      if (statValue === 'speed-high') return (pokemon.stats.speed || 0) >= 100;
      if (statValue === 'speed-low') return (pokemon.stats.speed || 0) <= 50 && (pokemon.stats.speed || 0) > 0;

      return false;
    }

    case 'height-weight': {
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
    }

    case 'move-category': {
      const moveValue = constraint.value as string;

      // Create normalized move list for better matching
      const normalizedMoves = pokemon.moves.map(move => {
        // Remove special characters, spaces, and convert to lowercase for matching
        return move.toLowerCase()
          .replace(/[^a-z0-9]/g, '') // Remove special chars
          .replace(/\s+/g, ''); // Remove spaces
      });

      // Also check original moves for exact matches
      const exactMoves = pokemon.moves.map(move => move.toLowerCase());

      const checkMove = (moveName: string) => {
        const normalized = moveName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedMoves.includes(normalized) || exactMoves.some(move => move.includes(moveName.toLowerCase()));
      };

      if (moveValue === 'earthquake') return checkMove('earthquake');
      if (moveValue === 'surf') return checkMove('surf') || checkMove('surface');
      if (moveValue === 'fly') return checkMove('fly') || checkMove('flying');
      if (moveValue === 'thunder-wave') return checkMove('thunder wave') || checkMove('thunderwave');
      if (moveValue === 'toxic') return checkMove('toxic');
      if (moveValue === 'ice-beam') return checkMove('ice beam') || checkMove('icebeam');
      return false;
    }

    case 'type-effectiveness': {
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
    }

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

export function generateDailyGrid(date: Date, preGeneratedConfig?: any): GridGame {
  const dateString = date.toISOString().split('T')[0];
  
  let rowConstraints: GridConstraint[];
  let colConstraints: GridConstraint[];
  
  if (preGeneratedConfig && preGeneratedConfig.constraints) {
    // Use pre-generated configuration from database
    rowConstraints = preGeneratedConfig.constraints.rows;
    colConstraints = preGeneratedConfig.constraints.cols;
  } else {
    // Fallback to seeded random generation
    const random = createSeededRandom(dateString);
    
    // Select 3 random type constraints for rows
    const shuffledTypes = shuffleArray(TYPE_CONSTRAINTS, random);
    rowConstraints = shuffledTypes.slice(0, 3);
    
    // Select 3 random other constraints for columns
    const shuffledOthers = shuffleArray(OTHER_CONSTRAINTS, random);
    colConstraints = shuffledOthers.slice(0, 3);
  }
  
  // Extract cell stats if available (embedded in first row constraint)
  const cellStats = (rowConstraints[0] as any).meta?.cellStats || [];

  // Generate cells
  const cells: GridCell[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      // Find valid solution count for this cell
      const stat = cellStats.find((s: any) => s.row === row && s.col === col);
      const possibleSolutions = stat ? stat.count : undefined;

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
        mistakeCount: 0,
        possibleSolutions // Store this for scoring
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
      // Base score increased to 200
      const baseScore = 200;
      
      // 1. GENEROUS POOL SIZE BONUS (Smaller pool = Harder = Significantly more points)
      let poolBonus = 0;
      if (cell.possibleSolutions !== undefined) {
        if (cell.possibleSolutions < 10) poolBonus = 300;      // Extreme (<10 solutions)
        else if (cell.possibleSolutions < 30) poolBonus = 200; // Very Hard
        else if (cell.possibleSolutions < 100) poolBonus = 100; // Hard
        else if (cell.possibleSolutions < 250) poolBonus = 50;  // Medium
        else if (cell.possibleSolutions < 500) poolBonus = 20;  // Fairly Common
      }

      // 2. ATTEMPT PENALTY
      const attemptPenalty = Math.max(0, cell.attempts - 1) * 20;

      // 3. RARITY MULTIPLIER (Based on User Selection % from DB)
      const cellPopularity = popularityData.find(
        (p: any) => p.cell_id === cell.id && p.pokemon_id === cell.pokemon?.id
      );

      let rarityMultiplier = 1.0;
      if (popularityData.length > 0 && cellPopularity && cellPopularity.popularity_percentage !== null) {
        const percentage = cellPopularity.popularity_percentage;
        
        // Max multiplier of 2.0 for the rarest finds
        if (percentage < 0.01) rarityMultiplier = 2.0;       // < 1% users
        else if (percentage < 0.05) rarityMultiplier = 1.75; // < 5% users
        else if (percentage < 0.15) rarityMultiplier = 1.5;  // < 15% users
        else if (percentage < 0.40) rarityMultiplier = 1.2;  // < 40% users
        else rarityMultiplier = 1.0;                         // Common pick
      } else if (cell.attempts > 1) {
        rarityMultiplier = Math.max(0.5, 1 - (cell.attempts - 1) * 0.1);
      } else {
        // Default rarity for first try when no data is available
        rarityMultiplier = 1.25;
      }

      // Calculate final cell score
      // Max possible: (200 + 300) * 2.0 = 1000
      const rawScore = (baseScore + poolBonus) * rarityMultiplier - attemptPenalty;
      const cellScore = Math.round(Math.max(10, Math.min(1000, rawScore)));

      return total + cellScore;
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

export function getEffectiveMaxGuesses(bonusRetries: number): number {
  return GAME_CONSTANTS.MAX_TOTAL_GUESSES + bonusRetries;
}

export function isOutOfGuesses(totalGuesses: number, bonusRetries: number): boolean {
  const maxEffectiveGuesses = getEffectiveMaxGuesses(bonusRetries);
  return totalGuesses >= maxEffectiveGuesses;
}
