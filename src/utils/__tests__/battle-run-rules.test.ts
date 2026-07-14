import {
  PARTY_LIMIT,
  RUN_ROUTES,
  RUN_UPGRADES,
  addOrReplacePartyMember,
  applyRunUpgradesToChallenge,
  calculateBattleReward,
  createRunUpgradeChoices,
  createStageChallenge,
  createSeededRandom,
  enemyPartySize,
  getRunGrade,
  getStageChallengeProgress,
  isCheckpointStage,
  isStageChallengeComplete,
  levelForStage,
  levelUpSurvivors,
  recruitmentChoiceCount,
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

  it('multiplies the complete reward when a riskier route is cleared', () => {
    const apex = RUN_ROUTES.find(route => route.id === 'apex');
    expect(apex).toBeDefined();
    const base = calculateBattleReward(3, 7, 2, 0);
    const boosted = calculateBattleReward(3, 7, 2, 0, null, apex);
    expect(boosted.route).toEqual(apex);
    expect(boosted.routeBonus).toBe(Math.round(base.totalScore * 0.6));
    expect(boosted.totalScore).toBe(base.totalScore + boosted.routeBonus);
  });

  it('applies permanent run upgrades to future rewards', () => {
    const apex = RUN_ROUTES.find(route => route.id === 'apex');
    const selected = RUN_UPGRADES.filter(upgrade => (
      upgrade.id === 'veteran-training'
      || upgrade.id === 'route-dividend'
      || upgrade.id === 'flawless-standard'
      || upgrade.id === 'survivor-mark'
    ));
    const base = calculateBattleReward(3, 7, 2, 0, null, apex);
    const upgraded = calculateBattleReward(3, 7, 2, 0, null, apex, selected);
    expect(upgraded.levelsGained).toBe(base.levelsGained + 1);
    expect(upgraded.survivalBonus).toBe(450);
    expect(upgraded.flawlessBonus).toBe(800);
    expect(upgraded.routeBonus).toBeGreaterThan(base.routeBonus);
  });

  it('offers unowned checkpoint upgrades and improves scouting and contracts', () => {
    const owned = RUN_UPGRADES.filter(upgrade => upgrade.id === 'veteran-training');
    const choices = createRunUpgradeChoices(owned, () => 0, 3);
    expect(choices).toHaveLength(3);
    expect(choices.map(choice => choice.id)).not.toContain('veteran-training');

    const scouting = RUN_UPGRADES.filter(upgrade => upgrade.id === 'expanded-scouting');
    expect(recruitmentChoiceCount([])).toBe(3);
    expect(recruitmentChoiceCount(scouting)).toBe(4);

    const ledger = RUN_UPGRADES.filter(upgrade => upgrade.id === 'contract-ledger');
    const challenge = createStageChallenge(3, 2, () => 0);
    expect(applyRunUpgradesToChallenge(challenge, ledger).bounty).toBe(Math.round(challenge.bounty * 1.3));
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

  it('reports live contract progress as on track, at risk, or failed', () => {
    const rapid = createStageChallenge(2, 1, () => 0);
    expect(getStageChallengeProgress(rapid, (rapid.maxTurns ?? 3) - 2, 1, 1))
      .toMatchObject({ status: 'on-track', metrics: [{ label: 'Turns left', value: '3' }] });
    expect(getStageChallengeProgress(rapid, (rapid.maxTurns ?? 2) - 1, 1, 1).status).toBe('at-risk');
    expect(getStageChallengeProgress(rapid, (rapid.maxTurns ?? 1) + 1, 1, 1).status).toBe('failed');

    const flawless = createStageChallenge(2, 1, () => 0.99);
    expect(getStageChallengeProgress(flawless, 1, 3, 3).status).toBe('on-track');
    expect(getStageChallengeProgress(flawless, 1, 3, 2).status).toBe('failed');

    const checkpoint = createStageChallenge(5, 3, () => 0);
    expect(getStageChallengeProgress(checkpoint, 2, 3, 2).status).toBe('at-risk');
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

  it('grades runs by average score per cleared stage', () => {
    expect(getRunGrade(0, 0).rank).toBe('D');
    expect(getRunGrade(4000, 2).rank).toBe('C');
    expect(getRunGrade(6000, 2).rank).toBe('B');
    expect(getRunGrade(8000, 2).rank).toBe('A');
    expect(getRunGrade(15000, 3)).toEqual(expect.objectContaining({ rank: 'S', title: 'Master' }));
  });
});
