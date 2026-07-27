import { Dex, RandomPlayerAI, type PRNGSeed } from '@pkmn/sim';
import type { RunDifficulty } from '../types/battle-run';
import { getBattleAiProfile } from '../utils/battle-ai-profile';

export interface AiMoveOption {
  choice: string;
  moveName: string;
}

export interface AiSwitchOption {
  slot: number;
  species: string;
  condition: string;
  moves?: string[];
}

type BattleSideId = 'p1' | 'p2';

export interface BattleAiContext {
  activeHpRatio: number;
  opponentHpRatio: number;
  activeStatus: string | null;
  opponentStatus: string | null;
  activeBoosts: Record<string, number>;
  opponentSideConditions: Set<string>;
  ownSideConditions: Set<string>;
  weather: string | null;
  terrain: string | null;
  lastMove: string | null;
  physicalAttackCount: number;
  specialAttackCount: number;
}

const DEFAULT_AI_CONTEXT: BattleAiContext = {
  activeHpRatio: 1,
  opponentHpRatio: 1,
  activeStatus: null,
  opponentStatus: null,
  activeBoosts: {},
  opponentSideConditions: new Set(),
  ownSideConditions: new Set(),
  weather: null,
  terrain: null,
  lastMove: null,
  physicalAttackCount: 1,
  specialAttackCount: 1,
};

export function findLastActiveSpecies(log: string[], side: BattleSideId): string | null {
  for (let index = log.length - 1; index >= 0; index -= 1) {
    const parts = log[index].split('|');
    if (!['switch', 'drag', 'replace'].includes(parts[1])) continue;
    if (!parts[2]?.startsWith(`${side}a:`)) continue;
    return parts[3]?.split(',')[0]?.trim() || null;
  }
  return null;
}

function parseCondition(condition: string): { hpRatio: number; status: string | null } {
  const hpMatch = condition.match(/^(\d+)(?:\/(\d+))?/);
  const current = Number(hpMatch?.[1] ?? 0);
  const maximum = Number(hpMatch?.[2] ?? 100);
  const status = condition.match(/\b(brn|frz|par|psn|slp|tox)\b/)?.[1] ?? null;
  return {
    hpRatio: maximum > 0 ? Math.max(0, Math.min(1, current / maximum)) : 0,
    status,
  };
}

function protocolSide(value: string | undefined): BattleSideId | null {
  if (value?.startsWith('p1')) return 'p1';
  if (value?.startsWith('p2')) return 'p2';
  return null;
}

export function readBattleAiContext(log: string[]): BattleAiContext {
  const context: BattleAiContext = {
    ...DEFAULT_AI_CONTEXT,
    activeBoosts: {},
    opponentSideConditions: new Set(),
    ownSideConditions: new Set(),
  };

  log.forEach(line => {
    const parts = line.split('|');
    const event = parts[1];
    const side = protocolSide(parts[2]);

    if (['switch', 'drag', 'replace'].includes(event) && side) {
      const condition = parseCondition(parts[4] ?? '');
      if (side === 'p2') {
        context.activeHpRatio = condition.hpRatio;
        context.activeStatus = condition.status;
        context.activeBoosts = {};
        context.lastMove = null;
      } else {
        context.opponentHpRatio = condition.hpRatio;
        context.opponentStatus = condition.status;
      }
      return;
    }

    if ((event === '-damage' || event === '-heal') && side) {
      const condition = parseCondition(parts[3] ?? '');
      if (side === 'p2') {
        context.activeHpRatio = condition.hpRatio;
        context.activeStatus = condition.status ?? context.activeStatus;
      } else {
        context.opponentHpRatio = condition.hpRatio;
        context.opponentStatus = condition.status ?? context.opponentStatus;
      }
      return;
    }

    if ((event === '-status' || event === '-curestatus') && side) {
      const status = event === '-status' ? parts[3] ?? null : null;
      if (side === 'p2') context.activeStatus = status;
      else context.opponentStatus = status;
      return;
    }

    if ((event === '-boost' || event === '-unboost') && side === 'p2') {
      const stat = parts[3];
      const amount = Number(parts[4] ?? 0) * (event === '-boost' ? 1 : -1);
      if (stat) context.activeBoosts[stat] = (context.activeBoosts[stat] ?? 0) + amount;
      return;
    }

    if (event === '-clearboost' && side === 'p2') {
      context.activeBoosts = {};
      return;
    }

    if (event === '-sidestart' || event === '-sideend') {
      const targetSide = protocolSide(parts[2]);
      const condition = Dex.toID(parts[3]?.replace(/^move:\s*/, '') ?? '');
      const conditions = targetSide === 'p2' ? context.ownSideConditions : context.opponentSideConditions;
      if (event === '-sidestart') conditions.add(condition);
      else conditions.delete(condition);
      return;
    }

    if (event === '-weather') {
      context.weather = parts[2] === 'none' ? null : Dex.toID(parts[2] ?? '');
      return;
    }

    if (event === '-fieldstart' || event === '-fieldend') {
      const terrain = Dex.toID(parts[2]?.replace(/^move:\s*/, '') ?? '');
      if (event === '-fieldstart') context.terrain = terrain;
      else if (context.terrain === terrain) context.terrain = null;
      return;
    }

    if (event === 'move' && side === 'p2') context.lastMove = parts[3] ?? null;
  });

  return context;
}

function scoreStatusMove(
  moveName: string,
  context: BattleAiContext,
  tacticalTier: 1 | 2 | 3,
  opponentSpecies: string | null,
): number {
  if (tacticalTier === 1) return 0;
  const move = Dex.moves.get(moveName);
  const accuracy = move.accuracy === true ? 1 : move.accuracy / 100;
  const missingHp = 1 - context.activeHpRatio;

  if (move.heal) {
    if (context.activeHpRatio >= 0.82) return 4;
    return (45 + missingHp * 150) * accuracy;
  }

  const boosts = move.boosts ?? move.self?.boosts;
  if (boosts) {
    if (context.activeHpRatio < 0.35) return 12;
    const usefulStages = Object.entries(boosts).reduce((total, [stat, amount]) => {
      if (typeof amount !== 'number' || amount <= 0) return total;
      if (stat === 'atk' && context.physicalAttackCount === 0) return total;
      if (stat === 'spa' && context.specialAttackCount === 0) return total;
      const existing = Math.max(0, context.activeBoosts[stat] ?? 0);
      return total + Math.max(0, Math.min(amount, 6 - existing));
    }, 0);
    if (usefulStages === 0) return 1;
    const existingBoosts = Object.values(context.activeBoosts)
      .reduce((total, amount) => total + Math.max(0, amount), 0);
    return Math.max(15, 72 + usefulStages * 18 - existingBoosts * 14);
  }

  if (move.status) {
    if (context.opponentStatus) return 5;
    const opponent = opponentSpecies ? Dex.species.get(opponentSpecies) : null;
    if (opponent?.exists) {
      if (!Dex.getImmunity(move, opponent.types)) return 0;
      if (move.status === 'brn' && opponent.types.includes('Fire')) return 0;
      if (['psn', 'tox'].includes(move.status)
        && opponent.types.some(type => ['Poison', 'Steel'].includes(type))) return 0;
      if (move.flags.powder && opponent.types.includes('Grass')) return 0;
    }
    return 92 * accuracy;
  }

  if (tacticalTier === 2) return 28 * accuracy;

  if (move.sideCondition) {
    const targetsOwnSide = ['auroraveil', 'lightscreen', 'reflect', 'safeguard', 'tailwind']
      .includes(Dex.toID(move.sideCondition));
    const existing = targetsOwnSide ? context.ownSideConditions : context.opponentSideConditions;
    if (existing.has(Dex.toID(move.sideCondition))) return 2;
    return (targetsOwnSide ? 78 : 88) * accuracy;
  }

  if (move.weather) {
    if (context.weather === Dex.toID(move.weather)) return 2;
    return 72 * accuracy;
  }

  if (move.terrain) {
    if (context.terrain === Dex.toID(move.terrain)) return 2;
    return 72 * accuracy;
  }

  if (move.volatileStatus === 'protect') {
    return Dex.toID(context.lastMove ?? '') === move.id ? 8 : 46;
  }

  if (move.forceSwitch) return 58 * accuracy;
  if (move.volatileStatus) return 62 * accuracy;
  return 34 * accuracy;
}

export function scoreBattleMove(
  moveName: string,
  activeSpecies: string | null,
  opponentSpecies: string | null,
  context: BattleAiContext = DEFAULT_AI_CONTEXT,
  tacticalTier: 1 | 2 | 3 = 3,
): number {
  const move = Dex.moves.get(moveName);
  if (!move.exists) return 0;
  const active = activeSpecies ? Dex.species.get(activeSpecies) : null;
  const opponent = opponentSpecies ? Dex.species.get(opponentSpecies) : null;
  if (move.category === 'Status') {
    return scoreStatusMove(moveName, context, tacticalTier, opponentSpecies);
  }

  const accuracy = move.accuracy === true ? 1 : move.accuracy / 100;
  const stab = active?.exists && active.types.includes(move.type) ? 1.5 : 1;
  const priority = move.priority > 0 ? 1.05 : 1;
  let utility = 1;
  if (move.drain && context.activeHpRatio < 0.75) utility += (1 - context.activeHpRatio) * 0.35;
  if (move.recoil && context.activeHpRatio < 0.35) utility -= 0.2;
  if (move.selfSwitch) utility += 0.06;
  if (move.priority > 0 && context.opponentHpRatio < 0.3) utility += 0.15;
  if (!opponent?.exists) return move.basePower * accuracy * stab * priority * utility;
  if (!Dex.getImmunity(move, opponent.types)) return 0;

  const effectiveness = 2 ** Dex.getEffectiveness(move, opponent.types);
  return move.basePower * accuracy * stab * priority * effectiveness * utility;
}

export function chooseBestMove(
  options: AiMoveOption[],
  log: string[],
  tacticalTier: 1 | 2 | 3 = 3,
): AiMoveOption | null {
  const activeSpecies = findLastActiveSpecies(log, 'p2');
  const opponentSpecies = findLastActiveSpecies(log, 'p1');
  const context = readBattleAiContext(log);
  context.physicalAttackCount = options.filter(option => (
    Dex.moves.get(option.moveName).category === 'Physical'
  )).length;
  context.specialAttackCount = options.filter(option => (
    Dex.moves.get(option.moveName).category === 'Special'
  )).length;
  let best: AiMoveOption | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  options.forEach(option => {
    const score = scoreBattleMove(
      option.moveName,
      activeSpecies,
      opponentSpecies,
      context,
      tacticalTier,
    );
    if (score > bestScore) {
      best = option;
      bestScore = score;
    }
  });

  return best;
}

function remainingHpRatio(condition: string): number {
  const match = condition.match(/^(\d+)\/(\d+)/);
  if (!match) return 0;
  const current = Number(match[1]);
  const maximum = Number(match[2]);
  return maximum > 0 ? current / maximum : 0;
}

export function scoreBattleSwitch(
  species: string,
  condition: string,
  opponentSpecies: string | null,
  moves: string[] = [],
): number {
  const candidate = Dex.species.get(species);
  const opponent = opponentSpecies ? Dex.species.get(opponentSpecies) : null;
  if (!candidate.exists) return Number.NEGATIVE_INFINITY;

  let score = remainingHpRatio(condition);
  if (!opponent?.exists) return score;
  opponent.types.forEach(type => {
    if (!Dex.getImmunity(type, candidate.types)) {
      score += 4;
    } else {
      score -= Dex.getEffectiveness(type, candidate.types) * 2;
    }
  });
  if (moves.length) {
    const bestPressure = Math.max(
      ...moves.map(move => scoreBattleMove(move, species, opponentSpecies)),
    );
    score += Math.min(3, bestPressure / 75);
  }
  return score;
}

export function chooseBestSwitch(options: AiSwitchOption[], log: string[]): AiSwitchOption | null {
  const opponentSpecies = findLastActiveSpecies(log, 'p1');
  let best: AiSwitchOption | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  options.forEach(option => {
    const score = scoreBattleSwitch(option.species, option.condition, opponentSpecies, option.moves);
    if (score > bestScore) {
      best = option;
      bestScore = score;
    }
  });

  return best;
}

function normalizeMoveOptions(options: unknown[]): AiMoveOption[] {
  return options.flatMap(option => {
    if (!option || typeof option !== 'object') return [];
    const record = option as Record<string, unknown>;
    const move = record.move;
    if (typeof record.choice !== 'string' || !move || typeof move !== 'object') return [];
    const moveName = (move as Record<string, unknown>).move;
    return typeof moveName === 'string' ? [{ choice: record.choice, moveName }] : [];
  });
}

function normalizeSwitchOptions(options: unknown[]): AiSwitchOption[] {
  return options.flatMap(option => {
    if (!option || typeof option !== 'object') return [];
    const record = option as Record<string, unknown>;
    const pokemon = record.pokemon;
    if (typeof record.slot !== 'number' || !pokemon || typeof pokemon !== 'object') return [];
    const details = (pokemon as Record<string, unknown>).details;
    const condition = (pokemon as Record<string, unknown>).condition;
    const moves = (pokemon as Record<string, unknown>).moves;
    if (typeof details !== 'string') return [];
    return [{
      slot: record.slot,
      species: details.split(',')[0].trim(),
      condition: typeof condition === 'string' ? condition : '',
      moves: Array.isArray(moves) ? moves.filter((move): move is string => typeof move === 'string') : [],
    }];
  });
}

export class ChallengePlayerAI extends RandomPlayerAI {
  private readonly smartChance: number;
  private readonly tacticalTier: 1 | 2 | 3;

  constructor(
    playerStream: ConstructorParameters<typeof RandomPlayerAI>[0],
    stage: number,
    difficulty: RunDifficulty = 'medium',
    seed?: PRNGSeed,
  ) {
    const profile = getBattleAiProfile(stage, difficulty);
    super(playerStream, { move: profile.moveChance, seed });
    this.smartChance = profile.smartChance;
    this.tacticalTier = profile.tier;
  }

  protected chooseMove(_active: unknown, moves: unknown[]): string {
    const options = normalizeMoveOptions(moves);
    if (options.length === 0) throw new Error('Challenge AI has no legal move.');
    if (this.prng.random() >= this.smartChance) return this.prng.sample(options).choice;
    return chooseBestMove(options, this.log, this.tacticalTier)?.choice ?? this.prng.sample(options).choice;
  }

  protected chooseSwitch(_active: unknown, switches: unknown[]): number {
    const options = normalizeSwitchOptions(switches);
    if (options.length === 0) throw new Error('Challenge AI has no legal switch.');
    if (this.prng.random() >= this.smartChance) return this.prng.sample(options).slot;
    return chooseBestSwitch(options, this.log)?.slot ?? this.prng.sample(options).slot;
  }
}
