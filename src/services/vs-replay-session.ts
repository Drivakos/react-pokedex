import type { BattleDecision, BattleResult, RunPokemon } from '../types/battle-run';
import type { BattleSession, ShowdownBattleCallbacks } from '../types/battle-worker';
import type { VsChoicePair } from '../types/vs';
import { createVsBattleWorkerSimulator, type VsLocalSimulator, type VsSimulatorFactory } from './vs-battle-worker.service';

const waitingDecision: BattleDecision = {
  kind: 'wait',
  moves: [],
  switches: [],
  switchingBlocked: false,
};

/**
 * Rebuilds a completed VS battle from its locked seed, teams, and durable choice
 * pairs. No network writes occur: the original choices are fed to the same local
 * simulator in their canonical host/guest order.
 */
export class VsReplaySession implements BattleSession {
  private readonly simulator: VsLocalSimulator;
  private readonly callbacks: ShowdownBattleCallbacks;
  private readonly pairs: Map<number, VsChoicePair>;
  private readonly recordedResult: BattleResult;
  private disposed = false;
  private ended = false;

  constructor({
    isHost,
    playerParty,
    opponentParty,
    battleSeed,
    playerName,
    opponentName,
    choicePairs,
    recordedResult,
    callbacks,
    simulatorFactory = createVsBattleWorkerSimulator,
  }: {
    isHost: boolean;
    playerParty: RunPokemon[];
    opponentParty: RunPokemon[];
    battleSeed: [number, number, number, number];
    playerName: string;
    opponentName: string;
    choicePairs: VsChoicePair[];
    recordedResult: BattleResult;
    callbacks: ShowdownBattleCallbacks;
    simulatorFactory?: VsSimulatorFactory;
  }) {
    this.callbacks = callbacks;
    this.recordedResult = recordedResult;
    this.pairs = new Map(choicePairs.map(pair => [pair.requestIndex, pair]));
    this.simulator = simulatorFactory({
      isHost,
      playerParty,
      opponentParty,
      battleSeed,
      playerName,
      opponentName,
      callbacks: {
        ...callbacks,
        onDecision: decision => this.handleDecision(decision),
        onEnd: result => this.finish(result),
      },
      onOpponentRequest: () => undefined,
    });
  }

  start(): void {
    this.simulator.start();
  }

  chooseMove(): void {
    // Replays are read-only; all choices come from the durable match log.
  }

  chooseSwitch(): void {
    // Replays are read-only; all choices come from the durable match log.
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.simulator.dispose();
  }

  private handleDecision(decision: BattleDecision): void {
    if (this.disposed || this.ended) return;
    this.callbacks.onDecision(waitingDecision);
    const requestIndex = decision.requestId;
    const pair = requestIndex === undefined ? undefined : this.pairs.get(requestIndex);

    if (!pair) {
      // A forfeit can end between simulator requests, leaving no final choice pair.
      // The stored result closes the replay after all recorded actions were shown.
      this.finish(this.recordedResult);
      return;
    }

    this.simulator.submitSynchronizedChoices(pair.hostChoice, pair.guestChoice);
  }

  private finish(result: BattleResult): void {
    if (this.disposed || this.ended) return;
    this.ended = true;
    this.callbacks.onEnd(result);
    this.simulator.dispose();
  }
}
