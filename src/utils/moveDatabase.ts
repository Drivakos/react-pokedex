import { BattleMove } from './battleEngine';

export interface MoveData {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  damageClass: 'physical' | 'special' | 'status';
  priority: number;
  effect?: string;
  target: 'opponent' | 'self' | 'all' | 'all-opponents' | 'all-allies';
  description: string;
  effectChance?: number; // Percentage chance for secondary effects
}

export const MOVE_DATABASE: Record<string, MoveData> = {
  // Normal Type Moves
  'tackle': {
    name: 'tackle',
    type: 'normal',
    power: 40,
    accuracy: 100,
    pp: 35,
    damageClass: 'physical',
    priority: 0,
    target: 'opponent',
    description: 'A physical attack in which the user charges and slams into the target with its whole body.'
  },
  'hyper-beam': {
    name: 'hyper-beam',
    type: 'normal',
    power: 150,
    accuracy: 90,
    pp: 5,
    damageClass: 'special',
    priority: 0,
    target: 'opponent',
    description: 'The target is attacked with a powerful beam. The user can\'t move on the next turn.',
    effect: 'recharge'
  },
  'quick-attack': {
    name: 'quick-attack',
    type: 'normal',
    power: 40,
    accuracy: 100,
    pp: 30,
    damageClass: 'physical',
    priority: 1,
    target: 'opponent',
    description: 'The user lunges at the target at a speed that makes it almost invisible. This move always goes first.'
  },

  // Fire Type Moves
  'flamethrower': {
    name: 'flamethrower',
    type: 'fire',
    power: 90,
    accuracy: 100,
    pp: 15,
    damageClass: 'special',
    priority: 0,
    target: 'opponent',
    description: 'The target is scorched with an intense blast of fire. This may also leave the target with a burn.',
    effect: 'burn',
    effectChance: 10
  },
  'fire-blast': {
    name: 'fire-blast',
    type: 'fire',
    power: 110,
    accuracy: 85,
    pp: 5,
    damageClass: 'special',
    priority: 0,
    target: 'opponent',
    description: 'The target is attacked with an intense blast of all-consuming fire. This may also leave the target with a burn.',
    effect: 'burn',
    effectChance: 10
  },
  'ember': {
    name: 'ember',
    type: 'fire',
    power: 40,
    accuracy: 100,
    pp: 25,
    damageClass: 'special',
    priority: 0,
    target: 'opponent',
    description: 'The target is attacked with small flames. This may also leave the target with a burn.',
    effect: 'burn',
    effectChance: 10
  },

  // Water Type Moves
  'surf': {
    name: 'surf',
    type: 'water',
    power: 90,
    accuracy: 100,
    pp: 15,
    damageClass: 'special',
    priority: 0,
    target: 'all-opponents',
    description: 'The user attacks everything around it by swamping its surroundings with a giant wave.'
  },
  'hydro-pump': {
    name: 'hydro-pump',
    type: 'water',
    power: 110,
    accuracy: 80,
    pp: 5,
    damageClass: 'special',
    priority: 0,
    target: 'opponent',
    description: 'The target is blasted by a huge volume of water launched under great pressure.'
  },
  'water-gun': {
    name: 'water-gun',
    type: 'water',
    power: 40,
    accuracy: 100,
    pp: 25,
    damageClass: 'special',
    priority: 0,
    target: 'opponent',
    description: 'The target is blasted with a forceful shot of water.'
  },

  // Electric Type Moves
  'thunderbolt': {
    name: 'thunderbolt',
    type: 'electric',
    power: 90,
    accuracy: 100,
    pp: 15,
    damageClass: 'special',
    priority: 0,
    target: 'opponent',
    description: 'A strong electric blast crashes down on the target. This may also leave the target with paralysis.',
    effect: 'paralysis',
    effectChance: 10
  },
  'thunder': {
    name: 'thunder',
    type: 'electric',
    power: 110,
    accuracy: 70,
    pp: 10,
    damageClass: 'special',
    priority: 0,
    target: 'opponent',
    description: 'A wicked thunderbolt is dropped on the target to inflict damage. This may also leave the target with paralysis.',
    effect: 'paralysis',
    effectChance: 30
  },
  'thunder-shock': {
    name: 'thunder-shock',
    type: 'electric',
    power: 40,
    accuracy: 100,
    pp: 30,
    damageClass: 'special',
    priority: 0,
    target: 'opponent',
    description: 'A jolt of electricity crashes down on the target to inflict damage. This may also leave the target with paralysis.',
    effect: 'paralysis',
    effectChance: 10
  },

  // Grass Type Moves
  'solar-beam': {
    name: 'solar-beam',
    type: 'grass',
    power: 120,
    accuracy: 100,
    pp: 10,
    damageClass: 'special',
    priority: 0,
    target: 'opponent',
    description: 'A two-turn attack. The user gathers light, then blasts a bundled beam on the next turn.',
    effect: 'charge'
  },
  'vine-whip': {
    name: 'vine-whip',
    type: 'grass',
    power: 45,
    accuracy: 100,
    pp: 25,
    damageClass: 'physical',
    priority: 0,
    target: 'opponent',
    description: 'The target is struck with slender, whiplike vines to inflict damage.'
  },

  // Ice Type Moves
  'ice-beam': {
    name: 'ice-beam',
    type: 'ice',
    power: 90,
    accuracy: 100,
    pp: 10,
    damageClass: 'special',
    priority: 0,
    target: 'opponent',
    description: 'The target is struck with an icy-cold beam of energy. This may also leave the target frozen.',
    effect: 'freeze',
    effectChance: 10
  },
  'blizzard': {
    name: 'blizzard',
    type: 'ice',
    power: 110,
    accuracy: 70,
    pp: 5,
    damageClass: 'special',
    priority: 0,
    target: 'all-opponents',
    description: 'A howling blizzard is summoned to strike opposing Pokémon. This may also leave the opposing Pokémon frozen.',
    effect: 'freeze',
    effectChance: 10
  },

  // Fighting Type Moves
  'close-combat': {
    name: 'close-combat',
    type: 'fighting',
    power: 120,
    accuracy: 100,
    pp: 5,
    damageClass: 'physical',
    priority: 0,
    target: 'opponent',
    description: 'The user fights the target up close without guarding itself. This also lowers the user\'s Defense and Sp. Def stats.',
    effect: 'lower_user_defense_spdef'
  },
  'brick-break': {
    name: 'brick-break',
    type: 'fighting',
    power: 75,
    accuracy: 100,
    pp: 15,
    damageClass: 'physical',
    priority: 0,
    target: 'opponent',
    description: 'The user attacks with a swift chop. It can also break barriers, such as Light Screen and Reflect.'
  },

  // Psychic Type Moves
  'psychic': {
    name: 'psychic',
    type: 'psychic',
    power: 90,
    accuracy: 100,
    pp: 10,
    damageClass: 'special',
    priority: 0,
    target: 'opponent',
    description: 'The target is hit by a strong telekinetic force. This may also lower the target\'s Sp. Def stat.',
    effect: 'lower_special_defense',
    effectChance: 10
  },
  'psybeam': {
    name: 'psybeam',
    type: 'psychic',
    power: 65,
    accuracy: 100,
    pp: 20,
    damageClass: 'special',
    priority: 0,
    target: 'opponent',
    description: 'The target is attacked with a peculiar ray. This may also leave the target confused.',
    effect: 'confuse',
    effectChance: 10
  },

  // Status Moves
  'growl': {
    name: 'growl',
    type: 'normal',
    power: 0,
    accuracy: 100,
    pp: 40,
    damageClass: 'status',
    priority: 0,
    target: 'all-opponents',
    description: 'The user growls in an endearing way, making opposing Pokémon less wary. This lowers their Attack stats.',
    effect: 'lower_attack'
  },
  'swords-dance': {
    name: 'swords-dance',
    type: 'normal',
    power: 0,
    accuracy: 100,
    pp: 20,
    damageClass: 'status',
    priority: 0,
    target: 'self',
    description: 'A frenetic dance to uplift the fighting spirit. This sharply raises the user\'s Attack stat.',
    effect: 'raise_attack_2'
  },
  'protect': {
    name: 'protect',
    type: 'normal',
    power: 0,
    accuracy: 100,
    pp: 10,
    damageClass: 'status',
    priority: 4,
    target: 'self',
    description: 'Enables the user to evade all attacks. Its chance of failing rises if it is used in succession.',
    effect: 'protect'
  },
  'recover': {
    name: 'recover',
    type: 'normal',
    power: 0,
    accuracy: 100,
    pp: 5,
    damageClass: 'status',
    priority: 0,
    target: 'self',
    description: 'Restoring its own cells, the user restores its own HP by half of its max HP.',
    effect: 'heal_50'
  },
  'rest': {
    name: 'rest',
    type: 'psychic',
    power: 0,
    accuracy: 100,
    pp: 10,
    damageClass: 'status',
    priority: 0,
    target: 'self',
    description: 'The user goes to sleep for two turns. This fully restores the user\'s HP and heals any status conditions.',
    effect: 'rest'
  },
  'thunder-wave': {
    name: 'thunder-wave',
    type: 'electric',
    power: 0,
    accuracy: 90,
    pp: 20,
    damageClass: 'status',
    priority: 0,
    target: 'opponent',
    description: 'The user launches a weak jolt of electricity that paralyzes the target.',
    effect: 'paralyze'
  },
  'toxic': {
    name: 'toxic',
    type: 'poison',
    power: 0,
    accuracy: 90,
    pp: 10,
    damageClass: 'status',
    priority: 0,
    target: 'opponent',
    description: 'A move that leaves the target badly poisoned. Its poison damage worsens every turn.',
    effect: 'bad_poison'
  },
  'will-o-wisp': {
    name: 'will-o-wisp',
    type: 'fire',
    power: 0,
    accuracy: 85,
    pp: 15,
    damageClass: 'status',
    priority: 0,
    target: 'opponent',
    description: 'The user shoots a sinister, bluish-white flame at the target to inflict a burn.',
    effect: 'burn'
  },
  'light-screen': {
    name: 'light-screen',
    type: 'psychic',
    power: 0,
    accuracy: 100,
    pp: 30,
    damageClass: 'status',
    priority: 0,
    target: 'all-allies',
    description: 'A wondrous wall of light is put up to reduce damage from special attacks for five turns.',
    effect: 'light_screen'
  },
  'reflect': {
    name: 'reflect',
    type: 'psychic',
    power: 0,
    accuracy: 100,
    pp: 20,
    damageClass: 'status',
    priority: 0,
    target: 'all-allies',
    description: 'A wondrous wall of light is put up to reduce damage from physical attacks for five turns.',
    effect: 'reflect'
  },

  // More Physical Moves
  'earthquake': {
    name: 'earthquake',
    type: 'ground',
    power: 100,
    accuracy: 100,
    pp: 10,
    damageClass: 'physical',
    priority: 0,
    target: 'all-opponents',
    description: 'The user sets off an earthquake that strikes every Pokémon around it.'
  },
  'rock-slide': {
    name: 'rock-slide',
    type: 'rock',
    power: 75,
    accuracy: 90,
    pp: 10,
    damageClass: 'physical',
    priority: 0,
    target: 'all-opponents',
    description: 'Large boulders are hurled at the opposing Pokémon to inflict damage. This may also make the opposing Pokémon flinch.',
    effect: 'flinch',
    effectChance: 30
  },
  'shadow-ball': {
    name: 'shadow-ball',
    type: 'ghost',
    power: 80,
    accuracy: 100,
    pp: 15,
    damageClass: 'special',
    priority: 0,
    target: 'opponent',
    description: 'The user hurls a shadowy blob at the target. This may also lower the target\'s Sp. Def stat.',
    effect: 'lower_special_defense',
    effectChance: 20
  },
  'crunch': {
    name: 'crunch',
    type: 'dark',
    power: 80,
    accuracy: 100,
    pp: 15,
    damageClass: 'physical',
    priority: 0,
    target: 'opponent',
    description: 'The user crunches up the target with sharp fangs. This may also lower the target\'s Defense stat.',
    effect: 'lower_defense',
    effectChance: 20
  }
};

/**
 * Get a random move of a specific type
 */
export function getRandomMoveOfType(type: string): MoveData | null {
  const movesOfType = Object.values(MOVE_DATABASE).filter(move => move.type === type);
  if (movesOfType.length === 0) return null;
  
  return movesOfType[Math.floor(Math.random() * movesOfType.length)];
}

/**
 * Get a list of moves suitable for a Pokemon level
 */
export function getMovesForLevel(level: number, types: string[]): string[] {
  const availableMoves: string[] = [];
  
  // Add moves based on Pokemon types
  types.forEach(type => {
    const typeMove = getRandomMoveOfType(type);
    if (typeMove) {
      availableMoves.push(typeMove.name);
    }
  });
  
  // Ensure at least one STAB move
  if (availableMoves.length === 0) {
    availableMoves.push('tackle');
  }
  
  // Add random moves based on level
  const allMoveNames = Object.keys(MOVE_DATABASE);
  while (availableMoves.length < 4) {
    const randomMove = allMoveNames[Math.floor(Math.random() * allMoveNames.length)];
    if (!availableMoves.includes(randomMove)) {
      availableMoves.push(randomMove);
    }
  }
  
  return availableMoves.slice(0, 4);
}

/**
 * Create a BattleMove from move name
 */
export function createBattleMove(moveName: string): BattleMove {
  const moveData = MOVE_DATABASE[moveName];
  
  if (!moveData) {
    // Fallback move
    return {
      name: moveName,
      type: 'normal',
      power: 50,
      accuracy: 100,
      pp: 20,
      currentPP: 20,
      damageClass: 'physical',
      priority: 0,
      target: 'opponent',
      description: `${moveName} - A Pokemon move.`
    };
  }
  
  return {
    name: moveData.name,
    type: moveData.type,
    power: moveData.power,
    accuracy: moveData.accuracy,
    pp: moveData.pp,
    currentPP: moveData.pp,
    damageClass: moveData.damageClass,
    priority: moveData.priority,
    effect: moveData.effect,
    target: moveData.target,
    description: moveData.description
  };
} 