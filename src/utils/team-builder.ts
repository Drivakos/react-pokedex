import type { TeamMember } from '../lib/supabase';
import type { Pokemon } from '../types/pokemon';
import type { MovesetBuildData, TeamPokemonData } from '../types/team-builder';

const statLabels: Record<keyof NonNullable<TeamMember['evs']>, string> = {
  hp: 'HP',
  attack: 'Atk',
  defense: 'Def',
  'special-attack': 'SpA',
  'special-defense': 'SpD',
  speed: 'Spe',
};

export function formatPokemonName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function sortTeamMembers(members: TeamMember[]): TeamMember[] {
  return [...members].sort((left, right) => left.position - right.position);
}

export function moveTeamMemberToPosition(
  members: TeamMember[],
  memberId: number,
  targetPosition: number,
): TeamMember[] {
  const ordered = sortTeamMembers(members);
  const sourceIndex = ordered.findIndex(member => member.id === memberId);
  const targetIndex = targetPosition - 1;

  if (
    sourceIndex < 0
    || targetIndex < 0
    || targetIndex >= ordered.length
    || sourceIndex === targetIndex
  ) {
    return ordered;
  }

  const [movedMember] = ordered.splice(sourceIndex, 1);
  ordered.splice(targetIndex, 0, movedMember);
  return ordered.map((member, index) => ({ ...member, position: index + 1 }));
}

export function nextAvailableTeamPosition(members: TeamMember[]): number | null {
  const occupied = new Set(members.map(member => member.position));
  for (let position = 1; position <= 6; position += 1) {
    if (!occupied.has(position)) return position;
  }
  return null;
}

export function toTeamPokemonData(pokemon: Pokemon): TeamPokemonData {
  return {
    id: pokemon.id,
    name: pokemon.name,
    sprites: {
      front_default: pokemon.sprites.front_default,
      other: {
        'official-artwork': {
          front_default: pokemon.sprites.official_artwork,
        },
      },
    },
    types: pokemon.types.map(type => ({ type: { name: type } })),
    stats: [
      { base_stat: pokemon.stats?.hp ?? 0, stat: { name: 'hp' } },
      { base_stat: pokemon.stats?.attack ?? 0, stat: { name: 'attack' } },
      { base_stat: pokemon.stats?.defense ?? 0, stat: { name: 'defense' } },
      { base_stat: pokemon.stats?.['special-attack'] ?? 0, stat: { name: 'special-attack' } },
      { base_stat: pokemon.stats?.['special-defense'] ?? 0, stat: { name: 'special-defense' } },
      { base_stat: pokemon.stats?.speed ?? 0, stat: { name: 'speed' } },
    ],
    abilities: pokemon.abilities ?? [],
  };
}

export function toTeamMemberBuild(
  build: MovesetBuildData,
  current: TeamMember,
): Partial<TeamMember> {
  return {
    moves: build.moves ?? [],
    item: build.heldItem ?? '',
    ability: build.ability ?? '',
    nature: build.nature ?? 'hardy',
    evs: build.evs ?? {
      hp: 0,
      attack: 0,
      defense: 0,
      'special-attack': 0,
      'special-defense': 0,
      speed: 0,
    },
    ivs: build.ivs ?? {
      hp: 31,
      attack: 31,
      defense: 31,
      'special-attack': 31,
      'special-defense': 31,
      speed: 31,
    },
    level: current.level ?? 50,
    gender: build.gender ?? current.gender ?? 'male',
    tera_type: build.teraType ?? current.tera_type ?? 'normal',
    nickname: build.nickname ?? '',
    is_shiny: build.isShiny ?? false,
  };
}

export function pickTeamMemberBuild(build: Partial<TeamMember> = {}): Partial<TeamMember> {
  return {
    ...(build.moves === undefined ? {} : { moves: build.moves }),
    ...(build.item === undefined ? {} : { item: build.item }),
    ...(build.ability === undefined ? {} : { ability: build.ability }),
    ...(build.nature === undefined ? {} : { nature: build.nature }),
    ...(build.evs === undefined ? {} : { evs: build.evs }),
    ...(build.ivs === undefined ? {} : { ivs: build.ivs }),
    ...(build.level === undefined ? {} : { level: build.level }),
    ...(build.gender === undefined ? {} : { gender: build.gender }),
    ...(build.tera_type === undefined ? {} : { tera_type: build.tera_type }),
    ...(build.nickname === undefined ? {} : { nickname: build.nickname }),
    ...(build.is_shiny === undefined ? {} : { is_shiny: build.is_shiny }),
  };
}

function formatStats(
  label: 'EVs' | 'IVs',
  stats: TeamMember['evs'] | TeamMember['ivs'],
  include: (value: number) => boolean,
): string | null {
  if (!stats) return null;
  const entries = (Object.entries(stats) as Array<[keyof typeof statLabels, number]>)
    .filter(([, value]) => include(value))
    .map(([stat, value]) => `${value} ${statLabels[stat]}`);
  return entries.length > 0 ? `${label}: ${entries.join(' / ')}` : null;
}

export function serializeShowdownMember(member: TeamMember, pokemon: TeamPokemonData): string {
  const species = formatPokemonName(pokemon.name);
  const nickname = member.nickname?.trim();
  const gender = member.gender === 'male' ? ' (M)' : member.gender === 'female' ? ' (F)' : '';
  const item = member.item?.trim() ? ` @ ${formatPokemonName(member.item)}` : '';
  const lines = [`${nickname ? `${nickname} (${species})` : species}${gender}${item}`];

  if (member.ability?.trim()) lines.push(`Ability: ${formatPokemonName(member.ability)}`);
  if (member.level && member.level !== 100) lines.push(`Level: ${member.level}`);
  if (member.is_shiny) lines.push('Shiny: Yes');
  if (member.tera_type?.trim()) lines.push(`Tera Type: ${formatPokemonName(member.tera_type)}`);

  const evs = formatStats('EVs', member.evs, value => value > 0);
  if (evs) lines.push(evs);
  lines.push(`${formatPokemonName(member.nature || 'hardy')} Nature`);
  const ivs = formatStats('IVs', member.ivs, value => value < 31);
  if (ivs) lines.push(ivs);

  for (const move of member.moves ?? []) {
    if (move.trim()) lines.push(`- ${formatPokemonName(move)}`);
  }
  return lines.join('\n');
}

export function serializeShowdownTeam(
  members: TeamMember[],
  pokemonById: Record<number, TeamPokemonData>,
): string {
  return sortTeamMembers(members)
    .map(member => {
      const pokemon = pokemonById[member.pokemon_id];
      return pokemon ? serializeShowdownMember(member, pokemon) : null;
    })
    .filter((entry): entry is string => entry !== null)
    .join('\n\n');
}
