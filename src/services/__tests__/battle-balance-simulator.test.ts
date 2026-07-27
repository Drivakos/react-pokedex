import {
  chooseSimulatedPlayerAction,
  createBalanceScenarios,
  simulateFullBattleRuns,
} from '../battle-balance-simulator';
import type {
  BattleDecision,
  BattleMoveChoice,
  BattleSnapshot,
  RunPokemon,
} from '../../types/battle-run';

function move(overrides: Partial<BattleMoveChoice>): BattleMoveChoice {
  return {
    slot: 1,
    name: 'Tackle',
    type: 'Normal',
    category: 'Physical',
    description: '',
    power: 40,
    accuracy: 100,
    priority: 0,
    pp: 35,
    maxpp: 35,
    disabled: false,
    effectiveness: 1,
    ...overrides,
  };
}

describe('battle balance simulator scenarios', () => {
  it('benchmarks every route normally and one fixed route for bosses', () => {
    const scenarios = createBalanceScenarios([1, 5, 10], 20);

    expect(scenarios.map(({ stage, route }) => `${stage}:${route.id}`)).toEqual([
      '1:trail',
      '1:rival',
      '1:apex',
      '5:apex',
      '10:apex',
    ]);
    expect(scenarios.every(scenario => scenario.runs === 20)).toBe(true);
  });
});

describe('full Battle Run balance simulator', () => {
  it('aggregates a complete deterministic run across all 15 stages', async () => {
    const result = await simulateFullBattleRuns({
      runsPerPolicy: 2,
      policies: ['medium'],
      seed: 'complete-runs',
      battleRunner: async () => ({
        result: { winner: 'player', faintedPlayerSpecies: [] },
        turns: 4,
        survivors: 1,
      }),
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      policy: 'medium',
      runs: 2,
      completions: 2,
      completionRate: 1,
      averageStagesCleared: 15,
      deathStages: { complete: 2 },
    });
    expect(result[0].stages).toHaveLength(15);
    expect(result[0].stages.every(stage => stage.reached === 2 && stage.clearRate === 1)).toBe(true);
    expect(result[0].checkpoints).toEqual([
      { stage: 5, reached: 2, cleared: 2, clearRate: 1 },
      { stage: 10, reached: 2, cleared: 2, clearRate: 1 },
      { stage: 15, reached: 2, cleared: 2, clearRate: 1 },
    ]);
  });

  it('records the exact elimination stage and stops progressing the run', async () => {
    const result = await simulateFullBattleRuns({
      runsPerPolicy: 1,
      policies: ['easy'],
      seed: 'stage-three-loss',
      battleRunner: async (party, _enemy, stage) => ({
        result: stage === 3
          ? {
            winner: 'opponent',
            faintedPlayerSpecies: party.map(pokemon => pokemon.species),
          }
          : { winner: 'player', faintedPlayerSpecies: [] },
        turns: 6,
        survivors: stage === 3 ? 0 : party.length,
      }),
    });

    expect(result[0]).toMatchObject({
      completions: 0,
      averageStagesCleared: 2,
      averageFinalPartySize: 0,
      deathStages: { 3: 1 },
    });
    expect(result[0].stages[2]).toMatchObject({
      stage: 3,
      reached: 1,
      cleared: 0,
      clearRate: 0,
    });
    expect(result[0].stages[3]).toMatchObject({
      stage: 4,
      reached: 0,
      cleared: 0,
    });
  });

  it('pairs player policies against the same seeded opening encounter', async () => {
    const openings = new Map<string, string>();
    const results = await simulateFullBattleRuns({
      runsPerPolicy: 1,
      policies: ['medium'],
      playerPolicies: ['casual', 'competent', 'advanced'],
      seed: 'paired-player-policies',
      battleRunner: async (party, enemy, stage, _difficulty, playerPolicy) => {
        if (stage === 1 && playerPolicy) {
          openings.set(
            playerPolicy,
            `${party.map(pokemon => pokemon.species).join(',')}|${enemy.map(pokemon => pokemon.species).join(',')}`,
          );
        }
        return {
          result: { winner: 'player', faintedPlayerSpecies: [] },
          turns: 4,
          survivors: party.length,
        };
      },
    });

    expect(results.map(result => result.playerPolicy)).toEqual([
      'casual',
      'competent',
      'advanced',
    ]);
    expect(new Set(openings.values()).size).toBe(1);
  });
});

describe('simulated player policies', () => {
  const snapshot: BattleSnapshot = {
    turn: 2,
    player: {
      id: 6,
      species: 'Charizard',
      types: ['Fire', 'Flying'],
      level: 50,
      hp: 45,
      maxhp: 100,
      fainted: false,
    },
    opponent: {
      id: 248,
      species: 'Tyranitar',
      types: ['Rock', 'Dark'],
      level: 50,
      hp: 100,
      maxhp: 100,
      fainted: false,
    },
    playerRemaining: 2,
    opponentRemaining: 1,
  };
  const party: RunPokemon[] = [
    {
      id: 6,
      species: 'Charizard',
      types: ['Fire', 'Flying'],
      ability: 'Blaze',
      moves: ['Flamethrower', 'Air Slash'],
      bst: 534,
      level: 50,
    },
    {
      id: 3,
      species: 'Venusaur',
      types: ['Grass', 'Poison'],
      ability: 'Overgrow',
      moves: ['Giga Drain', 'Sludge Bomb'],
      bst: 525,
      level: 50,
    },
  ];

  it('lets a competent player prioritize expected immediate damage', () => {
    const decision: BattleDecision = {
      kind: 'move',
      switchingBlocked: false,
      switches: [],
      moves: [
        move({ slot: 1, name: 'Quick Attack', power: 40, priority: 1 }),
        move({ slot: 2, name: 'Body Slam', power: 85 }),
      ],
    };

    expect(chooseSimulatedPlayerAction(
      'competent',
      decision,
      snapshot,
      party,
      () => 0,
    )).toEqual({ kind: 'move', slot: 2 });
  });

  it('lets an advanced player use recovery at low health', () => {
    const decision: BattleDecision = {
      kind: 'move',
      switchingBlocked: true,
      switches: [],
      moves: [
        move({ slot: 1, name: 'Tackle' }),
        move({
          slot: 2,
          name: 'Recover',
          category: 'Status',
          power: 0,
          effectiveness: null,
        }),
      ],
    };

    expect(chooseSimulatedPlayerAction(
      'advanced',
      decision,
      snapshot,
      party,
      () => 0,
    )).toEqual({ kind: 'move', slot: 2 });
  });

  it('lets an advanced player switch away from a severe type disadvantage', () => {
    const decision: BattleDecision = {
      kind: 'move',
      switchingBlocked: false,
      moves: [
        move({
          slot: 1,
          name: 'Flamethrower',
          type: 'Fire',
          category: 'Special',
          power: 90,
          effectiveness: 0.5,
        }),
      ],
      switches: [
        {
          slot: 1,
          id: 6,
          species: 'Charizard',
          condition: '45/100',
          active: true,
          fainted: false,
        },
        {
          slot: 2,
          id: 3,
          species: 'Venusaur',
          condition: '100/100',
          active: false,
          fainted: false,
        },
      ],
    };

    expect(chooseSimulatedPlayerAction(
      'advanced',
      decision,
      snapshot,
      party,
      () => 0,
    )).toEqual({ kind: 'switch', slot: 2 });
  });
});
