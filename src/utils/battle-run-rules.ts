import type { RunPokemon } from '../types/battle-run';

export const PARTY_LIMIT = 6;
export const LEVELS_PER_STAGE = 2;

export function levelForStage(stage: number): number {
  return Math.min(100, 5 + (Math.max(1, stage) - 1) * LEVELS_PER_STAGE);
}
export function enemyPartySize(stage: number): number {
  return Math.min(3, 1 + Math.floor((Math.max(1, stage) - 1) / 4));
}

export function targetBstForStage(stage: number): number {
  return Math.min(570, 330 + (Math.max(1, stage) - 1) * 24);
}

export function levelUpSurvivors(party: RunPokemon[]): RunPokemon[] {
  return party.map(pokemon => ({
    ...pokemon,
    level: Math.min(100, pokemon.level + LEVELS_PER_STAGE),
  }));
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
