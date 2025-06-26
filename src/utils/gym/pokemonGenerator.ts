import { GymPokemon, GymType } from './types';
import { selectPokemonMoves } from '../../services/moves';
import { BattleEngine } from '../battleEngine';

// Generate a smart moveset for a Pokemon
export const generateMoveset = (pokemon: any, isRandomized: boolean = false) => {
  const pokemonMoves = pokemon.moves || [];
  const pokemonTypes = pokemon.types || ['normal'];
  
  // Create a pool of potential moves
  const movePool = [];
  
  // Add moves from Pokemon's actual moveset if available
  if (pokemonMoves.length > 0) {
    pokemonMoves.forEach((move: string) => {
      const moveName = move.replace(/-/g, ' ');
      movePool.push({
        name: move,
        type: pokemonTypes[0], // Default to first type
        power: getMovePowerByName(move),
        accuracy: 100,
        pp: getMovePPByName(move),
        damageClass: getMovePowerByName(move) > 0 ? 'physical' as const : 'status' as const,
        description: `${moveName} - A ${pokemonTypes[0]} type move`
      });
    });
  }
  
  // Add type-specific moves to ensure good coverage
  pokemonTypes.forEach(type => {
    movePool.push({
      name: `${type}-blast`,
      type: type,
      power: 90,
      accuracy: 100,
      pp: 15,
      damageClass: 'special' as const,
      description: `A powerful ${type} type attack`
    });
    
    movePool.push({
      name: `${type}-strike`,
      type: type,
      power: 70,
      accuracy: 100,
      pp: 20,
      damageClass: 'physical' as const,
      description: `A ${type} type physical attack`
    });
  });
  
  // Add some universal moves
  movePool.push(
    { name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, damageClass: 'physical' as const, description: 'A basic physical attack' },
    { name: 'quick-attack', type: 'normal', power: 40, accuracy: 100, pp: 30, damageClass: 'physical' as const, description: 'A priority attack' },
    { name: 'rest', type: 'psychic', power: 0, accuracy: 100, pp: 10, damageClass: 'status' as const, description: 'Restores HP completely and causes sleep' },
    { name: 'protect', type: 'normal', power: 0, accuracy: 100, pp: 10, damageClass: 'status' as const, description: 'Protects from attacks this turn' },
    { name: 'growl', type: 'normal', power: 0, accuracy: 100, pp: 40, damageClass: 'status' as const, description: 'Lowers the target\'s Attack' },
    { name: 'swords-dance', type: 'normal', power: 0, accuracy: 100, pp: 20, damageClass: 'status' as const, description: 'Sharply raises user\'s Attack' },
    { name: 'thunder-wave', type: 'electric', power: 0, accuracy: 90, pp: 20, damageClass: 'status' as const, description: 'Paralyzes the target' },
    { name: 'toxic', type: 'poison', power: 0, accuracy: 90, pp: 10, damageClass: 'status' as const, description: 'Badly poisons the target' },
    { name: 'will-o-wisp', type: 'fire', power: 0, accuracy: 85, pp: 15, damageClass: 'status' as const, description: 'Burns the target' },
    { name: 'recover', type: 'normal', power: 0, accuracy: 100, pp: 10, damageClass: 'status' as const, description: 'Restores 50% of max HP' }
  );
  
  // Shuffle and pick 4 moves, ensuring at least 2 attacking moves
  const shuffled = [...movePool].sort(() => Math.random() - 0.5);
  const attackingMoves = shuffled.filter(move => move.power > 0);
  const statusMoves = shuffled.filter(move => move.power === 0);
  
  const selectedMoves = [];
  
  // Ensure at least 2 attacking moves
  selectedMoves.push(...attackingMoves.slice(0, 3));
  
  // Add 1 status move if available
  if (statusMoves.length > 0) {
    selectedMoves.push(statusMoves[0]);
  } else if (attackingMoves.length > 3) {
    selectedMoves.push(attackingMoves[3]);
  }
  
  // Fill up to 4 moves
  while (selectedMoves.length < 4 && shuffled.length > selectedMoves.length) {
    const nextMove = shuffled.find(move => !selectedMoves.some(sm => sm.name === move.name));
    if (nextMove) selectedMoves.push(nextMove);
    else break;
  }
  
  // Add currentPP to each move
  return selectedMoves.slice(0, 4).map(move => ({
    ...move,
    currentPP: move.pp
  }));
};

// Helper functions for move data
export const getMovePowerByName = (moveName: string): number => {
  const powerMap: Record<string, number> = {
    'tackle': 40, 'scratch': 35, 'pound': 40, 'quick-attack': 40,
    'thunderbolt': 90, 'thunder': 110, 'thunder-shock': 40,
    'flamethrower': 90, 'fire-blast': 110, 'ember': 40,
    'surf': 90, 'hydro-pump': 110, 'water-gun': 40,
    'solar-beam': 120, 'petal-dance': 120, 'vine-whip': 45,
    'psychic': 90, 'confusion': 50, 'psybeam': 65,
    'ice-beam': 90, 'blizzard': 110, 'powder-snow': 40,
    'earthquake': 100, 'rock-slide': 75, 'stone-edge': 100,
    'aerial-ace': 60, 'air-slash': 75, 'fly': 90,
    'shadow-ball': 80, 'night-shade': 1, 'dark-pulse': 80,
    'iron-tail': 100, 'steel-wing': 70, 'metal-claw': 50,
    'moonblast': 95, 'dazzling-gleam': 80, 'play-rough': 90,
    'close-combat': 120, 'brick-break': 75, 'karate-chop': 50,
    'poison-jab': 80, 'sludge-bomb': 90, 'acid': 40,
    'bug-bite': 60, 'x-scissor': 80, 'pin-missile': 25
  };
  return powerMap[moveName] || (moveName.includes('blast') ? 90 : moveName.includes('strike') ? 70 : 60);
};

export const getMovePPByName = (moveName: string): number => {
  const ppMap: Record<string, number> = {
    'tackle': 35, 'scratch': 35, 'pound': 35,
    'thunderbolt': 15, 'flamethrower': 15, 'surf': 15, 'psychic': 10,
    'earthquake': 10, 'blizzard': 5, 'fire-blast': 5, 'hydro-pump': 5,
    'solar-beam': 10, 'close-combat': 5, 'rest': 10, 'protect': 10
  };
  return ppMap[moveName] || 15;
};

// Create a gym Pokemon with stats and moves (enhanced version)
export const createGymPokemon = async (basePokemon: any, level: number, isRandomized: boolean = false): Promise<GymPokemon> => {
  const baseStats = basePokemon.stats || {
    hp: 100, attack: 80, defense: 80,
    'special-attack': 80, 'special-defense': 80, speed: 80
  };

  // Calculate max HP
  const maxHp = Math.floor(((baseStats.hp * 2) * level) / 100) + level + 10;

  // Generate moves using the new PokeAPI system
  let moves;
  try {
    moves = await generatePokemonMoves(basePokemon, level);
  } catch (error) {
    console.warn(`Failed to generate moves for ${basePokemon.name}, using fallback`);
    moves = generateFallbackMoves(basePokemon.types || ['normal'], level);
  }

  return {
    id: basePokemon.id,
    name: basePokemon.name,
    types: basePokemon.types || ['normal'],
    sprites: {
      front_default: basePokemon.sprites?.other?.['official-artwork']?.front_default || basePokemon.sprites?.front_default || '',
      back_default: basePokemon.sprites?.back_default || basePokemon.sprites?.front_default || ''
    },
    stats: baseStats,
    moves,
    level,
    currentHp: maxHp,
    maxHp: maxHp
  };
};

// Legacy synchronous version for backward compatibility
export const createGymPokemonSync = (basePokemon: any, level: number, isRandomized: boolean = false): GymPokemon => {
  const baseStats = basePokemon.stats || {
    hp: 100, attack: 80, defense: 80,
    'special-attack': 80, 'special-defense': 80, speed: 80
  };

  // Calculate max HP
  const maxHp = Math.floor(((baseStats.hp * 2) * level) / 100) + level + 10;

  // Use fallback moves for sync version
  const moves = generateFallbackMoves(basePokemon.types || ['normal'], level);

  return {
    id: basePokemon.id,
    name: basePokemon.name,
    types: basePokemon.types || ['normal'],
    sprites: {
      front_default: basePokemon.sprites?.other?.['official-artwork']?.front_default || basePokemon.sprites?.front_default || '',
      back_default: basePokemon.sprites?.back_default || basePokemon.sprites?.front_default || ''
    },
    stats: baseStats,
    moves,
    level,
    currentHp: maxHp,
    maxHp: maxHp
  };
};

// Get random Pokemon of a specific type
export const getRandomPokemonOfType = (allPokemon: any[], type: string, count: number = 3) => {
  if (!allPokemon || allPokemon.length === 0) {
    console.warn('No Pokemon data available for type filtering');
    return [];
  }

  const typeFilteredPokemon = allPokemon.filter(pokemon => 
    pokemon.types && pokemon.types.includes(type)
  );

  if (typeFilteredPokemon.length === 0) {
    console.warn(`No Pokemon found for type: ${type}`);
    return allPokemon.slice(0, count); // Fallback to any Pokemon
  }

  // Shuffle and return random selection
  const shuffled = [...typeFilteredPokemon].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

// Generate moves for the Pokemon
// Enhanced move generation using PokeAPI
const generatePokemonMoves = async (pokemonData: any, level: number): Promise<any[]> => {
  try {
    // Use the new PokeAPI-based move selection
    const battleMoves = await selectPokemonMoves(
      pokemonData.id,
      pokemonData.types || ['normal'],
      level,
      4
    );
    
    return battleMoves.map(move => ({
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
    }));
  } catch (error) {
    console.warn(`Failed to generate moves for ${pokemonData.name}, using fallback`, error);
    
    // Fallback to type-based moves if API fails
    return generateFallbackMoves(pokemonData.types || ['normal'], level);
  }
};

// Fallback move generation (simplified)
const generateFallbackMoves = (types: string[], level: number): any[] => {
  const moves = [];

  // Add type-specific STAB moves first
  types.forEach(type => {
    switch (type) {
      case 'fire':
        moves.push({
          name: 'flamethrower',
          type: 'fire',
          power: 90,
          accuracy: 100,
          pp: 15,
          currentPP: 15,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The target is scorched with an intense blast of fire.'
        });
        break;
      case 'water':
        moves.push({
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
        });
        break;
      case 'electric':
        moves.push({
          name: 'thunderbolt',
          type: 'electric',
          power: 90,
          accuracy: 100,
          pp: 15,
          currentPP: 15,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'A strong electric blast crashes down on the target. This may also leave the target with paralysis.',
          effect: 'paralyze'
        });
        break;
      case 'grass':
        moves.push({
          name: 'solar-beam',
          type: 'grass',
          power: 120,
          accuracy: 100,
          pp: 10,
          currentPP: 10,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'A two-turn attack. The user gathers light, then blasts a bundled beam on the next turn.'
        });
        break;
      case 'ice':
        moves.push({
          name: 'ice-beam',
          type: 'ice',
          power: 90,
          accuracy: 100,
          pp: 10,
          currentPP: 10,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The target is struck with an icy-cold beam of energy. This may also leave the target frozen.',
          effect: 'freeze'
        });
        break;
      case 'fighting':
        moves.push({
          name: 'close-combat',
          type: 'fighting',
          power: 120,
          accuracy: 100,
          pp: 5,
          currentPP: 5,
          damageClass: 'physical',
          priority: 0,
          target: 'opponent',
          description: 'The user fights the target up close without guarding itself.',
          effect: 'lower_defense'
        });
        break;
      case 'poison':
        moves.push({
          name: 'sludge-bomb',
          type: 'poison',
          power: 90,
          accuracy: 100,
          pp: 10,
          currentPP: 10,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'Unsanitary sludge is hurled at the target. This may also poison the target.',
          effect: 'poison'
        });
        break;
      case 'ground':
        moves.push({
          name: 'earthquake',
          type: 'ground',
          power: 100,
          accuracy: 100,
          pp: 10,
          currentPP: 10,
          damageClass: 'physical',
          priority: 0,
          target: 'opponent',
          description: 'The user sets off an earthquake that strikes every Pokémon around it.'
        });
        break;
      case 'flying':
        moves.push({
          name: 'air-slash',
          type: 'flying',
          power: 75,
          accuracy: 95,
          pp: 15,
          currentPP: 15,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The user attacks with a blade of air that slices even the sky.',
          effect: 'flinch'
        });
        break;
      case 'psychic':
        moves.push({
          name: 'psychic',
          type: 'psychic',
          power: 90,
          accuracy: 100,
          pp: 10,
          currentPP: 10,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The target is hit by a strong telekinetic force.',
          effect: 'lower_special_defense'
        });
        break;
      case 'bug':
        moves.push({
          name: 'x-scissor',
          type: 'bug',
          power: 80,
          accuracy: 100,
          pp: 15,
          currentPP: 15,
          damageClass: 'physical',
          priority: 0,
          target: 'opponent',
          description: 'The user slashes at the target by crossing its scythes or claws as if they were a pair of scissors.'
        });
        break;
      case 'rock':
        moves.push({
          name: 'stone-edge',
          type: 'rock',
          power: 100,
          accuracy: 80,
          pp: 5,
          currentPP: 5,
          damageClass: 'physical',
          priority: 0,
          target: 'opponent',
          description: 'The user stabs the target from below with sharpened stones. Critical hits land more easily.'
        });
        break;
      case 'ghost':
        moves.push({
          name: 'shadow-ball',
          type: 'ghost',
          power: 80,
          accuracy: 100,
          pp: 15,
          currentPP: 15,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The user hurls a shadowy blob at the target.',
          effect: 'lower_special_defense'
        });
        break;
      case 'dragon':
        moves.push({
          name: 'dragon-pulse',
          type: 'dragon',
          power: 85,
          accuracy: 100,
          pp: 10,
          currentPP: 10,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The target is attacked with a shock wave generated by the user\'s gaping mouth.'
        });
        break;
      case 'dark':
        moves.push({
          name: 'dark-pulse',
          type: 'dark',
          power: 80,
          accuracy: 100,
          pp: 15,
          currentPP: 15,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The user releases a horrible aura imbued with dark thoughts.',
          effect: 'flinch'
        });
        break;
      case 'steel':
        moves.push({
          name: 'iron-tail',
          type: 'steel',
          power: 100,
          accuracy: 75,
          pp: 15,
          currentPP: 15,
          damageClass: 'physical',
          priority: 0,
          target: 'opponent',
          description: 'The target is slammed with a steel-hard tail.',
          effect: 'lower_defense'
        });
        break;
      case 'fairy':
        moves.push({
          name: 'moonblast',
          type: 'fairy',
          power: 95,
          accuracy: 100,
          pp: 15,
          currentPP: 15,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'Borrowing the power of the moon, the user attacks the target.',
          effect: 'lower_special_attack'
        });
        break;
      default:
        // For normal type or unknown types, add tackle
        moves.push({
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
        });
    }
  });

  // Add diverse status moves to create strategic depth
  const statusMoves = [
    {
      name: 'toxic',
      type: 'poison',
      power: 0,
      accuracy: 90,
      pp: 10,
      currentPP: 10,
      damageClass: 'status',
      priority: 0,
      target: 'opponent',
      description: 'A move that leaves the target badly poisoned.',
      effect: 'bad_poison'
    },
    {
      name: 'thunder-wave',
      type: 'electric',
      power: 0,
      accuracy: 90,
      pp: 20,
      currentPP: 20,
      damageClass: 'status',
      priority: 0,
      target: 'opponent',
      description: 'The user launches a weak jolt of electricity that paralyzes the target.',
      effect: 'paralyze'
    },
    {
      name: 'will-o-wisp',
      type: 'fire',
      power: 0,
      accuracy: 85,
      pp: 15,
      currentPP: 15,
      damageClass: 'status',
      priority: 0,
      target: 'opponent',
      description: 'The user shoots a sinister, bluish-white flame at the target to inflict a burn.',
      effect: 'burn'
    },
    {
      name: 'swords-dance',
      type: 'normal',
      power: 0,
      accuracy: 100,
      pp: 20,
      currentPP: 20,
      damageClass: 'status',
      priority: 0,
      target: 'self',
      description: 'A frenetic dance to uplift the fighting spirit. This sharply raises the user\'s Attack stat.',
      effect: 'raise_attack_2'
    },
    {
      name: 'recover',
      type: 'normal',
      power: 0,
      accuracy: 100,
      pp: 10,
      currentPP: 10,
      damageClass: 'status',
      priority: 0,
      target: 'self',
      description: 'Restoring its own cells, the user restores its own HP by half of its max HP.',
      effect: 'heal_50'
    }
  ];

  // Add a second attacking move based on types or generic
  if (types.includes('fire')) {
    moves.push({
      name: 'fire-blast',
      type: 'fire',
      power: 110,
      accuracy: 85,
      pp: 5,
      currentPP: 5,
      damageClass: 'special',
      priority: 0,
      target: 'opponent',
      description: 'A searing blast of fire that may inflict a burn.',
      effect: 'burn'
    });
  } else if (types.includes('water')) {
    moves.push({
      name: 'hydro-pump',
      type: 'water',
      power: 110,
      accuracy: 80,
      pp: 5,
      currentPP: 5,
      damageClass: 'special',
      priority: 0,
      target: 'opponent',
      description: 'The target is blasted by a huge volume of water launched under great pressure.'
    });
  } else {
    moves.push({
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
    });
  }

  // Add one random status move
  const randomStatusMove = statusMoves[Math.floor(Math.random() * statusMoves.length)];
  moves.push(randomStatusMove);

  // Add protect as a defensive option
  moves.push({
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
  });

  return moves.slice(0, 4);
}; 