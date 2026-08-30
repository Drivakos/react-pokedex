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
import type { BattleSession, BattleSessionFactoryConfig } from '../../types/battle-worker';
import { BATTLE_CONCLUSION_DURATION_MS, useBattleEngineStore } from '../battleEngineStore';

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

  it('shows the conclusion before finishing exactly once after the scene detaches', () => {
    const { session, onEnd } = startBattle();
    useBattleEngineStore.getState().attachBattleScene();
    const result: BattleResult = { winner: 'player', faintedPlayerSpecies: [] };

    session.callbacks.onEnd(result);
    expect(onEnd).not.toHaveBeenCalled();

    useBattleEngineStore.getState().detachBattleScene();
    useBattleEngineStore.getState().detachBattleScene();

    expect(onEnd).not.toHaveBeenCalled();
    expect(useBattleEngineStore.getState()).toMatchObject({
      status: 'finished',
      conclusion: result,
    });

    jest.advanceTimersByTime(BATTLE_CONCLUSION_DURATION_MS);

    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith(result);
    expect(useBattleEngineStore.getState().status).toBe('finished');
    expect(useBattleEngineStore.getState().conclusion).toBeNull();
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

    expect(onEnd).not.toHaveBeenCalled();
    expect(useBattleEngineStore.getState().conclusion).toMatchObject({ winner: 'opponent' });
    jest.advanceTimersByTime(BATTLE_CONCLUSION_DURATION_MS);

    expect(onEnd).toHaveBeenCalledWith({
      winner: 'opponent',
      faintedPlayerSpecies: ['Pikachu'],
    });
    expect(useBattleEngineStore.getState().status).toBe('finished');
  });

  it('cancels a pending conclusion when the engine resets', () => {
    const { session, onEnd } = startBattle();
    const result: BattleResult = { winner: 'player', faintedPlayerSpecies: [] };
    session.callbacks.onEnd(result);

    expect(useBattleEngineStore.getState().conclusion).toEqual(result);
    useBattleEngineStore.getState().resetBattle();
    jest.advanceTimersByTime(BATTLE_CONCLUSION_DURATION_MS);

    expect(onEnd).not.toHaveBeenCalled();
    expect(useBattleEngineStore.getState()).toMatchObject({
      status: 'idle',
      conclusion: null,
    });
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

  it('can run an injected session and forwards forfeits before teardown', () => {
    let factoryConfig: BattleSessionFactoryConfig | null = null;
    const injectedSession: BattleSession = {
      start: jest.fn(),
      chooseMove: jest.fn(),
      chooseSwitch: jest.fn(),
      forfeit: jest.fn(),
      dispose: jest.fn(),
    };

    useBattleEngineStore.getState().startBattle({
      playerParty: [pokemon],
      enemyParty: [{ ...pokemon, species: 'Raichu', id: 26 }],
      level: 50,
      onEnd: jest.fn(),
      sessionFactory: config => {
        factoryConfig = config;
        return injectedSession;
      },
    });

    expect(factoryConfig).toMatchObject({
      playerParty: [pokemon],
      opponentParty: [{ ...pokemon, species: 'Raichu', id: 26 }],
      level: 50,
      difficulty: 'medium',
    });

    useBattleEngineStore.getState().forfeitBattle();
    expect(injectedSession.forfeit).toHaveBeenCalledTimes(1);
    expect(injectedSession.dispose).toHaveBeenCalledTimes(1);
  });
});
