import type { VsTeamSnapshotMember } from '../../types/vs';
import { toCanonicalVsResult, toVsRunPokemon } from '../vs-battle';

const member: VsTeamSnapshotMember = {
  pokemonId: 25,
  species: 'Pikachu',
  types: ['Electric'],
  position: 1,
  moves: ['Thunderbolt'],
  ability: 'Static',
  nature: 'Timid',
  evs: { hp: 4, attack: 0, defense: 0, 'special-attack': 252, 'special-defense': 0, speed: 252 },
  ivs: { hp: 31, attack: 0, defense: 31, 'special-attack': 30, 'special-defense': 31, speed: 31 },
  level: 50,
  isShiny: true,
  gender: 'female',
  teraType: 'Electric',
};

describe('VS battle snapshot adapter', () => {
  it('preserves database stat keys and gender in simulator format', () => {
    expect(toVsRunPokemon(member)).toMatchObject({
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      ivs: { hp: 31, atk: 0, def: 31, spa: 30, spd: 31, spe: 31 },
      gender: 'F',
      shiny: true,
    });
  });

  it('also accepts already-normalized stat snapshots', () => {
    expect(toVsRunPokemon({
      ...member,
      evs: { hp: 1, atk: 2, def: 3, spa: 4, spd: 5, spe: 6 },
      gender: 'N',
    })).toMatchObject({
      evs: { hp: 1, atk: 2, def: 3, spa: 4, spd: 5, spe: 6 },
      gender: 'N',
    });
  });

  it('normalizes local results to canonical host and guest sides', () => {
    expect(toCanonicalVsResult({ winner: 'player', faintedPlayerSpecies: [] }, true)).toBe('host');
    expect(toCanonicalVsResult({ winner: 'player', faintedPlayerSpecies: [] }, false)).toBe('guest');
    expect(toCanonicalVsResult({ winner: 'opponent', faintedPlayerSpecies: [] }, false)).toBe('host');
    expect(toCanonicalVsResult({ winner: 'tie', faintedPlayerSpecies: [] }, true)).toBe('tie');
  });
});
