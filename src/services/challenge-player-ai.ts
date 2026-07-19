import { Dex, RandomPlayerAI } from '@pkmn/sim';
import { getBattleAiProfile } from '../utils/battle-ai-profile';

export interface AiMoveOption {
  choice: string;
  moveName: string;
}

export interface AiSwitchOption {
  slot: number;
  species: string;
  condition: string;
}

type BattleSideId = 'p1' | 'p2';

export function findLastActiveSpecies(log: string[], side: BattleSideId): string | null {
  for (let index = log.length - 1; index >= 0; index -= 1) {
    const parts = log[index].split('|');
    if (!['switch', 'drag', 'replace'].includes(parts[1])) continue;
    if (!parts[2]?.startsWith(`${side}a:`)) continue;
    return parts[3]?.split(',')[0]?.trim() || null;
  }
  return null;
}

export function scoreBattleMove(
  moveName: string,
  activeSpecies: string | null,
  opponentSpecies: string | null,
): number {
  const move = Dex.moves.get(moveName);
  if (!move.exists || move.category === 'Status') return 0;

  const accuracy = move.accuracy === true ? 1 : move.accuracy / 100;
  const active = activeSpecies ? Dex.species.get(activeSpecies) : null;
  const opponent = opponentSpecies ? Dex.species.get(opponentSpecies) : null;
  const stab = active?.exists && active.types.includes(move.type) ? 1.5 : 1;
  const priority = move.priority > 0 ? 1.05 : 1;
  if (!opponent?.exists) return move.basePower * accuracy * stab * priority;
  if (!Dex.getImmunity(move, opponent.types)) return 0;

  const effectiveness = 2 ** Dex.getEffectiveness(move, opponent.types);
  return move.basePower * accuracy * stab * priority * effectiveness;
}

export function chooseBestMove(options: AiMoveOption[], log: string[]): AiMoveOption | null {
  const activeSpecies = findLastActiveSpecies(log, 'p2');
  const opponentSpecies = findLastActiveSpecies(log, 'p1');
  let best: AiMoveOption | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  options.forEach(option => {
    const score = scoreBattleMove(option.moveName, activeSpecies, opponentSpecies);
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

export function scoreBattleSwitch(species: string, condition: string, opponentSpecies: string | null): number {
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
  return score;
}

export function chooseBestSwitch(options: AiSwitchOption[], log: string[]): AiSwitchOption | null {
  const opponentSpecies = findLastActiveSpecies(log, 'p1');
  let best: AiSwitchOption | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  options.forEach(option => {
    const score = scoreBattleSwitch(option.species, option.condition, opponentSpecies);
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
    if (typeof details !== 'string') return [];
    return [{
      slot: record.slot,
      species: details.split(',')[0].trim(),
      condition: typeof condition === 'string' ? condition : '',
    }];
  });
}

export class ChallengePlayerAI extends RandomPlayerAI {
  private readonly smartChance: number;

  constructor(playerStream: ConstructorParameters<typeof RandomPlayerAI>[0], stage: number) {
    const profile = getBattleAiProfile(stage);
    super(playerStream, { move: profile.moveChance });
    this.smartChance = profile.smartChance;
  }

  protected chooseMove(_active: unknown, moves: unknown[]): string {
    const options = normalizeMoveOptions(moves);
    if (options.length === 0) throw new Error('Challenge AI has no legal move.');
    if (this.prng.random() >= this.smartChance) return this.prng.sample(options).choice;
    return chooseBestMove(options, this.log)?.choice ?? this.prng.sample(options).choice;
  }

  protected chooseSwitch(_active: unknown, switches: unknown[]): number {
    const options = normalizeSwitchOptions(switches);
    if (options.length === 0) throw new Error('Challenge AI has no legal switch.');
    if (this.prng.random() >= this.smartChance) return this.prng.sample(options).slot;
    return chooseBestSwitch(options, this.log)?.slot ?? this.prng.sample(options).slot;
  }
}
