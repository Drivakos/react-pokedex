import type { TeamMember } from '../../lib/supabase';
import type { TeamPokemonData } from '../../types/team-builder';
import {
  moveTeamMemberToPosition,
  nextAvailableTeamPosition,
  pickTeamMemberBuild,
  serializeShowdownMember,
  serializeShowdownTeam,
  sortTeamMembers,
  toTeamMemberBuild,
} from '../team-builder';

const member = (overrides: Partial<TeamMember> = {}): TeamMember => ({
  id: 1,
  team_id: 10,
  pokemon_id: 25,
  position: 1,
  ...overrides,
});

const pikachu: TeamPokemonData = {
  id: 25,
  name: 'pikachu',
  sprites: {
    front_default: 'pikachu.png',
    other: { 'official-artwork': { front_default: 'pikachu-art.png' } },
  },
  types: [{ type: { name: 'electric' } }],
  stats: [],
  abilities: [],
};

describe('team builder domain helpers', () => {
  it('sorts members without mutating the source and fills the first open slot', () => {
    const members = [member({ id: 3, position: 3 }), member({ id: 1, position: 1 })];

    expect(sortTeamMembers(members).map(entry => entry.position)).toEqual([1, 3]);
    expect(members.map(entry => entry.position)).toEqual([3, 1]);
    expect(nextAvailableTeamPosition(members)).toBe(2);
  });

  it('does not allocate a seventh team position', () => {
    const fullTeam = Array.from({ length: 6 }, (_, index) => member({ id: index + 1, position: index + 1 }));
    expect(nextAvailableTeamPosition(fullTeam)).toBeNull();
  });

  it('moves a member directly to its destination and normalizes every position', () => {
    const source = [
      member({ id: 1, position: 1 }),
      member({ id: 2, position: 2 }),
      member({ id: 3, position: 3 }),
      member({ id: 4, position: 4 }),
    ];

    const moved = moveTeamMemberToPosition(source, 1, 4);

    expect(moved.map(entry => [entry.id, entry.position])).toEqual([
      [2, 1],
      [3, 2],
      [4, 3],
      [1, 4],
    ]);
    expect(source.map(entry => [entry.id, entry.position])).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
  });

  it('normalizes an editor build while preserving intentional false and empty values', () => {
    const current = member({ level: 50, gender: 'female', tera_type: 'electric', is_shiny: true });

    expect(toTeamMemberBuild({ nickname: '', isShiny: false, moves: [] }, current)).toEqual(expect.objectContaining({
      moves: [],
      nickname: '',
      is_shiny: false,
      level: 50,
      gender: 'female',
      tera_type: 'electric',
    }));
  });

  it('keeps only persisted build fields for a member insert', () => {
    expect(pickTeamMemberBuild({
      id: 99,
      team_id: 10,
      pokemon_id: 25,
      position: 4,
      ability: 'static',
      moves: ['thunderbolt'],
      is_shiny: false,
    })).toEqual({
      ability: 'static',
      moves: ['thunderbolt'],
      is_shiny: false,
    });
  });

  it('exports a complete Showdown set', () => {
    const text = serializeShowdownMember(member({
      nickname: 'Sparky',
      gender: 'female',
      item: 'light-ball',
      ability: 'static',
      level: 50,
      is_shiny: true,
      tera_type: 'electric',
      evs: { hp: 0, attack: 0, defense: 4, 'special-attack': 252, 'special-defense': 0, speed: 252 },
      ivs: { hp: 31, attack: 0, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
      nature: 'timid',
      moves: ['thunderbolt', 'volt-switch'],
    }), pikachu);

    expect(text).toBe([
      'Sparky (Pikachu) (F) @ Light Ball',
      'Ability: Static',
      'Level: 50',
      'Shiny: Yes',
      'Tera Type: Electric',
      'EVs: 4 Def / 252 SpA / 252 Spe',
      'Timid Nature',
      'IVs: 0 Atk',
      '- Thunderbolt',
      '- Volt Switch',
    ].join('\n'));
  });

  it('exports in roster order and skips members whose Pokémon data is unavailable', () => {
    const text = serializeShowdownTeam([
      member({ id: 2, pokemon_id: 999, position: 2 }),
      member({ id: 1, position: 1, nature: 'hardy' }),
    ], { 25: pikachu });

    expect(text).toBe('Pikachu\nHardy Nature');
  });
});
