import {
  PARTY_LIMIT,
  addOrReplacePartyMember,
  calculateBattleReward,
  createStageChallenge,
  createSeededRandom,
  enemyPartySize,
  isCheckpointStage,
  isStageChallengeComplete,
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

  it('creates stage contracts that match the current encounter', () => {
    const rapid = createStageChallenge(2, 1, () => 0);
    expect(rapid.kind).toBe('tempo');
    expect(rapid.maxTurns).toBeDefined();

    const formation = createStageChallenge(3, 4, () => 0.99);
    expect(formation.kind).toBe('formation');
    expect(formation.minSurvivors).toBe(3);

    const checkpoint = createStageChallenge(5, 4, () => 0);
    expect(checkpoint.kind).toBe('checkpoint');
    expect(checkpoint.maxFaints).toBe(1);
  });

  it('awards a contract bounty only when every objective is met', () => {
    const challenge = createStageChallenge(2, 2, () => 0);
    expect(isStageChallengeComplete(challenge, challenge.maxTurns ?? 1, 2, 0)).toBe(true);
    expect(isStageChallengeComplete(challenge, (challenge.maxTurns ?? 1) + 1, 2, 0)).toBe(false);

    const cleared = calculateBattleReward(2, challenge.maxTurns ?? 1, 2, 0, challenge);
    const missed = calculateBattleReward(2, (challenge.maxTurns ?? 1) + 1, 2, 0, challenge);
    expect(cleared.challengeCompleted).toBe(true);
    expect(cleared.challengeBonus).toBe(challenge.bounty);
    expect(missed.challengeCompleted).toBe(false);
    expect(missed.challengeBonus).toBe(0);
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
