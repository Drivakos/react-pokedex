import { Dex } from '@pkmn/sim';
import type { TeamMember } from '../lib/supabase';
import type { PokemonStatSpread, RunPokemon } from '../types/battle-run';

export interface SavedTeamPokemonData {
  id: number;
  name: string;
}

export type SavedTeamPokemonMap = Record<number, SavedTeamPokemonData>;

export type SavedTeamIssueCode =
  | 'empty-team'
  | 'too-many-members'
  | 'invalid-position'
  | 'duplicate-position'
  | 'missing-pokemon-data'
  | 'unknown-species'
  | 'missing-ability'
  | 'unknown-ability'
  | 'invalid-move-count'
  | 'unknown-move'
  | 'unknown-item'
  | 'unknown-nature'
  | 'unknown-tera-type'
  | 'invalid-level'
  | 'invalid-ev'
  | 'invalid-ev-total'
  | 'invalid-iv';

export interface SavedTeamValidationIssue {
  code: SavedTeamIssueCode;
  message: string;
  position?: number;
}

export type SavedTeamBattleResult =
  | { ok: true; party: RunPokemon[] }
  | { ok: false; issues: SavedTeamValidationIssue[] };

export interface SavedTeamBattleOptions {
  /** VS defaults to a level-50 ruleset; use `saved` for formats preserving team levels. */
  level?: number | 'saved';
}

const zeroStats = (): PokemonStatSpread => ({
  hp: 0,
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
});

const perfectStats = (): PokemonStatSpread => ({
  hp: 31,
  atk: 31,
  def: 31,
  spa: 31,
  spd: 31,
  spe: 31,
});

function toStatSpread(
  stats: TeamMember['evs'] | TeamMember['ivs'] | undefined,
  fallback: PokemonStatSpread,
): PokemonStatSpread {
  if (!stats) return fallback;
  return {
    hp: stats.hp,
    atk: stats.attack,
    def: stats.defense,
    spa: stats['special-attack'],
    spd: stats['special-defense'],
    spe: stats.speed,
  };
}

function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

function addIssue(
  issues: SavedTeamValidationIssue[],
  code: SavedTeamIssueCode,
  message: string,
  position?: number,
): void {
  issues.push({ code, message, ...(position === undefined ? {} : { position }) });
}

function validateStats(
  member: TeamMember,
  evs: PokemonStatSpread,
  ivs: PokemonStatSpread,
  issues: SavedTeamValidationIssue[],
): void {
  const evValues = Object.values(evs);
  if (evValues.some(value => !isIntegerInRange(value, 0, 252))) {
    addIssue(issues, 'invalid-ev', 'EVs must be whole numbers from 0 to 252.', member.position);
  }
  if (evValues.reduce((total, value) => total + value, 0) > 510) {
    addIssue(issues, 'invalid-ev-total', 'A Pokémon cannot have more than 510 total EVs.', member.position);
  }
  if (Object.values(ivs).some(value => !isIntegerInRange(value, 0, 31))) {
    addIssue(issues, 'invalid-iv', 'IVs must be whole numbers from 0 to 31.', member.position);
  }
}

function normalizeGender(gender: TeamMember['gender']): RunPokemon['gender'] {
  if (gender === 'male') return 'M';
  if (gender === 'female') return 'F';
  if (gender === 'genderless') return 'N';
  return undefined;
}

/**
 * Validates and snapshots a saved database team into the battle engine's format.
 * The returned party is detached from the source rows, so later team edits cannot
 * alter a lobby or active match.
 */
export function buildSavedTeamParty(
  members: TeamMember[],
  pokemonById: SavedTeamPokemonMap,
  options: SavedTeamBattleOptions = {},
): SavedTeamBattleResult {
  const issues: SavedTeamValidationIssue[] = [];
  if (members.length === 0) {
    return { ok: false, issues: [{ code: 'empty-team', message: 'Add at least one Pokémon to this team.' }] };
  }
  if (members.length > 6) {
    addIssue(issues, 'too-many-members', 'A battle team can contain at most six Pokémon.');
  }

  const seenPositions = new Set<number>();
  const party: RunPokemon[] = [];

  for (const member of [...members].sort((left, right) => left.position - right.position)) {
    if (!isIntegerInRange(member.position, 1, 6)) {
      addIssue(issues, 'invalid-position', 'Team positions must be between 1 and 6.', member.position);
    }
    if (seenPositions.has(member.position)) {
      addIssue(issues, 'duplicate-position', 'Each Pokémon needs a unique team position.', member.position);
    }
    seenPositions.add(member.position);

    const pokemonData = pokemonById[member.pokemon_id];
    if (!pokemonData) {
      addIssue(issues, 'missing-pokemon-data', 'Pokémon data could not be loaded.', member.position);
      continue;
    }

    const species = Dex.species.get(pokemonData.name);
    if (!species.exists) {
      addIssue(issues, 'unknown-species', `Unknown species: ${pokemonData.name}.`, member.position);
      continue;
    }

    const abilityName = member.ability?.trim() ?? '';
    if (!abilityName) {
      addIssue(issues, 'missing-ability', `${species.name} needs an ability.`, member.position);
    } else if (!Dex.abilities.get(abilityName).exists) {
      addIssue(issues, 'unknown-ability', `Unknown ability: ${abilityName}.`, member.position);
    }

    const moveNames = (member.moves ?? []).map(move => move.trim()).filter(Boolean);
    if (moveNames.length < 1 || moveNames.length > 4) {
      addIssue(issues, 'invalid-move-count', `${species.name} needs between one and four moves.`, member.position);
    }
    for (const move of moveNames) {
      if (!Dex.moves.get(move).exists) {
        addIssue(issues, 'unknown-move', `Unknown move: ${move}.`, member.position);
      }
    }

    const itemName = member.item?.trim() ?? '';
    if (itemName && !Dex.items.get(itemName).exists) {
      addIssue(issues, 'unknown-item', `Unknown item: ${itemName}.`, member.position);
    }

    const natureName = member.nature?.trim() || 'Hardy';
    if (!Dex.natures.get(natureName).exists) {
      addIssue(issues, 'unknown-nature', `Unknown nature: ${natureName}.`, member.position);
    }

    const teraType = member.tera_type?.trim() || species.types[0];
    if (!Dex.types.get(teraType).exists) {
      addIssue(issues, 'unknown-tera-type', `Unknown Tera type: ${teraType}.`, member.position);
    }

    const savedLevel = member.level ?? 50;
    const level = options.level === 'saved' ? savedLevel : options.level ?? 50;
    if (!isIntegerInRange(level, 1, 100)) {
      addIssue(issues, 'invalid-level', 'Levels must be whole numbers from 1 to 100.', member.position);
    }

    const evs = toStatSpread(member.evs, zeroStats());
    const ivs = toStatSpread(member.ivs, perfectStats());
    validateStats(member, evs, ivs, issues);

    party.push({
      id: species.num,
      species: species.name,
      level,
      types: [...species.types],
      ability: abilityName,
      moves: moveNames,
      bst: Object.values(species.baseStats).reduce((total, stat) => total + stat, 0),
      item: itemName || undefined,
      nature: natureName,
      evs,
      ivs,
      gender: normalizeGender(member.gender),
      teraType,
      shiny: member.is_shiny ?? false,
      nickname: member.nickname?.trim() || undefined,
    });
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true, party };
}
