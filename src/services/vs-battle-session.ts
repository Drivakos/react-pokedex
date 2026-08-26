import type { BattleDecision, RunPokemon } from '../types/battle-run';
import type { BattleSession, ShowdownBattleCallbacks } from '../types/battle-worker';
import type { VsChoicePair } from '../types/vs';
import { createVsBattleWorkerSimulator, type VsLocalSimulator, type VsSimulatorFactory } from './vs-battle-worker.service';
import { getVsChoicePairs, submitVsChoice } from './vs-match.service';

const waitingDecision: BattleDecision = {
  kind: 'wait',
  moves: [],
  switches: [],
  switchingBlocked: false,
};

/**
 * Runs the deterministic simulator locally while using Supabase as a lockstep
 * choice rendezvous. A completed choice pair is applied in canonical host (p1),
 * guest (p2) order on both browsers, producing the same battle from either POV.
 */
export class VsBattleSession implements BattleSession {
  private readonly simulator: VsLocalSimulator;
  private readonly callbacks: ShowdownBattleCallbacks;
  private readonly matchId: string;
  private readonly pairs = new Map<number, VsChoicePair>();
  private readonly submitted = new Set<number>();
  private readonly observed = new Set<number>();
  private readonly applied = new Set<number>();
  private requestIndex: number | null = null;
  private pendingDecision: BattleDecision | null = null;
  private pollTimer: number | null = null;
  private syncing = false;
  private disposed = false;

  constructor({
    matchId,
    isHost,
    playerParty,
    opponentParty,
    battleSeed,
    playerName,
    opponentName,
    callbacks,
    simulatorFactory = createVsBattleWorkerSimulator,
  }: {
    matchId: string;
    isHost: boolean;
    playerParty: RunPokemon[];
    opponentParty: RunPokemon[];
    battleSeed: [number, number, number, number];
    playerName: string;
    opponentName: string;
    callbacks: ShowdownBattleCallbacks;
    simulatorFactory?: VsSimulatorFactory;
  }) {
    this.matchId = matchId;
    this.callbacks = callbacks;
    this.simulator = simulatorFactory({
      isHost,
      playerParty,
      opponentParty,
      battleSeed,
      playerName,
      opponentName,
      callbacks: { ...callbacks, onDecision: decision => this.handleDecision(decision) },
      onOpponentRequest: requestId => this.handleOpponentRequest(requestId),
    });
  }

  start(): void {
    void this.bootstrap();
  }

  chooseMove(slot: number): void {
    void this.submitLocalChoice(`move ${slot}`);
  }

  chooseSwitch(slot: number): void {
    void this.submitLocalChoice(`switch ${slot}`);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.pollTimer !== null) window.clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.simulator.dispose();
  }

  private async bootstrap(): Promise<void> {
    try {
      await this.syncPairs();
      if (this.disposed) return;
      this.pollTimer = window.setInterval(() => void this.syncPairs(), 750);
      this.simulator.start();
    } catch (error) {
      this.callbacks.onError(this.messageFrom(error), true, error);
    }
  }

  private handleDecision(decision: BattleDecision): void {
    if (this.disposed) return;
    if (decision.requestId === undefined) {
      this.callbacks.onError('The simulator returned a battle choice without a request id.', true);
      return;
    }
    this.requestIndex = decision.requestId;
    this.observed.add(decision.requestId);
    this.pendingDecision = decision;
    this.callbacks.onDecision(decision);

    // Reconnecting clients may already have this completed pair in the durable
    // log. Apply it only after the local simulator has exposed its matching
    // request; applying from the opponent stream can race `currentRequest` and
    // permanently drop the resolution.
    if (this.pairs.has(decision.requestId)) {
      this.tryAdvance();
      return;
    }

    if (decision.kind === 'wait') {
      void this.submitLocalChoice('default');
    } else {
      this.tryAdvance();
    }
  }

  private async submitLocalChoice(choice: string): Promise<void> {
    const index = this.requestIndex;
    const decision = this.pendingDecision;
    if (this.disposed || index === null || !decision || this.submitted.has(index)) return;

    await this.submitChoiceAt(index, choice, decision);
  }

  private handleOpponentRequest(requestId: number): void {
    if (this.disposed) return;
    // The remote request is only a synchronization hint. Every local stream
    // produces its own move, switch, or explicit wait decision for the same
    // request id. Submitting `default` here used to race a slightly delayed local
    // move request and auto-select a move before the player could act.
    if (this.requestIndex === requestId) this.tryAdvance();
  }

  private async submitChoiceAt(index: number, choice: string, decision: BattleDecision | null): Promise<void> {
    if (this.disposed || this.submitted.has(index)) return;

    this.submitted.add(index);
    if (choice !== 'default') this.callbacks.onDecision(waitingDecision);

    try {
      const result = await submitVsChoice(this.matchId, index, choice);
      if (this.disposed) return;
      if (result.complete && result.hostChoice && result.guestChoice) {
        this.pairs.set(index, {
          requestIndex: index,
          hostChoice: result.hostChoice,
          guestChoice: result.guestChoice,
        });
      }
      this.tryAdvance();
    } catch (error) {
      this.submitted.delete(index);
      if (choice !== 'default' && decision && index === this.requestIndex) {
        this.callbacks.onDecision(decision);
      }
      this.callbacks.onError(this.messageFrom(error), false, error);
    }
  }

  private async syncPairs(): Promise<void> {
    if (this.disposed || this.syncing) return;
    this.syncing = true;
    try {
      const pairs = await getVsChoicePairs(this.matchId);
      for (const pair of pairs) this.pairs.set(pair.requestIndex, pair);
      this.tryAdvance();
      if (this.pendingDecision?.kind === 'wait' && this.requestIndex !== null && !this.submitted.has(this.requestIndex)) {
        void this.submitLocalChoice('default');
      }
    } catch (error) {
      if (!this.disposed) this.callbacks.onError(this.messageFrom(error), false, error);
    } finally {
      this.syncing = false;
    }
  }

  private tryAdvance(): void {
    if (this.disposed) return;
    const next = [...this.observed]
      .filter(index => !this.applied.has(index) && this.pairs.has(index))
      .sort((left, right) => left - right)[0];
    if (next === undefined) return;
    const pair = this.pairs.get(next);
    if (!pair) return;
    this.applied.add(next);
    if (this.requestIndex === next) {
      this.pendingDecision = null;
      this.requestIndex = null;
    }
    this.simulator.submitSynchronizedChoices(pair.hostChoice, pair.guestChoice);
  }

  private messageFrom(error: unknown): string {
    return error instanceof Error ? error.message : 'The battle connection was interrupted.';
  }
}
