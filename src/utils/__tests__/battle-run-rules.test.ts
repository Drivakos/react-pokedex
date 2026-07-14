import {
  PARTY_LIMIT,
  addOrReplacePartyMember,
  calculateBattleReward,
  createSeededRandom,
  enemyPartySize,
  isCheckpointStage,
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
    expect(enemyPartySize(4)).toBe(1);
    expect(enemyPartySize(5)).toBe(3);
    expect(enemyPartySize(9)).toBe(3);
    expect(targetBstForStage(10)).toBeGreaterThan(targetBstForStage(2));
    expect(targetBstForStage(5)).toBeGreaterThan(targetBstForStage(6));
    expect(isCheckpointStage(5)).toBe(true);
    expect(isCheckpointStage(6)).toBe(false);
  });

  it('rewards survival, speed, flawless clears, and checkpoints', () => {
    const standard = calculateBattleReward(4, 8, 3, 1);
    expect(standard.survivors).toBe(2);
    expect(standard.survivalBonus).toBe(300);
    expect(standard.tempoBonus).toBe(200);
    expect(standard.flawlessBonus).toBe(0);
    expect(standard.checkpointBonus).toBe(0);
    expect(standard.levelsGained).toBe(2);

    const checkpoint = calculateBattleReward(5, 5, 3, 0);
    expect(checkpoint.flawlessBonus).toBe(400);
    expect(checkpoint.checkpointBonus).toBe(1000);
    expect(checkpoint.levelsGained).toBe(3);
    expect(checkpoint.totalScore).toBeGreaterThan(standard.totalScore);
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
