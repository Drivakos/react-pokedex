// Pokemon Battle Engine - Core battle mechanics and calculations
// Implements authentic Pokemon battle formulas and mechanics

export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface BattlePokemon {
  id: number;
  name: string;
  types: string[];
  level: number;
  currentHp: number;
  maxHp: number;
  baseStats: PokemonStats;
  actualStats: PokemonStats; // Calculated with level
  moves: BattleMove[];
  status?: StatusCondition | null;
  statusTurns?: number;
  statStages: StatStages; // -6 to +6 for each stat
  volatileStatuses: VolatileStatus[];
  lastMoveDamage?: number;
  sprites: {
    front_default: string;
    back_default: string;
  };
}

export interface BattleMove {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  currentPP: number;
  damageClass: 'physical' | 'special' | 'status';
  priority: number;
  effect?: string;
  target: 'opponent' | 'self' | 'all' | 'all-opponents' | 'all-allies';
  description: string;
}

export type StatusCondition = 'burn' | 'freeze' | 'paralysis' | 'poison' | 'bad-poison' | 'sleep';

export interface VolatileStatus {
  type: 'confused' | 'flinched' | 'protected' | 'trapped' | 'focused';
  turnsRemaining: number;
  data?: any;
}

export interface StatStages {
  attack: number;      // -6 to +6
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  accuracy: number;
  evasion: number;
}

export interface BattleResult {
  damage: number;
  effectiveness: number;
  isCritical: boolean;
  missed: boolean;
  messages: string[];
  statusInflicted?: StatusCondition;
  statChanges?: Partial<StatStages>;
}

export interface TurnAction {
  pokemon: BattlePokemon;
  move: BattleMove;
  target: BattlePokemon;
  priority: number;
  actualSpeed: number;
}

// Complete type effectiveness chart (Gen 8)
export const TYPE_EFFECTIVENESS: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5, ground: 2 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, flying: 2, ground: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, ice: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

export class BattleEngine {
  /**
   * Calculate a Pokemon's actual stats at a given level
   */
  static calculateStats(baseStats: PokemonStats, level: number): PokemonStats {
    return {
      hp: Math.floor(((baseStats.hp * 2) * level) / 100) + level + 10,
      attack: Math.floor(((baseStats.attack * 2) * level) / 100) + 5,
      defense: Math.floor(((baseStats.defense * 2) * level) / 100) + 5,
      specialAttack: Math.floor(((baseStats.specialAttack * 2) * level) / 100) + 5,
      specialDefense: Math.floor(((baseStats.specialDefense * 2) * level) / 100) + 5,
      speed: Math.floor(((baseStats.speed * 2) * level) / 100) + 5,
    };
  }

  /**
   * Apply stat stage modifiers to get effective stat
   */
  static getEffectiveStat(baseStat: number, statStage: number): number {
    const multiplier = statStage >= 0 
      ? (2 + statStage) / 2 
      : 2 / (2 + Math.abs(statStage));
    return Math.floor(baseStat * multiplier);
  }

  /**
   * Calculate turn order based on priority and speed
   */
  static calculateTurnOrder(actions: TurnAction[]): TurnAction[] {
    return actions.sort((a, b) => {
      // First sort by move priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority goes first
      }
      
      // Then by speed (with stat stages applied)
      const speedA = this.getEffectiveStat(a.pokemon.actualStats.speed, a.pokemon.statStages.speed);
      const speedB = this.getEffectiveStat(b.pokemon.actualStats.speed, b.pokemon.statStages.speed);
      
      if (speedA !== speedB) {
        return speedB - speedA; // Higher speed goes first
      }
      
      // Tie-breaker: random
      return Math.random() - 0.5;
    });
  }

  /**
   * Calculate type effectiveness multiplier
   */
  static getTypeEffectiveness(moveType: string, targetTypes: string[]): number {
    let effectiveness = 1;
    
    targetTypes.forEach(defenderType => {
      const multiplier = TYPE_EFFECTIVENESS[moveType]?.[defenderType];
      if (multiplier !== undefined) {
        effectiveness *= multiplier;
      }
    });
    
    return effectiveness;
  }

  /**
   * Check if move hits (accuracy check)
   */
  static checkAccuracy(
    move: BattleMove, 
    attacker: BattlePokemon, 
    target: BattlePokemon
  ): boolean {
    // Factor in accuracy and evasion stat stages
    const accuracyStage = attacker.statStages.accuracy;
    const evasionStage = target.statStages.evasion;
    
    const stageMultiplier = (accuracyStage - evasionStage);
    const effectiveAccuracy = move.accuracy * (
      stageMultiplier >= 0 
        ? (3 + stageMultiplier) / 3 
        : 3 / (3 + Math.abs(stageMultiplier))
    );
    
    return Math.random() * 100 < effectiveAccuracy;
  }

  /**
   * Check for critical hit
   */
  static checkCriticalHit(attacker: BattlePokemon, move: BattleMove): boolean {
    // Base critical hit rate is 1/24 (about 4.17%)
    let critRate = 1 / 24;
    
    // TODO: Factor in high critical hit ratio moves, abilities, items
    // For now, use a slightly higher rate for better gameplay
    critRate = 1 / 16; // 6.25%
    
    return Math.random() < critRate;
  }

  /**
   * Main damage calculation using Pokemon's formula
   */
  static calculateDamage(
    attacker: BattlePokemon,
    target: BattlePokemon,
    move: BattleMove
  ): BattleResult {
    const result: BattleResult = {
      damage: 0,
      effectiveness: 1,
      isCritical: false,
      missed: false,
      messages: []
    };

    // Status moves don't deal damage
    if (move.damageClass === 'status') {
      return result;
    }

    // Check if move hits
    if (!this.checkAccuracy(move, attacker, target)) {
      result.missed = true;
      result.messages.push(`${attacker.name}'s attack missed!`);
      return result;
    }

    // Check for protection
    const isProtected = target.volatileStatuses.some(status => status.type === 'protected');
    if (isProtected && move.damageClass !== 'status') {
      result.messages.push(`${target.name} protected itself!`);
      return result;
    }

    // Get effective attack and defense stats
    const attackStat = move.damageClass === 'physical' ? 'attack' : 'specialAttack';
    const defenseStat = move.damageClass === 'physical' ? 'defense' : 'specialDefense';
    
    const attack = this.getEffectiveStat(
      attacker.actualStats[attackStat], 
      attacker.statStages[attackStat]
    );
    const defense = this.getEffectiveStat(
      target.actualStats[defenseStat], 
      target.statStages[defenseStat]
    );

    // Check for critical hit
    const isCritical = this.checkCriticalHit(attacker, move);
    result.isCritical = isCritical;

    // Base damage calculation: ((2 * Level + 10) / 250) * (Attack / Defense) * Power + 2
    let damage = ((2 * attacker.level + 10) / 250) * (attack / defense) * move.power + 2;

    // Critical hit multiplier (ignores negative stat changes for attacker)
    if (isCritical) {
      damage *= 1.5;
      result.messages.push("A critical hit!");
    }

    // Same Type Attack Bonus (STAB)
    if (attacker.types.includes(move.type)) {
      damage *= 1.5;
    }

    // Type effectiveness
    const effectiveness = this.getTypeEffectiveness(move.type, target.types);
    result.effectiveness = effectiveness;
    damage *= effectiveness;

    // Effectiveness messages
    if (effectiveness > 1) {
      result.messages.push("It's super effective!");
    } else if (effectiveness < 1 && effectiveness > 0) {
      result.messages.push("It's not very effective...");
    } else if (effectiveness === 0) {
      result.messages.push("It had no effect!");
      result.damage = 0;
      return result;
    }

    // Status condition effects on damage
    if (attacker.status === 'burn' && move.damageClass === 'physical') {
      damage *= 0.5;
    }

    // Random factor (85-100%)
    damage *= (Math.random() * 0.15 + 0.85);

    // Ensure minimum damage
    result.damage = Math.floor(Math.max(1, damage));
    
    return result;
  }

  /**
   * Apply move effects - Enhanced version for PokeAPI integration
   */
  static applyMoveEffect(move: BattleMove, user: BattlePokemon, target: BattlePokemon): { user: BattlePokemon; target: BattlePokemon; messages: string[] } {
    const newUser = { ...user };
    const newTarget = { ...target };
    const messages: string[] = [];

    if (!move.effect) return { user: newUser, target: newTarget, messages };

    switch (move.effect) {
      // Protection
      case 'protect':
        newUser.volatileStatuses.push({ type: 'protected', turnsRemaining: 1 });
        messages.push(`${user.name} protected itself!`);
        break;

      // Status conditions
      case 'paralyze':
        if (!newTarget.status && !newTarget.types.includes('electric')) {
          newTarget.status = 'paralysis';
          messages.push(`${target.name} was paralyzed! It may be unable to move!`);
        } else {
          messages.push(`${target.name} is already affected by a status condition!`);
        }
        break;

      case 'burn':
        if (!newTarget.status && !newTarget.types.includes('fire')) {
          newTarget.status = 'burn';
          messages.push(`${target.name} was burned!`);
        } else {
          messages.push(`${target.name} is already affected by a status condition!`);
        }
        break;

      case 'poison':
        if (!newTarget.status && !newTarget.types.includes('poison') && !newTarget.types.includes('steel')) {
          newTarget.status = 'poison';
          messages.push(`${target.name} was poisoned!`);
        } else {
          messages.push(`${target.name} is already affected by a status condition!`);
        }
        break;

      case 'bad_poison':
        if (!newTarget.status && !newTarget.types.includes('poison') && !newTarget.types.includes('steel')) {
          newTarget.status = 'bad-poison';
          newTarget.statusTurns = 0;
          messages.push(`${target.name} was badly poisoned!`);
        } else {
          messages.push(`${target.name} is already affected by a status condition!`);
        }
        break;

      case 'freeze':
        if (!newTarget.status && !newTarget.types.includes('ice') && !newTarget.types.includes('fire')) {
          newTarget.status = 'freeze';
          messages.push(`${target.name} was frozen solid!`);
        } else {
          messages.push(`${target.name} is already affected by a status condition!`);
        }
        break;

      case 'sleep':
        if (!newTarget.status) {
          newTarget.status = 'sleep';
          newTarget.statusTurns = Math.floor(Math.random() * 3) + 1; // 1-3 turns
          messages.push(`${target.name} fell asleep!`);
        } else {
          messages.push(`${target.name} is already affected by a status condition!`);
        }
        break;

      case 'confuse':
        const alreadyConfused = newTarget.volatileStatuses.some(s => s.type === 'confused');
        if (!alreadyConfused) {
          newTarget.volatileStatuses.push({ type: 'confused', turnsRemaining: Math.floor(Math.random() * 4) + 1 });
          messages.push(`${target.name} became confused!`);
        }
        break;

      case 'flinch':
        newTarget.volatileStatuses.push({ type: 'flinched', turnsRemaining: 1 });
        messages.push(`${target.name} flinched!`);
        break;

      // Stat changes - Attack
      case 'raise_attack':
        newUser.statStages.attack = Math.min(6, newUser.statStages.attack + 1);
        messages.push(`${user.name}'s Attack rose!`);
        break;
      case 'raise_attack_2':
        newUser.statStages.attack = Math.min(6, newUser.statStages.attack + 2);
        messages.push(`${user.name}'s Attack rose sharply!`);
        break;
      case 'lower_attack':
        newTarget.statStages.attack = Math.max(-6, newTarget.statStages.attack - 1);
        messages.push(`${target.name}'s Attack fell!`);
        break;
      case 'lower_attack_2':
        newTarget.statStages.attack = Math.max(-6, newTarget.statStages.attack - 2);
        messages.push(`${target.name}'s Attack fell sharply!`);
        break;

      // Stat changes - Defense
      case 'raise_defense':
        newUser.statStages.defense = Math.min(6, newUser.statStages.defense + 1);
        messages.push(`${user.name}'s Defense rose!`);
        break;
      case 'raise_defense_2':
        newUser.statStages.defense = Math.min(6, newUser.statStages.defense + 2);
        messages.push(`${user.name}'s Defense rose sharply!`);
        break;
      case 'lower_defense':
        newTarget.statStages.defense = Math.max(-6, newTarget.statStages.defense - 1);
        messages.push(`${target.name}'s Defense fell!`);
        break;
      case 'lower_defense_2':
        newTarget.statStages.defense = Math.max(-6, newTarget.statStages.defense - 2);
        messages.push(`${target.name}'s Defense fell sharply!`);
        break;

      // Stat changes - Special Attack
      case 'raise_special_attack':
        newUser.statStages.specialAttack = Math.min(6, newUser.statStages.specialAttack + 1);
        messages.push(`${user.name}'s Special Attack rose!`);
        break;
      case 'raise_special_attack_2':
        newUser.statStages.specialAttack = Math.min(6, newUser.statStages.specialAttack + 2);
        messages.push(`${user.name}'s Special Attack rose sharply!`);
        break;
      case 'lower_special_attack':
        newTarget.statStages.specialAttack = Math.max(-6, newTarget.statStages.specialAttack - 1);
        messages.push(`${target.name}'s Special Attack fell!`);
        break;
      case 'lower_special_attack_2':
        newTarget.statStages.specialAttack = Math.max(-6, newTarget.statStages.specialAttack - 2);
        messages.push(`${target.name}'s Special Attack fell sharply!`);
        break;

      // Stat changes - Special Defense
      case 'raise_special_defense':
        newUser.statStages.specialDefense = Math.min(6, newUser.statStages.specialDefense + 1);
        messages.push(`${user.name}'s Special Defense rose!`);
        break;
      case 'raise_special_defense_2':
        newUser.statStages.specialDefense = Math.min(6, newUser.statStages.specialDefense + 2);
        messages.push(`${user.name}'s Special Defense rose sharply!`);
        break;
      case 'lower_special_defense':
        newTarget.statStages.specialDefense = Math.max(-6, newTarget.statStages.specialDefense - 1);
        messages.push(`${target.name}'s Special Defense fell!`);
        break;
      case 'lower_special_defense_2':
        newTarget.statStages.specialDefense = Math.max(-6, newTarget.statStages.specialDefense - 2);
        messages.push(`${target.name}'s Special Defense fell sharply!`);
        break;

      // Stat changes - Speed
      case 'raise_speed':
        newUser.statStages.speed = Math.min(6, newUser.statStages.speed + 1);
        messages.push(`${user.name}'s Speed rose!`);
        break;
      case 'raise_speed_2':
        newUser.statStages.speed = Math.min(6, newUser.statStages.speed + 2);
        messages.push(`${user.name}'s Speed rose sharply!`);
        break;
      case 'lower_speed':
        newTarget.statStages.speed = Math.max(-6, newTarget.statStages.speed - 1);
        messages.push(`${target.name}'s Speed fell!`);
        break;
      case 'lower_speed_2':
        newTarget.statStages.speed = Math.max(-6, newTarget.statStages.speed - 2);
        messages.push(`${target.name}'s Speed fell sharply!`);
        break;

      // Healing moves
      case 'heal_25':
        const heal25Amount = Math.floor(newUser.maxHp * 0.25);
        const actualHeal25 = Math.min(heal25Amount, newUser.maxHp - newUser.currentHp);
        newUser.currentHp += actualHeal25;
        messages.push(`${user.name} restored ${actualHeal25} HP!`);
        break;

      case 'heal_50':
        const heal50Amount = Math.floor(newUser.maxHp * 0.5);
        const actualHeal50 = Math.min(heal50Amount, newUser.maxHp - newUser.currentHp);
        newUser.currentHp += actualHeal50;
        messages.push(`${user.name} restored ${actualHeal50} HP!`);
        break;

      case 'heal_100':
        const heal100Amount = newUser.maxHp - newUser.currentHp;
        newUser.currentHp = newUser.maxHp;
        messages.push(`${user.name} restored ${heal100Amount} HP!`);
        break;

      case 'rest':
        newUser.currentHp = newUser.maxHp;
        newUser.status = 'sleep';
        newUser.statusTurns = 2;
        messages.push(`${user.name} restored its HP and fell asleep!`);
        break;

      // Screen effects
      case 'light_screen':
        // TODO: Implement light screen effect (reduces special damage)
        messages.push(`${user.name} made a light screen!`);
        break;

      case 'reflect':
        // TODO: Implement reflect effect (reduces physical damage)
        messages.push(`${user.name} made a barrier with Reflect!`);
        break;
    }

    return { user: newUser, target: newTarget, messages };
  }

  /**
   * Apply status conditions at end of turn
   */
  static applyEndOfTurnEffects(pokemon: BattlePokemon): { pokemon: BattlePokemon; messages: string[] } {
    const newPokemon = { ...pokemon };
    const messages: string[] = [];

    // Status condition damage
    if (newPokemon.status) {
      switch (newPokemon.status) {
        case 'burn':
          const burnDamage = Math.max(1, Math.floor(newPokemon.maxHp / 16));
          newPokemon.currentHp = Math.max(0, newPokemon.currentHp - burnDamage);
          messages.push(`${pokemon.name} was hurt by its burn!`);
          break;

        case 'poison':
          const poisonDamage = Math.max(1, Math.floor(newPokemon.maxHp / 8));
          newPokemon.currentHp = Math.max(0, newPokemon.currentHp - poisonDamage);
          messages.push(`${pokemon.name} was hurt by poison!`);
          break;

        case 'bad-poison':
          const badPoisonDamage = Math.max(1, Math.floor(newPokemon.maxHp * (newPokemon.statusTurns || 1) / 16));
          newPokemon.currentHp = Math.max(0, newPokemon.currentHp - badPoisonDamage);
          messages.push(`${pokemon.name} was hurt by poison!`);
          newPokemon.statusTurns = (newPokemon.statusTurns || 0) + 1;
          break;

        case 'sleep':
          if ((newPokemon.statusTurns || 0) > 0) {
            newPokemon.statusTurns = (newPokemon.statusTurns || 1) - 1;
            if (newPokemon.statusTurns === 0) {
              newPokemon.status = null;
              messages.push(`${pokemon.name} woke up!`);
            }
          }
          break;
      }
    }

    // Update volatile statuses
    newPokemon.volatileStatuses = newPokemon.volatileStatuses
      .map(status => ({ ...status, turnsRemaining: status.turnsRemaining - 1 }))
      .filter(status => status.turnsRemaining > 0);

    return { pokemon: newPokemon, messages };
  }

  /**
   * Check if Pokemon can move (not sleeping, paralyzed, etc.)
   */
  static canPokemonMove(pokemon: BattlePokemon): { canMove: boolean; message?: string } {
    // Sleep check
    if (pokemon.status === 'sleep') {
      return { canMove: false, message: `${pokemon.name} is fast asleep!` };
    }

    // Freeze check (75% chance to stay frozen)
    if (pokemon.status === 'freeze' && Math.random() < 0.75) {
      return { canMove: false, message: `${pokemon.name} is frozen solid!` };
    }

    // Paralysis check (25% chance to be fully paralyzed)
    if (pokemon.status === 'paralysis' && Math.random() < 0.25) {
      return { canMove: false, message: `${pokemon.name} is paralyzed and can't move!` };
    }

    // Confusion check
    const confused = pokemon.volatileStatuses.find(s => s.type === 'confused');
    if (confused && Math.random() < 0.5) {
      return { canMove: false, message: `${pokemon.name} is confused and hurt itself!` };
    }

    return { canMove: true };
  }

  /**
   * Initialize a new stat stages object
   */
  static createStatStages(): StatStages {
    return {
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
      accuracy: 0,
      evasion: 0
    };
  }
} 