import { chooseBestMove, chooseBestSwitch, findLastActiveSpecies, scoreBattleMove } from '../challenge-player-ai';
import { getBattleAiProfile } from '../../utils/battle-ai-profile';

const activeLog = [
  '|switch|p1a: Ivy|Venusaur, L30|100/100',
  '|switch|p2a: Nova|Charizard, L30|100/100',
];

describe('Battle Run challenge AI', () => {
  it('raises tactical consistency in each circuit', () => {
    expect(getBattleAiProfile(1)).toMatchObject({ title: 'Learner', smartChance: 0.2 });
    expect(getBattleAiProfile(6)).toMatchObject({ title: 'Tactician', smartChance: 0.7 });
    expect(getBattleAiProfile(11)).toMatchObject({ title: 'Mastermind', smartChance: 1 });
  });

  it('reads the active matchup from the simulator protocol log', () => {
    expect(findLastActiveSpecies(activeLog, 'p1')).toBe('Venusaur');
    expect(findLastActiveSpecies(activeLog, 'p2')).toBe('Charizard');
  });

  it('prioritizes expected damage, STAB, accuracy, and type advantage', () => {
    const best = chooseBestMove([
      { choice: 'move 1', moveName: 'Earthquake' },
      { choice: 'move 2', moveName: 'Air Slash' },
      { choice: 'move 3', moveName: 'Fire Blast' },
    ], activeLog);

    expect(best?.moveName).toBe('Fire Blast');
    expect(scoreBattleMove('Thunderbolt', 'Pikachu', 'Golem')).toBe(0);
  });

  it('prefers a healthier defensive switch with a favorable type matchup', () => {
    const log = ['|switch|p1a: Player|Pikachu, L30|100/100'];
    const best = chooseBestSwitch([
      { slot: 2, species: 'Gyarados', condition: '100/100' },
      { slot: 3, species: 'Golem', condition: '80/100' },
    ], log);

    expect(best?.species).toBe('Golem');
  });
});
