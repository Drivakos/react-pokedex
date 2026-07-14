import type { RunPokemon, RunRewardSummary } from '../types/battle-run';

export const PARTY_LIMIT = 6;
export const LEVELS_PER_STAGE = 2;
export const CHECKPOINT_INTERVAL = 5;

export function isCheckpointStage(stage: number): boolean {
  return Math.max(1, stage) % CHECKPOINT_INTERVAL === 0;
}

export function levelForStage(stage: number): number {
  return Math.min(100, 5 + (Math.max(1, stage) - 1) * LEVELS_PER_STAGE);
}
export function enemyPartySize(stage: number): number {
  const normalizedStage = Math.max(1, stage);
  const baseSize = 1 + Math.floor((normalizedStage - 1) / 4);
  return Math.min(3, baseSize + (isCheckpointStage(normalizedStage) ? 1 : 0));
}

export function targetBstForStage(stage: number): number {
  const normalizedStage = Math.max(1, stage);
  const checkpointBoost = isCheckpointStage(normalizedStage) ? 35 : 0;
  return Math.min(600, 330 + (normalizedStage - 1) * 24 + checkpointBoost);
}

export function levelUpSurvivors(party: RunPokemon[], levels = LEVELS_PER_STAGE): RunPokemon[] {
  return party.map(pokemon => ({
    ...pokemon,
    level: Math.min(100, pokemon.level + levels),
  }));
}

export function calculateBattleReward(
  stage: number,
  turns: number,
  partySize: number,
  faintedCount: number,
): RunRewardSummary {
  const normalizedStage = Math.max(1, stage);
  const normalizedTurns = Math.max(1, turns);
  const survivors = Math.max(0, partySize - faintedCount);
  const stageScore = normalizedStage * 400;
  const survivalBonus = survivors * 150;
  const tempoBonus = Math.max(0, 12 - normalizedTurns) * 50;
  const flawlessBonus = faintedCount === 0 ? 400 : 0;
  const checkpointBonus = isCheckpointStage(normalizedStage) ? 1000 : 0;
  const levelsGained = LEVELS_PER_STAGE + (isCheckpointStage(normalizedStage) ? 1 : 0);

  return {
    stage: normalizedStage,
    turns: normalizedTurns,
    survivors,
    stageScore,
    survivalBonus,
    tempoBonus,
    flawlessBonus,
    checkpointBonus,
    totalScore: stageScore + survivalBonus + tempoBonus + flawlessBonus + checkpointBonus,
    levelsGained,
  };
}

export function addOrReplacePartyMember(
  party: RunPokemon[],
  recruit: RunPokemon,
  replaceIndex?: number,
): RunPokemon[] {
  if (party.length < PARTY_LIMIT) return [...party, recruit];
  if (replaceIndex === undefined || replaceIndex < 0 || replaceIndex >= party.length) {
    return party;
  }

  return party.map((pokemon, index) => index === replaceIndex ? recruit : pokemon);
}

export function createSeededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
