import {
  PARTY_LIMIT,
  addOrReplacePartyMember,
  createSeededRandom,
  enemyPartySize,
  levelForStage,
  levelUpSurvivors,
  targetBstForStage,
} from '../battle-run-rules';
import type { RunPokemon } from '../../types/battle-run';

const pokemon = (species: string, level = 5): RunPokemon => ({
  id: 1,
  species,
  level,
  types: ['Normal'],
  ability: 'Run Away',
  moves: ['Tackle'],
  bst: 300,
});

describe('battle run rules', () => {
  it('scales levels, enemy party size, and target strength by stage', () => {
    expect(levelForStage(1)).toBe(5);
    expect(levelForStage(5)).toBe(13);
    expect(enemyPartySize(1)).toBe(1);
    expect(enemyPartySize(5)).toBe(2);
    expect(enemyPartySize(9)).toBe(3);
    expect(targetBstForStage(10)).toBeGreaterThan(targetBstForStage(2));
  });

  it('adds recruits until the party limit', () => {
    const party = [pokemon('Eevee')];
    expect(addOrReplacePartyMember(party, pokemon('Pikachu')).map(member => member.species))
      .toEqual(['Eevee', 'Pikachu']);
  });

  it('requires a valid replacement when the party is full', () => {
    const party = Array.from({ length: PARTY_LIMIT }, (_, index) => pokemon(`Pokemon ${index}`));
    expect(addOrReplacePartyMember(party, pokemon('Newcomer'))).toEqual(party);
    const replaced = addOrReplacePartyMember(party, pokemon('Newcomer'), 2);
    expect(replaced).toHaveLength(PARTY_LIMIT);
    expect(replaced[2].species).toBe('Newcomer');
  });

  it('levels surviving Pokémon without mutating the original party', () => {
    const party = [pokemon('Eevee', 99)];
    const leveled = levelUpSurvivors(party);
    expect(leveled[0].level).toBe(100);
    expect(party[0].level).toBe(99);
  });

  it('generates repeatable random sequences from the same seed', () => {
    const first = createSeededRandom('same-run');
    const second = createSeededRandom('same-run');
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });
});
