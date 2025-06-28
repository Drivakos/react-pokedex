// Pokemon Showdown Data Adapter
// Uses Showdown's accurate data and calculations with simplified interface

import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';

// Initialize Pokemon Showdown data
const gens = new Generations(Dex);
const currentGen = gens.get(9); // Use Gen 9 as default

export interface ShowdownPokemon {
  id: number;
  name: string;
  species: string;
  types: string[];
  level: number;
  currentHp: number;
  maxHp: number;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  moves: ShowdownMove[];
  status?: string | null;
  statusTurns?: number;
  statStages: StatStages;
  volatileStatuses: VolatileStatus[];
  sprites: {
    front_default: string;
    back_default: string;
  };
  ability?: string;
}

export interface ShowdownMove {
  id: string;
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  currentPP: number;
  category: 'Physical' | 'Special' | 'Status';
  priority: number;
  description: string;
  effect?: string;
  target: 'normal' | 'self' | 'allAdjacent' | 'allAdjacentFoes';
}

export interface StatStages {
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  accuracy: number;
  evasion: number;
}

export interface VolatileStatus {
  type: string;
  turnsRemaining: number;
}

export interface DamageResult {
  damage: number;
  effectiveness: number;
  isCritical: boolean;
  missed: boolean;
  messages: string[];
}

export class ShowdownAdapter {
  private gen = currentGen;

  // Convert PokeAPI Pokemon to Showdown format
  convertPokemon(pokemon: any): ShowdownPokemon {
    const species = this.gen.species.get(pokemon.name);
    const level = pokemon.level || 50;
    
    // Calculate stats using Showdown's method
    const baseStats = {
      hp: species?.baseStats.hp || pokemon.stats?.hp || 100,
      attack: species?.baseStats.atk || pokemon.stats?.attack || 80,
      defense: species?.baseStats.def || pokemon.stats?.defense || 80,
      specialAttack: species?.baseStats.spa || pokemon.stats?.['special-attack'] || 80,
      specialDefense: species?.baseStats.spd || pokemon.stats?.['special-defense'] || 80,
      speed: species?.baseStats.spe || pokemon.stats?.speed || 80,
    };

    const actualStats = this.calculateStats(baseStats, level);

    return {
      id: pokemon.id,
      name: pokemon.name,
      species: species?.name || pokemon.name,
      types: species?.types || pokemon.types || ['normal'],
      level,
      currentHp: pokemon.currentHp || actualStats.hp,
      maxHp: actualStats.hp,
      stats: actualStats,
      moves: this.convertMoves(pokemon.moves || []),
      status: pokemon.status || null,
      statusTurns: pokemon.statusTurns || 0,
      statStages: this.createStatStages(),
      volatileStatuses: [],
      sprites: pokemon.sprites || { front_default: '', back_default: '' },
      ability: pokemon.ability || this.getDefaultAbility(species?.name || pokemon.name)
    };
  }

  // Calculate Pokemon stats using Showdown's formula
  private calculateStats(baseStats: any, level: number) {
    return {
      hp: Math.floor(((2 * baseStats.hp + 31 + 252/4) * level) / 100) + level + 10,
      attack: Math.floor(((2 * baseStats.attack + 31 + 252/4) * level) / 100) + 5,
      defense: Math.floor(((2 * baseStats.defense + 31 + 252/4) * level) / 100) + 5,
      specialAttack: Math.floor(((2 * baseStats.specialAttack + 31 + 252/4) * level) / 100) + 5,
      specialDefense: Math.floor(((2 * baseStats.specialDefense + 31 + 252/4) * level) / 100) + 5,
      speed: Math.floor(((2 * baseStats.speed + 31 + 252/4) * level) / 100) + 5,
    };
  }

  // Convert moves to Showdown format
  private convertMoves(pokemonMoves: any[]): ShowdownMove[] {
    return pokemonMoves.slice(0, 4).map((moveData: any) => {
      const moveName = typeof moveData === 'string' ? moveData : moveData.name;
      const move = this.gen.moves.get(moveName);
      
      return {
        id: move?.id || moveName,
        name: move?.name || moveName,
        type: move?.type || 'normal',
        power: move?.basePower || 0,
        accuracy: move?.accuracy === true ? 100 : (move?.accuracy || 100),
        pp: move?.pp || 15,
        currentPP: move?.pp || 15,
        category: move?.category || 'Status',
        priority: move?.priority || 0,
        description: move?.shortDesc || move?.desc || `${moveName} - A Pokemon move`,
        effect: this.getMoveEffect(move),
        target: move?.target || 'normal'
      };
    });
  }

  // Get move effect for compatibility with existing system
  private getMoveEffect(move: any): string | undefined {
    if (!move) return undefined;

    // Map Showdown effects to our system
    if (move.secondary?.chance && move.secondary.status) {
      return move.secondary.status;
    }
    
    if (move.boosts) {
      const boost = Object.keys(move.boosts)[0];
      const amount = move.boosts[boost];
      return amount > 0 ? `raise_${boost}${amount > 1 ? '_2' : ''}` : `lower_${boost}${amount < -1 ? '_2' : ''}`;
    }

    if (move.heal) {
      return `heal_${Math.floor(move.heal[0] / move.heal[1] * 100)}`;
    }

    if (move.flags?.protect) {
      return 'protect';
    }

    return undefined;
  }

  // Get default ability for a Pokemon
  private getDefaultAbility(speciesName: string): string {
    const species = this.gen.species.get(speciesName);
    return species?.abilities?.[0] || 'Pressure';
  }

  // Create initial stat stages
  private createStatStages(): StatStages {
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

  // Calculate damage using accurate Showdown formulas
  calculateDamage(attacker: ShowdownPokemon, defender: ShowdownPokemon, move: ShowdownMove): DamageResult {
    const result: DamageResult = {
      damage: 0,
      effectiveness: 1,
      isCritical: false,
      missed: false,
      messages: []
    };

    // Status moves don't deal damage
    if (move.category === 'Status') {
      return result;
    }

    // Check if move hits
    if (!this.checkAccuracy(move, attacker, defender)) {
      result.missed = true;
      result.messages.push(`${attacker.name}'s attack missed!`);
      return result;
    }

    // Get effective stats with stat stages
    const attackStat = move.category === 'Physical' ? 'attack' : 'specialAttack';
    const defenseStat = move.category === 'Physical' ? 'defense' : 'specialDefense';
    
    const attack = this.getEffectiveStat(attacker.stats[attackStat], attacker.statStages[attackStat]);
    const defense = this.getEffectiveStat(defender.stats[defenseStat], defender.statStages[defenseStat]);

    // Check for critical hit
    const isCritical = this.checkCriticalHit();
    result.isCritical = isCritical;

    // Base damage calculation using Showdown's formula
    let damage = Math.floor(((2 * attacker.level + 10) / 250) * (attack / defense) * move.power) + 2;

    // Critical hit multiplier
    if (isCritical) {
      damage = Math.floor(damage * 1.5);
      result.messages.push("A critical hit!");
    }

    // Same Type Attack Bonus (STAB)
    if (attacker.types.includes(move.type)) {
      damage = Math.floor(damage * 1.5);
    }

    // Type effectiveness using Showdown's accurate chart
    const effectiveness = this.getTypeEffectiveness(move.type, defender.types);
    result.effectiveness = effectiveness;
    damage = Math.floor(damage * effectiveness);

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
    if (attacker.status === 'burn' && move.category === 'Physical') {
      damage = Math.floor(damage * 0.5);
    }

    // Random factor (85-100%)
    damage = Math.floor(damage * (Math.random() * 0.15 + 0.85));

    // Ensure minimum damage
    result.damage = Math.max(1, damage);
    
    return result;
  }

  // Check if move hits using accurate formula
  private checkAccuracy(move: ShowdownMove, attacker: ShowdownPokemon, defender: ShowdownPokemon): boolean {
    if (move.accuracy === true || move.accuracy >= 100) return true;
    
    const accuracyStage = attacker.statStages.accuracy;
    const evasionStage = defender.statStages.evasion;
    
    const stageMultiplier = (accuracyStage - evasionStage);
    const effectiveAccuracy = move.accuracy * (
      stageMultiplier >= 0 
        ? (3 + stageMultiplier) / 3 
        : 3 / (3 + Math.abs(stageMultiplier))
    );
    
    return Math.random() * 100 < effectiveAccuracy;
  }

  // Check for critical hit
  private checkCriticalHit(): boolean {
    return Math.random() < (1/24); // Base critical hit rate
  }

  // Get effective stat with stages
  private getEffectiveStat(baseStat: number, statStage: number): number {
    const multiplier = statStage >= 0 
      ? (2 + statStage) / 2 
      : 2 / (2 + Math.abs(statStage));
    return Math.floor(baseStat * multiplier);
  }

  // Get type effectiveness using Showdown's accurate chart
  getTypeEffectiveness(moveType: string, targetTypes: string[]): number {
    let effectiveness = 1;
    
    targetTypes.forEach(targetType => {
      const chart = this.gen.types.get(moveType);
      if (chart?.damageTaken?.[targetType] !== undefined) {
        switch (chart.damageTaken[targetType]) {
          case 1: // Not very effective
            effectiveness *= 0.5;
            break;
          case 2: // Super effective
            effectiveness *= 2;
            break;
          case 3: // No effect
            effectiveness = 0;
            break;
          // case 0: Normal effectiveness (1x)
        }
      }
    });
    
    return effectiveness;
  }

  // Apply move effects
  applyMoveEffect(move: ShowdownMove, user: ShowdownPokemon, target: ShowdownPokemon): {
    user: ShowdownPokemon;
    target: ShowdownPokemon;
    messages: string[];
  } {
    const newUser = { ...user };
    const newTarget = { ...target };
    const messages: string[] = [];

    if (!move.effect) return { user: newUser, target: newTarget, messages };

    // Use the existing effect system from our battle engine
    switch (move.effect) {
      case 'protect':
        newUser.volatileStatuses.push({ type: 'protected', turnsRemaining: 1 });
        messages.push(`${user.name} protected itself!`);
        break;

      case 'burn':
        if (!newTarget.status && !newTarget.types.includes('fire')) {
          newTarget.status = 'burn';
          messages.push(`${target.name} was burned!`);
        }
        break;

      case 'paralyze':
        if (!newTarget.status && !newTarget.types.includes('electric')) {
          newTarget.status = 'paralysis';
          messages.push(`${target.name} was paralyzed!`);
        }
        break;

      case 'poison':
        if (!newTarget.status && !newTarget.types.includes('poison') && !newTarget.types.includes('steel')) {
          newTarget.status = 'poison';
          messages.push(`${target.name} was poisoned!`);
        }
        break;

      // Stat boosts
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

      // Healing
      case 'heal_50':
        const healAmount = Math.floor(newUser.maxHp * 0.5);
        const actualHeal = Math.min(healAmount, newUser.maxHp - newUser.currentHp);
        newUser.currentHp += actualHeal;
        messages.push(`${user.name} restored ${actualHeal} HP!`);
        break;

      case 'rest':
        newUser.currentHp = newUser.maxHp;
        newUser.status = 'sleep';
        newUser.statusTurns = 2;
        messages.push(`${user.name} went to sleep and became healthy!`);
        break;
    }

    return { user: newUser, target: newTarget, messages };
  }

  // Apply end-of-turn effects
  applyEndOfTurnEffects(pokemon: ShowdownPokemon): { pokemon: ShowdownPokemon; messages: string[] } {
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

  // Check if Pokemon can move
  canPokemonMove(pokemon: ShowdownPokemon): { canMove: boolean; message?: string } {
    if (pokemon.status === 'sleep') {
      return { canMove: false, message: `${pokemon.name} is fast asleep!` };
    }

    if (pokemon.status === 'freeze' && Math.random() < 0.75) {
      return { canMove: false, message: `${pokemon.name} is frozen solid!` };
    }

    if (pokemon.status === 'paralysis' && Math.random() < 0.25) {
      return { canMove: false, message: `${pokemon.name} is paralyzed and can't move!` };
    }

    return { canMove: true };
  }

  // Get Pokemon species data
  getSpeciesData(name: string) {
    return this.gen.species.get(name);
  }

  // Get move data
  getMoveData(name: string) {
    return this.gen.moves.get(name);
  }

  // Get type data
  getTypeData(name: string) {
    return this.gen.types.get(name);
  }
} 