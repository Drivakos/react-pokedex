import { createRunPokemon } from '../battle-content.service';
import { VsBattleSession } from '../vs-battle-session';
import { getVsChoicePairs, submitVsChoice } from '../vs-match.service';
import type { BattleDecision } from '../../types/battle-run';

jest.mock('../vs-match.service', () => ({
  getVsChoicePairs: jest.fn().mockResolvedValue([]),
  submitVsChoice: jest.fn().mockResolvedValue({
    requestIndex: 1,
    complete: false,
    hostChoice: null,
    guestChoice: null,
  }),
}));

jest.mock('../vs-battle-worker.service', () => ({
  createVsBattleWorkerSimulator: jest.fn(),
}));

describe('VsBattleSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getVsChoicePairs).mockResolvedValue([]);
    jest.mocked(submitVsChoice).mockResolvedValue({
      requestIndex: 1,
      complete: false,
      hostChoice: null,
      guestChoice: null,
    });
  });

  it('submits a selected move with the simulator request id', async () => {
    let session: VsBattleSession;
    const decision = await new Promise<BattleDecision>((resolve, reject) => {
      session = new VsBattleSession({
        matchId: 'match-2',
        isHost: true,
        playerParty: [createRunPokemon('Charizard', 5)],
        opponentParty: [createRunPokemon('Venusaur', 5)],
        battleSeed: [1, 2, 3, 4],
        playerName: 'Host',
        opponentName: 'Guest',
        callbacks: {
          onSnapshot: () => undefined,
          onDecision: next => {
            if (next.kind === 'wait') return;
            resolve(next);
          },
          onLog: () => undefined,
          onVisual: () => undefined,
          onEnd: () => undefined,
          onError: (message, fatal) => { if (fatal) reject(new Error(message)); },
        },
        simulatorFactory: options => ({
          start: () => options.callbacks.onDecision({
            requestId: 1,
            kind: 'move',
            moves: [{
              slot: 1,
              name: 'Flamethrower',
              type: 'Fire',
              category: 'Special',
              description: '',
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
          }),
          submitSynchronizedChoices: () => undefined,
          dispose: () => undefined,
        }),
      });
      session.start();
    });

    expect(decision.requestId).toBe(1);
    const sessionChoice = decision.moves.find(move => !move.disabled);
    expect(sessionChoice).toBeDefined();

    session!.chooseMove(sessionChoice!.slot);
    await Promise.resolve();

    expect(getVsChoicePairs).toHaveBeenCalledWith('match-2');
    expect(submitVsChoice).toHaveBeenCalledWith('match-2', 1, expect.stringMatching(/^move [1-4]$/));
    session!.dispose();
  });

  it('does not auto-submit a default choice when the opponent request arrives first', async () => {
    let emitLocalDecision: ((decision: BattleDecision) => void) | undefined;
    let emitOpponentRequest: ((requestId: number) => void) | undefined;
    const session = new VsBattleSession({
      matchId: 'match-delayed-local',
      isHost: true,
      playerParty: [createRunPokemon('Charizard', 5)],
      opponentParty: [createRunPokemon('Venusaur', 5)],
      battleSeed: [1, 2, 3, 4],
      playerName: 'Host',
      opponentName: 'Guest',
      callbacks: {
        onSnapshot: () => undefined,
        onDecision: () => undefined,
        onLog: () => undefined,
        onVisual: () => undefined,
        onEnd: () => undefined,
        onError: () => undefined,
      },
      simulatorFactory: options => {
        emitLocalDecision = options.callbacks.onDecision;
        emitOpponentRequest = options.onOpponentRequest;
        return {
          start: () => undefined,
          submitSynchronizedChoices: () => undefined,
          dispose: () => undefined,
        };
      },
    });

    session.start();
    await Promise.resolve();
    emitOpponentRequest?.(1);
    await new Promise(resolve => setTimeout(resolve, 75));

    expect(submitVsChoice).not.toHaveBeenCalled();

    emitLocalDecision?.({
      requestId: 1,
      kind: 'move',
      moves: [],
      switches: [],
      switchingBlocked: false,
    });
    expect(submitVsChoice).not.toHaveBeenCalled();
    session.dispose();
  });

  it('auto-submits a default choice for a forced move continuation', async () => {
    let emitLocalDecision: ((decision: BattleDecision) => void) | undefined;
    const session = new VsBattleSession({
      matchId: 'match-forced-fly',
      isHost: true,
      playerParty: [createRunPokemon('Charizard', 5)],
      opponentParty: [createRunPokemon('Venusaur', 5)],
      battleSeed: [1, 2, 3, 4],
      playerName: 'Host',
      opponentName: 'Guest',
      callbacks: {
        onSnapshot: () => undefined,
        onDecision: () => undefined,
        onLog: () => undefined,
        onVisual: () => undefined,
        onEnd: () => undefined,
        onError: () => undefined,
      },
      simulatorFactory: options => {
        emitLocalDecision = options.callbacks.onDecision;
        return {
          start: () => undefined,
          submitSynchronizedChoices: () => undefined,
          dispose: () => undefined,
        };
      },
    });

    session.start();
    await Promise.resolve();
    emitLocalDecision?.({
      requestId: 2,
      kind: 'wait',
      moves: [],
      switches: [],
      switchingBlocked: true,
    });
    await Promise.resolve();

    expect(submitVsChoice).toHaveBeenCalledWith('match-forced-fly', 2, 'default');
    session.dispose();
  });

  it('replays a persisted pair only after the matching local request exists', async () => {
    jest.mocked(getVsChoicePairs).mockResolvedValue([{
      requestIndex: 1,
      hostChoice: 'move 1',
      guestChoice: 'move 1',
    }]);
    let emitLocalDecision: ((decision: BattleDecision) => void) | undefined;
    let emitOpponentRequest: ((requestId: number) => void) | undefined;
    const applyPair = jest.fn();
    const session = new VsBattleSession({
      matchId: 'match-reconnect',
      isHost: true,
      playerParty: [createRunPokemon('Charizard', 5)],
      opponentParty: [createRunPokemon('Venusaur', 5)],
      battleSeed: [1, 2, 3, 4],
      playerName: 'Host',
      opponentName: 'Guest',
      callbacks: {
        onSnapshot: () => undefined,
        onDecision: () => undefined,
        onLog: () => undefined,
        onVisual: () => undefined,
        onEnd: () => undefined,
        onError: () => undefined,
      },
      simulatorFactory: options => {
        emitLocalDecision = options.callbacks.onDecision;
        emitOpponentRequest = options.onOpponentRequest;
        return {
          start: () => undefined,
          submitSynchronizedChoices: applyPair,
          dispose: () => undefined,
        };
      },
    });

    session.start();
    await Promise.resolve();
    await Promise.resolve();
    emitOpponentRequest?.(1);
    expect(applyPair).not.toHaveBeenCalled();

    emitLocalDecision?.({
      requestId: 1,
      kind: 'move',
      moves: [],
      switches: [],
      switchingBlocked: false,
    });

    expect(applyPair).toHaveBeenCalledWith('move 1', 'move 1');
    expect(submitVsChoice).not.toHaveBeenCalled();
    session.dispose();
  });
});
