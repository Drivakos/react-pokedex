import type { BattleDecision, BattleResult, RunPokemon } from '../../types/battle-run';
import type { ShowdownBattleCallbacks } from '../../types/battle-worker';
import type { VsChoicePair } from '../../types/vs';
import type { VsLocalSimulator, VsSimulatorFactory } from '../vs-battle-worker.service';

jest.mock('../vs-battle-worker.service', () => ({
  createVsBattleWorkerSimulator: jest.fn(),
}));

import { VsReplaySession } from '../vs-replay-session';

const pokemon: RunPokemon = {
  id: 25,
  species: 'Pikachu',
  level: 50,
  types: ['Electric'],
  ability: 'Static',
  moves: ['Thunderbolt'],
  bst: 320,
};

function callbacks(): jest.Mocked<ShowdownBattleCallbacks> {
  return {
    onSnapshot: jest.fn(),
    onDecision: jest.fn(),
    onLog: jest.fn(),
    onVisual: jest.fn(),
    onEnd: jest.fn(),
    onError: jest.fn(),
    onProtocol: jest.fn(),
  };
}

function setup(choicePairs: VsChoicePair[], recordedResult: BattleResult) {
  let simulatorCallbacks: ShowdownBattleCallbacks | null = null;
  const simulator: jest.Mocked<VsLocalSimulator> = {
    start: jest.fn(),
    submitSynchronizedChoices: jest.fn(),
    dispose: jest.fn(),
  };
  const simulatorFactory: VsSimulatorFactory = options => {
    simulatorCallbacks = options.callbacks;
    return simulator;
  };
  const replayCallbacks = callbacks();
  const session = new VsReplaySession({
    isHost: true,
    playerParty: [pokemon],
    opponentParty: [{ ...pokemon, id: 1, species: 'Bulbasaur' }],
    battleSeed: [1, 2, 3, 4],
    playerName: 'Red',
    opponentName: 'Blue',
    choicePairs,
    recordedResult,
    callbacks: replayCallbacks,
    simulatorFactory,
  });
  return { session, simulator, replayCallbacks, getSimulatorCallbacks: () => simulatorCallbacks! };
}

describe('VsReplaySession', () => {
  const moveDecision: BattleDecision = {
    requestId: 1,
    kind: 'move',
    moves: [],
    switches: [],
    switchingBlocked: false,
  };

  it('feeds recorded host and guest choices to the deterministic simulator', () => {
    const pair = { requestIndex: 1, hostChoice: 'move 1', guestChoice: 'switch 2' };
    const { session, simulator, getSimulatorCallbacks } = setup([pair], { winner: 'player', faintedPlayerSpecies: [] });

    session.start();
    getSimulatorCallbacks().onDecision(moveDecision);

    expect(simulator.start).toHaveBeenCalledTimes(1);
    expect(simulator.submitSynchronizedChoices).toHaveBeenCalledWith('move 1', 'switch 2');
  });

  it('uses the stored result when a forfeit leaves no next choice pair', () => {
    const recordedResult: BattleResult = { winner: 'opponent', faintedPlayerSpecies: [] };
    const { replayCallbacks, simulator, getSimulatorCallbacks } = setup([], recordedResult);

    getSimulatorCallbacks().onDecision(moveDecision);

    expect(replayCallbacks.onEnd).toHaveBeenCalledWith(recordedResult);
    expect(simulator.dispose).toHaveBeenCalledTimes(1);
  });

  it('forwards the simulator result for a naturally completed battle', () => {
    const result: BattleResult = { winner: 'player', faintedPlayerSpecies: ['Pikachu'] };
    const { replayCallbacks, simulator, getSimulatorCallbacks } = setup([], result);

    getSimulatorCallbacks().onEnd(result);

    expect(replayCallbacks.onEnd).toHaveBeenCalledWith(result);
    expect(simulator.dispose).toHaveBeenCalledTimes(1);
  });
});
