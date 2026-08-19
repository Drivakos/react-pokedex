import type { TeamMember } from '../../lib/supabase';
import { buildSavedTeamParty } from '../saved-team-battle';

const validMember: TeamMember = {
  id: 1,
  team_id: 10,
  pokemon_id: 25,
  position: 1,
  ability: 'Static',
  moves: ['Thunderbolt', 'Volt Switch'],
  item: 'Light Ball',
  nature: 'Timid',
  evs: { hp: 0, attack: 0, defense: 4, 'special-attack': 252, 'special-defense': 0, speed: 252 },
  ivs: { hp: 31, attack: 0, defense: 31, 'special-attack': 30, 'special-defense': 31, speed: 31 },
  level: 87,
  gender: 'female',
  tera_type: 'Electric',
  nickname: 'Sparky',
  is_shiny: true,
};

const pokemonById = { 25: { id: 25, name: 'pikachu' } };

describe('saved team battle adapter', () => {
  it('creates an immutable level-50 party with complete build data', () => {
    const result = buildSavedTeamParty([validMember], pokemonById);

    expect(result).toEqual({
      ok: true,
      party: [expect.objectContaining({
        id: 25,
        species: 'Pikachu',
        level: 50,
        types: ['Electric'],
        ability: 'Static',
        moves: ['Thunderbolt', 'Volt Switch'],
        item: 'Light Ball',
        nature: 'Timid',
        evs: { hp: 0, atk: 0, def: 4, spa: 252, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 0, def: 31, spa: 30, spd: 31, spe: 31 },
        gender: 'F',
        teraType: 'Electric',
        nickname: 'Sparky',
        shiny: true,
      })],
    });
  });

  it('can preserve saved levels for a future ruleset', () => {
    const result = buildSavedTeamParty([validMember], pokemonById, { level: 'saved' });
    expect(result.ok && result.party[0].level).toBe(87);
  });

  it('reports incomplete and invalid builds with member positions', () => {
    const result = buildSavedTeamParty([{
      ...validMember,
      ability: '',
      moves: [],
      evs: { ...validMember.evs!, hp: 252 },
      ivs: { ...validMember.ivs!, attack: 32 },
    }], pokemonById);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing-ability', position: 1 }),
      expect.objectContaining({ code: 'invalid-move-count', position: 1 }),
      expect.objectContaining({ code: 'invalid-ev-total', position: 1 }),
      expect.objectContaining({ code: 'invalid-iv', position: 1 }),
    ]));
  });

  it('rejects duplicate positions and unknown simulator data', () => {
    const result = buildSavedTeamParty([
      validMember,
      {
        ...validMember,
        id: 2,
        pokemon_id: 99999,
        ability: 'Definitely Not An Ability',
      },
    ], {
      ...pokemonById,
      99999: { id: 99999, name: 'definitely-not-a-pokemon' },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'duplicate-position',
      'unknown-species',
    ]));
  });

  it('rejects empty teams', () => {
    expect(buildSavedTeamParty([], {})).toEqual({
      ok: false,
      issues: [{ code: 'empty-team', message: 'Add at least one Pokémon to this team.' }],
    });
  });
});
