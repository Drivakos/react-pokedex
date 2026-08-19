import { Generations, type PokemonSet } from '@pkmn/data';
import { Dex } from '@pkmn/sim';
import { Smogon, type DeepPartial } from '@pkmn/smogon';

export interface PremadeBuildStats {
  hp?: number;
  attack?: number;
  defense?: number;
  'special-attack'?: number;
  'special-defense'?: number;
  speed?: number;
}

export interface PremadePokemonBuild {
  id: string;
  name: string;
  source: 'smogon' | 'randbats';
  format: string;
  ability?: string;
  item?: string;
  nature?: string;
  moves: string[];
  teraType?: string;
  evs?: PremadeBuildStats;
  ivs?: PremadeBuildStats;
}

export interface AutomaticPokemonBuild {
  moves: string[];
  item: string;
  ability: string;
  nature: string;
  evs: Required<PremadeBuildStats>;
  ivs: Required<PremadeBuildStats>;
  level: number;
  gender: 'male' | 'female' | 'genderless';
  tera_type: string;
  nickname: string;
  is_shiny: boolean;
}

interface AutomaticBuildPokemon {
  id: number;
  name: string;
  types: Array<{ type: { name: string } }>;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
}

interface AutomaticBuildMove {
  move: {
    name: string;
    power: number | null;
    accuracy: number | null;
    type: { name: string };
    damage_class: { name: string };
  };
}

interface RandbatsRole {
  abilities?: string[];
  items?: string[];
  moves?: string[];
  teraTypes?: string[];
}

interface RandbatsSpecies {
  abilities?: string[];
  items?: string[];
  roles?: Record<string, RandbatsRole>;
}

type RandbatsData = Record<string, RandbatsSpecies>;

const generation = new Generations(Dex).get(9);
const DATA_ORIGIN = 'https://data.pkmn.cc';
const SMOGON_DATA_PROXY = '/pkmn-data/smogon';
const RANDBATS_URL = '/pkmn-data/randbats/gen9randombattle.json';
let randbatsDataPromise: Promise<RandbatsData> | null = null;

const fetchPkmnData: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return globalThis.fetch.call(globalThis, url.replace(DATA_ORIGIN, SMOGON_DATA_PROXY), init);
};

const first = <T>(value: T | T[] | undefined): T | undefined => (
  Array.isArray(value) ? value[0] : value
);

const EMPTY_EVS: Required<PremadeBuildStats> = {
  hp: 0,
  attack: 0,
  defense: 0,
  'special-attack': 0,
  'special-defense': 0,
  speed: 0,
};

const MAX_IVS: Required<PremadeBuildStats> = {
  hp: 31,
  attack: 31,
  defense: 31,
  'special-attack': 31,
  'special-defense': 31,
  speed: 31,
};

const toEditorId = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const titleCase = (value: string): string => value
  .split('-')
  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const normalizeStats = (stats: DeepPartial<PokemonSet<string>>['evs']): PremadeBuildStats | undefined => {
  const selected = first(stats);
  if (!selected) return undefined;

  return {
    ...(selected.hp === undefined ? {} : { hp: selected.hp }),
    ...(selected.atk === undefined ? {} : { attack: selected.atk }),
    ...(selected.def === undefined ? {} : { defense: selected.def }),
    ...(selected.spa === undefined ? {} : { 'special-attack': selected.spa }),
    ...(selected.spd === undefined ? {} : { 'special-defense': selected.spd }),
    ...(selected.spe === undefined ? {} : { speed: selected.spe }),
  };
};

export function mapSmogonSets(
  speciesName: string,
  format: string,
  sets: DeepPartial<PokemonSet<string>>[],
): PremadePokemonBuild[] {
  return sets.flatMap((set, index) => {
    const moves = (set.moves ?? [])
      .map(move => first(move))
      .filter((move): move is string => Boolean(move))
      .slice(0, 4);
    if (moves.length === 0) return [];

    const name = typeof set.name === 'string' && set.name.trim()
      ? set.name
      : `${speciesName} set ${index + 1}`;

    return [{
      id: `smogon:${format}:${Dex.toID(name)}:${index}`,
      name,
      source: 'smogon' as const,
      format,
      ability: first(set.ability),
      item: first(set.item),
      nature: first(set.nature),
      moves,
      teraType: first(set.teraType),
      evs: normalizeStats(set.evs),
      ivs: normalizeStats(set.ivs),
    }];
  });
}

export function mapRandbatsRoles(
  speciesName: string,
  species: RandbatsSpecies | undefined,
): PremadePokemonBuild[] {
  if (!species?.roles) return [];

  return Object.entries(species.roles).flatMap(([roleName, role]) => {
    const moves = (role.moves ?? []).slice(0, 4);
    if (moves.length === 0) return [];

    return [{
      id: `randbats:gen9:${Dex.toID(speciesName)}:${Dex.toID(roleName)}`,
      name: roleName,
      source: 'randbats' as const,
      format: 'gen9randombattle',
      ability: role.abilities?.[0] ?? species.abilities?.[0],
      item: role.items?.[0] ?? species.items?.[0],
      moves,
      teraType: role.teraTypes?.[0],
    }];
  });
}

async function fetchRandbatsData(): Promise<RandbatsData> {
  randbatsDataPromise ??= globalThis.fetch.call(globalThis, RANDBATS_URL)
    .then(async response => {
      if (!response.ok) throw new Error(`Random Battle builds returned ${response.status}`);
      return response.json() as Promise<RandbatsData>;
    })
    .catch(error => {
      randbatsDataPromise = null;
      throw error;
    });
  return randbatsDataPromise;
}

export async function fetchPremadeBuilds(speciesName: string): Promise<PremadePokemonBuild[]> {
  const species = Dex.species.get(speciesName);
  if (!species.exists) return [];

  const format = Smogon.format(generation, species);
  if (format) {
    try {
      const smogon = new Smogon(fetchPkmnData, true);
      const sets = await smogon.sets(generation, species, format);
      const builds = mapSmogonSets(species.name, format, sets);
      if (builds.length > 0) return builds;
    } catch (error) {
      console.warn(`Could not load Smogon builds for ${species.name}:`, error);
    }
  }

  try {
    const data = await fetchRandbatsData();
    return mapRandbatsRoles(species.name, data[species.name] ?? data[species.baseSpecies]);
  } catch (error) {
    console.warn(`Could not load Random Battle builds for ${species.name}:`, error);
    return [];
  }
}

export function materializeAutomaticBuild(
  pokemon: AutomaticBuildPokemon,
  preset: PremadePokemonBuild | undefined,
  moveData: AutomaticBuildMove[],
  abilities: string[],
): AutomaticPokemonBuild {
  const uniqueMoves = [...new Map(moveData.map(entry => [entry.move.name, entry.move])).values()];
  const moveById = new Map(uniqueMoves.map(move => [toEditorId(move.name), move.name]));
  const preferredMoves = (preset?.moves ?? [])
    .map(move => moveById.get(toEditorId(move)))
    .filter((move): move is string => Boolean(move));
  const pokemonTypes = new Set(pokemon.types.map(entry => entry.type.name));
  const fallbackMoves = [...uniqueMoves]
    .sort((a, b) => {
      const score = (move: AutomaticBuildMove['move']) => {
        const accuracy = move.accuracy ?? 100;
        const stabBonus = pokemonTypes.has(move.type.name) ? 35 : 0;
        return (move.power ?? 0) * (accuracy / 100) + stabBonus;
      };
      return score(b) - score(a) || a.name.localeCompare(b.name);
    })
    .map(move => move.name);
  const moves = [...new Set([...preferredMoves, ...fallbackMoves])].slice(0, 4);

  const abilityById = new Map(abilities.map(ability => [toEditorId(ability), ability]));
  const ability = preset?.ability
    ? abilityById.get(toEditorId(preset.ability)) ?? abilities[0] ?? ''
    : abilities[0] ?? '';

  const stats = new Map(pokemon.stats.map(stat => [stat.stat.name, stat.base_stat]));
  const physical = (stats.get('attack') ?? 0) >= (stats.get('special-attack') ?? 0);
  const fast = (stats.get('speed') ?? 0) >= 80;
  const fallbackEvs: Required<PremadeBuildStats> = {
    ...EMPTY_EVS,
    hp: 6,
    [physical ? 'attack' : 'special-attack']: 252,
    speed: 252,
  };

  return {
    moves,
    item: preset?.item ?? 'Life Orb',
    ability,
    nature: preset?.nature?.toLowerCase() ?? (physical ? (fast ? 'jolly' : 'adamant') : (fast ? 'timid' : 'modest')),
    evs: { ...(preset?.evs ? EMPTY_EVS : fallbackEvs), ...preset?.evs },
    ivs: { ...MAX_IVS, ...preset?.ivs },
    level: 50,
    gender: 'male',
    tera_type: preset?.teraType ?? titleCase(pokemon.types[0]?.type.name ?? 'normal'),
    nickname: '',
    is_shiny: false,
  };
}

export async function fetchAutomaticPokemonBuild(pokemon: AutomaticBuildPokemon): Promise<AutomaticPokemonBuild> {
  const [{ fetchPokemonAbilities, fetchPokemonMoves }, presets] = await Promise.all([
    import('./api'),
    fetchPremadeBuilds(pokemon.name),
  ]);
  const [moveData, abilityData] = await Promise.all([
    fetchPokemonMoves(pokemon.id),
    fetchPokemonAbilities(pokemon.id),
  ]);
  const abilities = abilityData
    .map(entry => entry?.ability?.name)
    .filter((ability): ability is string => Boolean(ability));

  return materializeAutomaticBuild(pokemon, presets[0], moveData, abilities);
}
