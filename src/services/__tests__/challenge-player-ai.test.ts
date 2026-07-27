import {
  chooseBestMove,
  chooseBestSwitch,
  findLastActiveSpecies,
  readBattleAiContext,
  scoreBattleMove,
} from '../challenge-player-ai';
import { getBattleAiProfile } from '../../utils/battle-ai-profile';

const activeLog = [
  '|switch|p1a: Ivy|Venusaur, L30|100/100',
  '|switch|p2a: Nova|Charizard, L30|100/100',
];

describe('Battle Run challenge AI', () => {
  it('raises tactical consistency in each circuit', () => {
    expect(getBattleAiProfile(1)).toMatchObject({ title: 'Learner', smartChance: 0.1 });
    expect(getBattleAiProfile(6)).toMatchObject({ title: 'Tactician', smartChance: 0.45 });
    expect(getBattleAiProfile(11)).toMatchObject({ title: 'Mastermind', smartChance: 0.7 });
  });

  it('separates route decision-making and never weakens checkpoint bosses', () => {
    expect(getBattleAiProfile(6, 'easy').smartChance).toBeLessThan(
      getBattleAiProfile(6, 'medium').smartChance,
    );
    expect(getBattleAiProfile(6, 'hard').smartChance).toBeGreaterThan(
      getBattleAiProfile(6, 'medium').smartChance,
    );
    expect(getBattleAiProfile(5, 'easy')).toMatchObject({ title: 'Boss', smartChance: 1 });
  });

  it('uses the calibrated tactical curve for each non-boss circuit', () => {
    expect(['easy', 'medium', 'hard'].map(difficulty => (
      getBattleAiProfile(1, difficulty as 'easy' | 'medium' | 'hard').smartChance
    ))).toEqual([0.05, 0.1, 0.25]);
    expect(['easy', 'medium', 'hard'].map(difficulty => (
      getBattleAiProfile(6, difficulty as 'easy' | 'medium' | 'hard').smartChance
    ))).toEqual([0.25, 0.45, 0.7]);
    expect(['easy', 'medium', 'hard'].map(difficulty => (
      getBattleAiProfile(11, difficulty as 'easy' | 'medium' | 'hard').smartChance
    ))).toEqual([0.45, 0.7, 0.9]);
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

  it('reads health, status, boosts, field effects, and the previous move from protocol', () => {
    const context = readBattleAiContext([
      ...activeLog,
      '|-damage|p2a: Nova|35/100 brn',
      '|-status|p1a: Ivy|tox',
      '|-boost|p2a: Nova|spa|2',
      '|-sidestart|p1: Player|move: Stealth Rock',
      '|-weather|RainDance',
      '|-fieldstart|move: Electric Terrain',
      '|move|p2a: Nova|Protect|p2a: Nova',
    ]);

    expect(context).toMatchObject({
      activeHpRatio: 0.35,
      opponentHpRatio: 1,
      activeStatus: 'brn',
      opponentStatus: 'tox',
      activeBoosts: { spa: 2 },
      weather: 'raindance',
      terrain: 'electricterrain',
      lastMove: 'Protect',
      physicalAttackCount: 1,
      specialAttackCount: 1,
    });
    expect(context.opponentSideConditions.has('stealthrock')).toBe(true);
  });

  it('uses recovery when badly hurt instead of blindly attacking', () => {
    const best = chooseBestMove([
      { choice: 'move 1', moveName: 'Roost' },
      { choice: 'move 2', moveName: 'Flamethrower' },
    ], [
      '|switch|p1a: Player|Blastoise, L30|100/100',
      '|switch|p2a: Rival|Charizard, L30|100/100',
      '|-damage|p2a: Nova|25/100',
    ], 3);

    expect(best?.moveName).toBe('Roost');
  });

  it('uses setup and status when they create more value than a weak attack', () => {
    const setup = chooseBestMove([
      { choice: 'move 1', moveName: 'Swords Dance' },
      { choice: 'move 2', moveName: 'Tackle' },
    ], [
      '|switch|p1a: Player|Blissey, L30|100/100',
      '|switch|p2a: Rival|Scizor, L30|100/100',
    ], 3);
    const status = chooseBestMove([
      { choice: 'move 1', moveName: 'Will-O-Wisp' },
      { choice: 'move 2', moveName: 'Ember' },
    ], [
      '|switch|p1a: Player|Snorlax, L30|100/100',
      '|switch|p2a: Rival|Charizard, L30|100/100',
    ], 3);

    expect(setup?.moveName).toBe('Swords Dance');
    expect(status?.moveName).toBe('Will-O-Wisp');
  });

  it('does not repeat setup, hazards, weather, or Protect after their value is spent', () => {
    const setup = chooseBestMove([
      { choice: 'move 1', moveName: 'Swords Dance' },
      { choice: 'move 2', moveName: 'X-Scissor' },
    ], [
      '|switch|p1a: Player|Meganium, L30|100/100',
      '|switch|p2a: Rival|Scizor, L30|100/100',
      '|-boost|p2a: Rival|atk|6',
    ], 3);
    const hazard = chooseBestMove([
      { choice: 'move 1', moveName: 'Stealth Rock' },
      { choice: 'move 2', moveName: 'Rock Slide' },
    ], [
      '|switch|p1a: Player|Charizard, L30|100/100',
      '|switch|p2a: Rival|Tyranitar, L30|100/100',
      '|-sidestart|p1: Player|move: Stealth Rock',
    ], 3);
    const protect = chooseBestMove([
      { choice: 'move 1', moveName: 'Protect' },
      { choice: 'move 2', moveName: 'Tackle' },
    ], [
      '|switch|p1a: Player|Blissey, L30|100/100',
      '|switch|p2a: Rival|Snorlax, L30|100/100',
      '|move|p2a: Rival|Protect|p2a: Rival',
    ], 3);

    expect(setup?.moveName).toBe('X-Scissor');
    expect(hazard?.moveName).toBe('Rock Slide');
    expect(protect?.moveName).toBe('Tackle');
  });

  it('keeps learner decisions simple while unlocking utility for later tiers', () => {
    const options = [
      { choice: 'move 1', moveName: 'Will-O-Wisp' },
      { choice: 'move 2', moveName: 'Ember' },
    ];
    const log = [
      '|switch|p1a: Player|Snorlax, L30|100/100',
      '|switch|p2a: Rival|Charizard, L30|100/100',
    ];

    expect(chooseBestMove(options, log, 1)?.moveName).toBe('Ember');
    expect(chooseBestMove(options, log, 2)?.moveName).toBe('Will-O-Wisp');
  });

  it('rejects status and setup choices that cannot help the current matchup or moveset', () => {
    const immuneStatus = chooseBestMove([
      { choice: 'move 1', moveName: 'Will-O-Wisp' },
      { choice: 'move 2', moveName: 'Air Slash' },
    ], [
      '|switch|p1a: Player|Arcanine, L30|100/100',
      '|switch|p2a: Rival|Charizard, L30|100/100',
    ], 3);
    const wrongSetup = chooseBestMove([
      { choice: 'move 1', moveName: 'Swords Dance' },
      { choice: 'move 2', moveName: 'Flash Cannon' },
    ], [
      '|switch|p1a: Player|Clefable, L30|100/100',
      '|switch|p2a: Rival|Scizor, L30|100/100',
    ], 3);

    expect(immuneStatus?.moveName).toBe('Air Slash');
    expect(wrongSetup?.moveName).toBe('Flash Cannon');
  });

  it('prefers a healthier defensive switch with a favorable type matchup', () => {
    const log = ['|switch|p1a: Player|Pikachu, L30|100/100'];
    const best = chooseBestSwitch([
      { slot: 2, species: 'Gyarados', condition: '100/100' },
      { slot: 3, species: 'Golem', condition: '80/100' },
    ], log);

    expect(best?.species).toBe('Golem');
  });

  it('uses a switch candidate moveset to break ties with offensive pressure', () => {
    const log = ['|switch|p1a: Player|Gyarados, L30|100/100'];
    const best = chooseBestSwitch([
      { slot: 2, species: 'Mew', condition: '100/100', moves: ['Psychic'] },
      { slot: 3, species: 'Mew', condition: '100/100', moves: ['Thunderbolt'] },
    ], log);

    expect(best?.slot).toBe(3);
  });
});
