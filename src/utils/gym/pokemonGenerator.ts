import { GymPokemon, GymType } from './types';

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

// Create a gym Pokemon with stats and moves
export const createGymPokemon = (basePokemon: any, level: number, isRandomized: boolean = false): GymPokemon => {
  const baseStats = basePokemon.stats || {
    hp: 100, attack: 80, defense: 80,
    'special-attack': 80, 'special-defense': 80, speed: 80
  };

  // Calculate max HP
  const maxHp = Math.floor(((baseStats.hp * 2) * level) / 100) + level + 10;

  // Generate moves based on Pokemon's actual moveset
  const moves = generateMoveset(basePokemon, isRandomized);

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