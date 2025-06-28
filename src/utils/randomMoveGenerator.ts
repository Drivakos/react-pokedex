import { BattleMove } from './battleEngine';
import { fetchMoveDetails, convertToBattleMove } from '../services/moves';

const REST_ENDPOINT = import.meta.env.VITE_API_REST_URL || import.meta.env.VITE_API_URL || 'https://pokeapi.co/api/v2';

export interface LearnMethodFilter {
  levelUp?: boolean;
  machine?: boolean; // TMs and TRs
  tutor?: boolean;
  egg?: boolean;
  reminder?: boolean; // Move reminder
  maxLevel?: number; // Only include moves learned at or below this level
}

export interface MoveGenerationOptions {
  maxMoves?: number;
  learnMethods?: LearnMethodFilter;
  minDamageMoves?: number; // Minimum number of damaging moves
  maxStatusMoves?: number; // Maximum number of status moves
  prioritizeSTAB?: boolean; // Prioritize Same Type Attack Bonus moves
  balanceTypes?: boolean; // Try to balance move types for coverage
  level?: number; // Pokemon's current level (affects level-up moves)
}

export interface PokemonMoveEntry {
  move: {
    name: string;
    url: string;
  };
  version_group_details: Array<{
    level_learned_at: number;
    move_learn_method: {
      name: string;
    };
    version_group: {
      name: string;
    };
  }>;
}

export interface DetailedMoveInfo extends BattleMove {
  learnMethod: string;
  levelLearned: number;
  isSTAB: boolean;
  isCoverage: boolean;
}

// Cache for Pokemon move data with learn methods
const pokemonDetailedMoveCache = new Map<number, PokemonMoveEntry[]>();

/**
 * Fetch detailed move data for a Pokemon including learn methods
 */
export async function fetchPokemonDetailedMoves(pokemonId: number): Promise<PokemonMoveEntry[]> {
  // Check cache first
  if (pokemonDetailedMoveCache.has(pokemonId)) {
    return pokemonDetailedMoveCache.get(pokemonId)!;
  }

  try {
    const response = await fetch(`${REST_ENDPOINT}/pokemon/${pokemonId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokemon: ${pokemonId}`);
    }
    
    const pokemonData = await response.json();
    const moves = pokemonData.moves as PokemonMoveEntry[];
    
    pokemonDetailedMoveCache.set(pokemonId, moves);
    return moves;
  } catch (error) {
    console.error(`Error fetching detailed moves for Pokemon ${pokemonId}:`, error);
    throw error;
  }
}

/**
 * Filter moves based on learn method and other criteria
 */
export function filterMovesByLearnMethod(
  moves: PokemonMoveEntry[], 
  filter: LearnMethodFilter,
  level: number = 50
): PokemonMoveEntry[] {
  return moves.filter(moveEntry => {
    // Get the most recent version group details
    const details = moveEntry.version_group_details[0];
    if (!details) return false;

    const learnMethod = details.move_learn_method.name;
    const levelLearned = details.level_learned_at;

    // Filter by learn method
    if (filter.levelUp && learnMethod === 'level-up') {
      // Check level requirement
      if (filter.maxLevel && levelLearned > filter.maxLevel) return false;
      if (levelLearned > level) return false; // Can't learn moves above current level
      return true;
    }
    
    if (filter.machine && (learnMethod === 'machine' || learnMethod === 'tm' || learnMethod === 'tr')) {
      return true;
    }
    
    if (filter.tutor && (learnMethod === 'tutor' || learnMethod === 'move-tutor')) {
      return true;
    }
    
    if (filter.egg && learnMethod === 'egg') {
      return true;
    }
    
    if (filter.reminder && learnMethod === 'reminder') {
      return true;
    }

    return false;
  });
}

/**
 * Get Pokemon types for STAB calculation
 */
export async function fetchPokemonTypes(pokemonId: number): Promise<string[]> {
  try {
    const response = await fetch(`${REST_ENDPOINT}/pokemon/${pokemonId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokemon: ${pokemonId}`);
    }
    
    const pokemonData = await response.json();
    return pokemonData.types.map((type: any) => type.type.name);
  } catch (error) {
    console.error(`Error fetching types for Pokemon ${pokemonId}:`, error);
    return ['normal'];
  }
}

/**
 * Generate a random moveset for a Pokemon
 */
export async function generateRandomMoveset(
  pokemonId: number,
  options: MoveGenerationOptions = {}
): Promise<BattleMove[]> {
  const {
    maxMoves = 4,
    learnMethods = { levelUp: true, machine: true },
    minDamageMoves = 2,
    maxStatusMoves = 2,
    prioritizeSTAB = true,
    balanceTypes = true,
    level = 50
  } = options;

  try {
    // Fetch Pokemon data
    const [allMoves, pokemonTypes] = await Promise.all([
      fetchPokemonDetailedMoves(pokemonId),
      fetchPokemonTypes(pokemonId)
    ]);

    if (allMoves.length === 0) {
      console.warn(`No moves found for Pokemon ${pokemonId}, using fallback`);
      return getRandomFallbackMoveset(pokemonTypes, maxMoves);
    }

    // Filter moves by learn method
    let filteredMoves = filterMovesByLearnMethod(allMoves, learnMethods, level);
    
    if (filteredMoves.length === 0) {
      console.warn(`No moves found matching criteria for Pokemon ${pokemonId}, expanding search`);
      // Expand search to include more methods
      filteredMoves = filterMovesByLearnMethod(allMoves, { 
        levelUp: true, 
        machine: true, 
        tutor: true,
        maxLevel: level + 10 
      }, level);
    }

    if (filteredMoves.length === 0) {
      return getRandomFallbackMoveset(pokemonTypes, maxMoves);
    }

    // Convert to battle moves with metadata
    const detailedMoves: DetailedMoveInfo[] = [];
    
    // Limit the number of API calls to prevent timeouts
    const movesToProcess = filteredMoves.slice(0, 30);
    
    for (const moveEntry of movesToProcess) {
      try {
        const moveData = await fetchMoveDetails(moveEntry.move.name);
        const battleMove = convertToBattleMove(moveData);
        const details = moveEntry.version_group_details[0];
        
        const detailedMove: DetailedMoveInfo = {
          ...battleMove,
          learnMethod: details.move_learn_method.name,
          levelLearned: details.level_learned_at,
          isSTAB: pokemonTypes.includes(moveData.type.name),
          isCoverage: !pokemonTypes.includes(moveData.type.name) && battleMove.power > 0
        };
        
        detailedMoves.push(detailedMove);
      } catch (error) {
        console.warn(`Failed to fetch details for move ${moveEntry.move.name}:`, error);
        continue;
      }
    }

    if (detailedMoves.length === 0) {
      return getRandomFallbackMoveset(pokemonTypes, maxMoves);
    }

    // Categorize moves
    const damageMoves = detailedMoves.filter(move => move.power > 0);
    const statusMoves = detailedMoves.filter(move => move.power === 0);
    const stabMoves = detailedMoves.filter(move => move.isSTAB && move.power > 0);
    const coverageMoves = detailedMoves.filter(move => move.isCoverage);

    const selectedMoves: BattleMove[] = [];
    const usedTypes = new Set<string>();

    // Helper function to add a move
    const addMove = (move: DetailedMoveInfo): boolean => {
      if (selectedMoves.length >= maxMoves) return false;
      if (selectedMoves.some(m => m.name === move.name)) return false;
      
      selectedMoves.push({
        name: move.name,
        type: move.type,
        power: move.power,
        accuracy: move.accuracy,
        pp: move.pp,
        currentPP: move.currentPP,
        damageClass: move.damageClass,
        priority: move.priority,
        effect: move.effect,
        target: move.target,
        description: move.description
      });
      
      usedTypes.add(move.type);
      return true;
    };

    // 1. Add STAB moves first if prioritized
    if (prioritizeSTAB && stabMoves.length > 0) {
      const shuffledSTAB = [...stabMoves].sort(() => Math.random() - 0.5);
      let addedSTAB = 0;
      const maxSTAB = Math.min(2, Math.floor(maxMoves / 2)); // Up to half the moves can be STAB
      
      for (const move of shuffledSTAB) {
        if (addedSTAB >= maxSTAB || selectedMoves.length >= maxMoves) break;
        if (addMove(move)) {
          addedSTAB++;
        }
      }
    }

    // 2. Ensure minimum damage moves
    const currentDamageMoves = selectedMoves.filter(m => m.power > 0).length;
    const needMoreDamage = minDamageMoves - currentDamageMoves;
    
    if (needMoreDamage > 0) {
      const availableDamage = damageMoves.filter(move => 
        !selectedMoves.some(m => m.name === move.name)
      );
      
      const shuffledDamage = [...availableDamage].sort(() => Math.random() - 0.5);
      let addedDamage = 0;
      
      for (const move of shuffledDamage) {
        if (addedDamage >= needMoreDamage || selectedMoves.length >= maxMoves) break;
        if (addMove(move)) {
          addedDamage++;
        }
      }
    }

    // 3. Add coverage moves for type balance
    if (balanceTypes && selectedMoves.length < maxMoves) {
      const availableCoverage = coverageMoves.filter(move => 
        !selectedMoves.some(m => m.name === move.name) &&
        !usedTypes.has(move.type)
      );
      
      const shuffledCoverage = [...availableCoverage].sort(() => Math.random() - 0.5);
      let addedCoverage = 0;
      const maxCoverage = Math.min(2, maxMoves - selectedMoves.length);
      
      for (const move of shuffledCoverage) {
        if (addedCoverage >= maxCoverage || selectedMoves.length >= maxMoves) break;
        if (addMove(move)) {
          addedCoverage++;
        }
      }
    }

    // 4. Add status moves (limited by maxStatusMoves)
    const currentStatusMoves = selectedMoves.filter(m => m.power === 0).length;
    const canAddStatus = Math.min(
      maxStatusMoves - currentStatusMoves,
      maxMoves - selectedMoves.length
    );
    
    if (canAddStatus > 0 && statusMoves.length > 0) {
      const strategicStatusMoves = statusMoves.filter(move => 
        ['protect', 'toxic', 'thunder-wave', 'will-o-wisp', 'recover', 'rest', 'swords-dance', 'calm-mind', 'dragon-dance'].includes(move.name)
      );
      
      const availableStatus = (strategicStatusMoves.length > 0 ? strategicStatusMoves : statusMoves)
        .filter(move => !selectedMoves.some(m => m.name === move.name));
      
      const shuffledStatus = [...availableStatus].sort(() => Math.random() - 0.5);
      let addedStatus = 0;
      
      for (const move of shuffledStatus) {
        if (addedStatus >= canAddStatus || selectedMoves.length >= maxMoves) break;
        if (addMove(move)) {
          addedStatus++;
        }
      }
    }

    // 5. Fill remaining slots with random moves
    if (selectedMoves.length < maxMoves) {
      const remainingMoves = detailedMoves
        .filter(move => !selectedMoves.some(m => m.name === move.name))
        .sort(() => Math.random() - 0.5);
      
      for (const move of remainingMoves) {
        if (selectedMoves.length >= maxMoves) break;
        addMove(move);
      }
    }

    // Ensure we have at least some moves
    if (selectedMoves.length === 0) {
      return getRandomFallbackMoveset(pokemonTypes, maxMoves);
    }

    return selectedMoves;

  } catch (error) {
    console.error(`Error generating random moveset for Pokemon ${pokemonId}:`, error);
    return getRandomFallbackMoveset(['normal'], maxMoves);
  }
}

/**
 * Generate moves by specific learn method
 */
export async function generateMovesByMethod(
  pokemonId: number,
  learnMethod: 'level-up' | 'machine' | 'tutor' | 'egg' | 'reminder',
  options: { maxMoves?: number; level?: number } = {}
): Promise<BattleMove[]> {
  const { maxMoves = 4, level = 50 } = options;
  
  const filter: LearnMethodFilter = {};
  if (learnMethod === 'level-up') {
    filter.levelUp = true;
    filter.maxLevel = level;
  } else if (learnMethod === 'machine') {
    filter.machine = true;
  } else if (learnMethod === 'tutor') {
    filter.tutor = true;
  } else if (learnMethod === 'egg') {
    filter.egg = true;
  } else if (learnMethod === 'reminder') {
    filter.reminder = true;
  }

  return generateRandomMoveset(pokemonId, {
    maxMoves,
    learnMethods: filter,
    level,
    prioritizeSTAB: true,
    balanceTypes: true
  });
}

/**
 * Get available learn methods for a Pokemon
 */
export async function getAvailableLearnMethods(pokemonId: number): Promise<string[]> {
  try {
    const moves = await fetchPokemonDetailedMoves(pokemonId);
    const methods = new Set<string>();
    
    moves.forEach(moveEntry => {
      moveEntry.version_group_details.forEach(detail => {
        methods.add(detail.move_learn_method.name);
      });
    });
    
    return Array.from(methods).sort();
  } catch (error) {
    console.error(`Error fetching learn methods for Pokemon ${pokemonId}:`, error);
    return ['level-up', 'machine'];
  }
}

/**
 * Get move statistics for a Pokemon
 */
export async function getPokemonMoveStats(pokemonId: number): Promise<{
  totalMoves: number;
  byLearnMethod: Record<string, number>;
  levelUpMoves: number;
  tmMoves: number;
  tutorMoves: number;
  eggMoves: number;
}> {
  try {
    const moves = await fetchPokemonDetailedMoves(pokemonId);
    const stats = {
      totalMoves: moves.length,
      byLearnMethod: {} as Record<string, number>,
      levelUpMoves: 0,
      tmMoves: 0,
      tutorMoves: 0,
      eggMoves: 0
    };

    const processedMethods = new Set<string>();
    
    moves.forEach(moveEntry => {
      moveEntry.version_group_details.forEach(detail => {
        const method = detail.move_learn_method.name;
        const key = `${moveEntry.move.name}-${method}`;
        
        if (!processedMethods.has(key)) {
          processedMethods.add(key);
          stats.byLearnMethod[method] = (stats.byLearnMethod[method] || 0) + 1;
          
          switch (method) {
            case 'level-up':
              stats.levelUpMoves++;
              break;
            case 'machine':
            case 'tm':
            case 'tr':
              stats.tmMoves++;
              break;
            case 'tutor':
            case 'move-tutor':
              stats.tutorMoves++;
              break;
            case 'egg':
              stats.eggMoves++;
              break;
          }
        }
      });
    });

    return stats;
  } catch (error) {
    console.error(`Error getting move stats for Pokemon ${pokemonId}:`, error);
    return {
      totalMoves: 0,
      byLearnMethod: {},
      levelUpMoves: 0,
      tmMoves: 0,
      tutorMoves: 0,
      eggMoves: 0
    };
  }
}

/**
 * Fallback moveset when API fails or no moves are found
 */
function getRandomFallbackMoveset(types: string[], maxMoves: number = 4): BattleMove[] {
  const fallbackMoves: BattleMove[] = [
    {
      name: 'tackle',
      type: 'normal',
      power: 40,
      accuracy: 100,
      pp: 35,
      currentPP: 35,
      damageClass: 'physical',
      priority: 0,
      target: 'opponent',
      description: 'A physical attack in which the user charges and slams into the target with its whole body.'
    },
    {
      name: 'protect',
      type: 'normal',
      power: 0,
      accuracy: 100,
      pp: 10,
      currentPP: 10,
      damageClass: 'status',
      priority: 4,
      target: 'self',
      description: 'Enables the user to evade all attacks. Its chance of failing rises if it is used in succession.',
      effect: 'protect'
    }
  ];

  // Add type-specific moves
  const typeMap: Record<string, BattleMove> = {
    fire: {
      name: 'flamethrower',
      type: 'fire',
      power: 90,
      accuracy: 100,
      pp: 15,
      currentPP: 15,
      damageClass: 'special',
      priority: 0,
      target: 'opponent',
      description: 'The target is scorched with an intense blast of fire.',
      effect: 'burn'
    },
    water: {
      name: 'surf',
      type: 'water',
      power: 90,
      accuracy: 100,
      pp: 15,
      currentPP: 15,
      damageClass: 'special',
      priority: 0,
      target: 'opponent',
      description: 'The user attacks everything around it by swamping its surroundings with a giant wave.'
    },
    electric: {
      name: 'thunderbolt',
      type: 'electric',
      power: 90,
      accuracy: 100,
      pp: 15,
      currentPP: 15,
      damageClass: 'special',
      priority: 0,
      target: 'opponent',
      description: 'A strong electric blast crashes down on the target.',
      effect: 'paralyze'
    },
    grass: {
      name: 'energy-ball',
      type: 'grass',
      power: 90,
      accuracy: 100,
      pp: 10,
      currentPP: 10,
      damageClass: 'special',
      priority: 0,
      target: 'opponent',
      description: 'The user draws power from nature and fires it at the target.'
    },
    psychic: {
      name: 'psychic',
      type: 'psychic',
      power: 90,
      accuracy: 100,
      pp: 10,
      currentPP: 10,
      damageClass: 'special',
      priority: 0,
      target: 'opponent',
      description: 'The target is hit by a strong telekinetic force.'
    }
  };

  // Add moves based on types
  types.forEach(type => {
    if (typeMap[type] && fallbackMoves.length < maxMoves) {
      fallbackMoves.push(typeMap[type]);
    }
  });

  // Fill with generic moves if needed
  const genericMoves: BattleMove[] = [
    {
      name: 'return',
      type: 'normal',
      power: 80,
      accuracy: 100,
      pp: 20,
      currentPP: 20,
      damageClass: 'physical',
      priority: 0,
      target: 'opponent',
      description: 'A full-power attack that grows more powerful the more the user likes its Trainer.'
    },
    {
      name: 'rest',
      type: 'psychic',
      power: 0,
      accuracy: 100,
      pp: 10,
      currentPP: 10,
      damageClass: 'status',
      priority: 0,
      target: 'self',
      description: 'The user goes to sleep for two turns. This fully restores the user\'s HP and heals any status conditions.',
      effect: 'rest'
    }
  ];

  for (const move of genericMoves) {
    if (fallbackMoves.length >= maxMoves) break;
    if (!fallbackMoves.some(m => m.name === move.name)) {
      fallbackMoves.push(move);
    }
  }

  return fallbackMoves.slice(0, maxMoves);
}

// Export utility functions for easy access
export {
  generateRandomMoveset as generateRandom,
  generateMovesByMethod as generateByMethod,
  getAvailableLearnMethods as getLearnMethods,
  getPokemonMoveStats as getMoveStats
}; 