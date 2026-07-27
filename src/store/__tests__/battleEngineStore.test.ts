const mockSessions: Array<{
  callbacks: {
    onDecision: (decision: unknown) => void;
    onEnd: (result: unknown) => void;
    onError: (message: string, fatal?: boolean) => void;
  };
  start: jest.Mock;
  dispose: jest.Mock;
  chooseMove: jest.Mock;
  chooseSwitch: jest.Mock;
}> = [];

jest.mock('../../services/showdown-battle-worker.service', () => ({
  ShowdownBattleWorkerSession: jest.fn().mockImplementation((
    _playerParty: unknown,
    _enemyParty: unknown,
    _stage: unknown,
    callbacks: typeof mockSessions[number]['callbacks'],
  ) => {
    const instance = {
      callbacks,
      start: jest.fn(),
      dispose: jest.fn(),
      chooseMove: jest.fn(),
      chooseSwitch: jest.fn(),
    };
    mockSessions.push(instance);
    return instance;
  }),
}));

import type { BattleDecision, BattleResult, RunPokemon } from '../../types/battle-run';
import { useBattleEngineStore } from '../battleEngineStore';

const pokemon: RunPokemon = {
  id: 25,
  species: 'Pikachu',
  level: 5,
  types: ['Electric'],
  ability: 'Static',
  moves: ['Thunderbolt'],
  bst: 320,
};

const moveDecision: BattleDecision = {
  kind: 'move',
  moves: [{
    slot: 1,
    name: 'Thunderbolt',
    type: 'Electric',
    category: 'Special',
    description: 'May paralyze the target.',
    power: 90,
    accuracy: 100,
    priority: 0,
    pp: 15,
    maxpp: 15,
    disabled: false,
    effectiveness: 1,
  }],
  switches: [],
  switchingBlocked: false,
};

function startBattle(onEnd = jest.fn()) {
  useBattleEngineStore.getState().startBattle({
    playerParty: [pokemon],
    enemyParty: [{ ...pokemon, species: 'Raichu', id: 26 }],
    level: 1,
    onEnd,
  });
  return { session: mockSessions[mockSessions.length - 1], onEnd };
}

describe('battle engine pacing and recovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useBattleEngineStore.getState().resetBattle();
    mockSessions.length = 0;
  });

  afterEach(() => {
    useBattleEngineStore.getState().resetBattle();
    jest.useRealTimers();
  });

  it('holds a decision while the scene animates and releases it when idle', () => {
    const { session } = startBattle();
    useBattleEngineStore.getState().attachBattleScene();

    session.callbacks.onDecision(moveDecision);
    expect(useBattleEngineStore.getState()).toMatchObject({
      status: 'animating',
      decision: { kind: 'wait' },
    });

    useBattleEngineStore.getState().reportBattleScenePlayback(true);
    expect(useBattleEngineStore.getState()).toMatchObject({
      status: 'awaiting-choice',
      decision: { kind: 'move' },
    });
  });

  it('hands a buffered decision to the fallback renderer when the scene detaches', () => {
    const { session } = startBattle();
    useBattleEngineStore.getState().attachBattleScene();
    session.callbacks.onDecision(moveDecision);

    useBattleEngineStore.getState().detachBattleScene();

    expect(useBattleEngineStore.getState()).toMatchObject({
      status: 'awaiting-choice',
      decision: { kind: 'move' },
    });
  });

  it('finishes exactly once when the scene detaches after the simulator ends', () => {
    const { session, onEnd } = startBattle();
    useBattleEngineStore.getState().attachBattleScene();
    const result: BattleResult = { winner: 'player', faintedPlayerSpecies: [] };

    session.callbacks.onEnd(result);
    expect(onEnd).not.toHaveBeenCalled();

    useBattleEngineStore.getState().detachBattleScene();
    useBattleEngineStore.getState().detachBattleScene();

    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith(result);
    expect(useBattleEngineStore.getState().status).toBe('finished');
  });

  it('enters a recoverable error state and can restart the same encounter', () => {
    const { session } = startBattle();
    session.callbacks.onError('Worker crashed.', true);

    expect(session.dispose).toHaveBeenCalledTimes(1);
    expect(useBattleEngineStore.getState()).toMatchObject({
      status: 'error',
      error: 'Worker crashed.',
      decision: { kind: 'wait' },
    });

    useBattleEngineStore.getState().retryBattle();

    expect(mockSessions).toHaveLength(2);
    expect(useBattleEngineStore.getState()).toMatchObject({
      status: 'starting',
      error: null,
    });
  });

  it('can end the run cleanly after a fatal engine error', () => {
    const { session, onEnd } = startBattle();
    session.callbacks.onError('Worker crashed.', true);

    useBattleEngineStore.getState().forfeitBattle();

    expect(onEnd).toHaveBeenCalledWith({
      winner: 'opponent',
      faintedPlayerSpecies: ['Pikachu'],
    });
    expect(useBattleEngineStore.getState().status).toBe('finished');
  });

  it('ignores callbacks from a disposed previous battle', () => {
    const first = startBattle().session;
    startBattle();

    first.callbacks.onDecision(moveDecision);
    first.callbacks.onError('Stale failure.', true);

    expect(useBattleEngineStore.getState()).toMatchObject({
      status: 'starting',
      error: null,
      decision: { kind: 'wait' },
    });
  });
});
