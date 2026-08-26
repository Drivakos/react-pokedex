import type { BattleResult, PokemonStatSpread, RunPokemon } from '../types/battle-run';
import type { VsCanonicalResult, VsTeamSnapshotMember } from '../types/vs';

const statKeys: Record<keyof PokemonStatSpread, string> = {
  hp: 'hp',
  atk: 'attack',
  def: 'defense',
  spa: 'special-attack',
  spd: 'special-defense',
  spe: 'speed',
};

function statSpread(values: Record<string, number>, fallback: number): PokemonStatSpread {
  return Object.fromEntries(
    Object.entries(statKeys).map(([simulatorKey, databaseKey]) => [
      simulatorKey,
      values[simulatorKey] ?? values[databaseKey] ?? fallback,
    ]),
  ) as unknown as PokemonStatSpread;
}

function normalizeGender(gender: string | undefined): RunPokemon['gender'] {
  if (gender === 'M' || gender === 'male') return 'M';
  if (gender === 'F' || gender === 'female') return 'F';
  if (gender === 'N' || gender === 'genderless') return 'N';
  return undefined;
}

export function toVsRunPokemon(member: VsTeamSnapshotMember): RunPokemon {
  return {
    id: member.pokemonId,
    species: member.species,
    types: member.types,
    level: member.level,
    ability: member.ability,
    moves: member.moves,
    item: member.item,
    nature: member.nature,
    evs: statSpread(member.evs, 0),
    ivs: statSpread(member.ivs, 31),
    gender: normalizeGender(member.gender),
    teraType: member.teraType,
    shiny: member.isShiny,
    nickname: member.nickname,
    bst: 0,
  };
}

export function toCanonicalVsResult(result: BattleResult, isHost: boolean): VsCanonicalResult {
  if (result.winner === 'tie') return 'tie';
  if (result.winner === 'player') return isHost ? 'host' : 'guest';
  return isHost ? 'guest' : 'host';
}
