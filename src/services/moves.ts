export interface MoveData {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  damageClass: 'physical' | 'special' | 'status';
  description: string;
}

const moveCache = new Map<string, MoveData>();

export const fetchMoveData = async (moveName: string): Promise<MoveData> => {
  // Check cache first
  if (moveCache.has(moveName)) {
    return moveCache.get(moveName)!;
  }

  try {
    const response = await fetch(`https://pokeapi.co/api/v2/move/${moveName}`);
    if (!response.ok) throw new Error('Move not found');
    
    const moveData = await response.json();
    
    const move: MoveData = {
      name: moveData.name,
      type: moveData.type.name,
      power: moveData.power || 0,
      accuracy: moveData.accuracy || 100,
      pp: moveData.pp || 20,
      damageClass: moveData.damage_class.name,
      description: moveData.flavor_text_entries.find((entry: any) => entry.language.name === 'en')?.flavor_text || 'A mysterious move.'
    };

    moveCache.set(moveName, move);
    return move;
  } catch (error) {
    console.warn(`Failed to fetch move data for ${moveName}:`, error);
    
    // Return fallback move data
    const fallbackMove: MoveData = {
      name: moveName,
      type: getFallbackMoveType(moveName),
      power: getFallbackMovePower(moveName),
      accuracy: 100,
      pp: 20,
      damageClass: getFallbackMoveDamageClass(moveName),
      description: `${moveName.replace('-', ' ')} - A Pokémon move.`
    };

    moveCache.set(moveName, fallbackMove);
    return fallbackMove;
  }
};

// Fallback functions for when API fails
const getFallbackMoveType = (moveName: string): string => {
  const typeMap: Record<string, string> = {
    'tackle': 'normal',
    'thunderbolt': 'electric',
    'hydro-pump': 'water',
    'flamethrower': 'fire',
    'psychic': 'psychic',
    'earthquake': 'ground',
    'ice-beam': 'ice',
    'shadow-ball': 'ghost',
    'dragon-claw': 'dragon',
    'close-combat': 'fighting',
    'poison-jab': 'poison',
    'rock-slide': 'rock',
    'bug-buzz': 'bug',
    'air-slash': 'flying',
    'iron-head': 'steel',
    'moonblast': 'fairy',
    'crunch': 'dark',
    'leaf-storm': 'grass'
  };
  
  return typeMap[moveName] || 'normal';
};

const getFallbackMovePower = (moveName: string): number => {
  const powerMap: Record<string, number> = {
    'tackle': 40,
    'thunderbolt': 90,
    'hydro-pump': 110,
    'flamethrower': 90,
    'psychic': 90,
    'earthquake': 100,
    'ice-beam': 90,
    'shadow-ball': 80,
    'dragon-claw': 80,
    'close-combat': 120,
    'poison-jab': 80,
    'rock-slide': 75,
    'bug-buzz': 90,
    'air-slash': 75,
    'iron-head': 80,
    'moonblast': 95,
    'crunch': 80,
    'leaf-storm': 130,
    'growl': 0,
    'tail-whip': 0,
    'leer': 0,
    'harden': 0
  };
  
  return powerMap[moveName] || 60;
};

const getFallbackMoveDamageClass = (moveName: string): 'physical' | 'special' | 'status' => {
  const statusMoves = ['growl', 'tail-whip', 'leer', 'harden', 'defense-curl', 'withdraw'];
  if (statusMoves.includes(moveName)) return 'status';
  
  const physicalMoves = ['tackle', 'scratch', 'pound', 'dragon-claw', 'close-combat', 'poison-jab', 'rock-slide', 'iron-head', 'crunch'];
  if (physicalMoves.includes(moveName)) return 'physical';
  
  return 'special';
};

export const getRandomMoveSet = async (pokemonType: string[]): Promise<MoveData[]> => {
  const movesByType = {
    normal: ['tackle', 'body-slam', 'hyper-beam', 'swift'],
    fire: ['flamethrower', 'fire-blast', 'flame-wheel', 'ember'],
    water: ['hydro-pump', 'surf', 'water-gun', 'bubble-beam'],
    electric: ['thunderbolt', 'thunder', 'thunder-wave', 'spark'],
    grass: ['leaf-storm', 'solar-beam', 'razor-leaf', 'vine-whip'],
    ice: ['ice-beam', 'blizzard', 'ice-shard', 'aurora-beam'],
    fighting: ['close-combat', 'brick-break', 'dynamic-punch', 'karate-chop'],
    poison: ['poison-jab', 'sludge-bomb', 'poison-sting', 'acid'],
    ground: ['earthquake', 'dig', 'earth-power', 'mud-shot'],
    flying: ['air-slash', 'fly', 'wing-attack', 'gust'],
    psychic: ['psychic', 'psybeam', 'confusion', 'zen-headbutt'],
    bug: ['bug-buzz', 'x-scissor', 'bug-bite', 'pin-missile'],
    rock: ['rock-slide', 'stone-edge', 'rock-throw', 'rollout'],
    ghost: ['shadow-ball', 'shadow-claw', 'lick', 'confuse-ray'],
    dragon: ['dragon-claw', 'dragon-pulse', 'dragon-rage', 'twister'],
    dark: ['crunch', 'dark-pulse', 'bite', 'pursuit'],
    steel: ['iron-head', 'flash-cannon', 'metal-claw', 'iron-tail'],
    fairy: ['moonblast', 'dazzling-gleam', 'fairy-wind', 'charm']
  };

  const moves: string[] = [];
  
  // Add type-specific moves
  pokemonType.forEach(type => {
    const typeMoves = movesByType[type as keyof typeof movesByType] || ['tackle'];
    moves.push(...typeMoves.slice(0, 2));
  });
  
  // Fill remaining slots with common moves
  const commonMoves = ['tackle', 'growl', 'double-team', 'rest'];
  while (moves.length < 4) {
    moves.push(commonMoves[moves.length] || 'tackle');
  }

  // Fetch move data
  const movePromises = moves.slice(0, 4).map(move => fetchMoveData(move));
  return Promise.all(movePromises);
}; 