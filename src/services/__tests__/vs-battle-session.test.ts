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
});
