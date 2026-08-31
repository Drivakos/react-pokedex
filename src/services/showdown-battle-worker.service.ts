import type {
  BattleSession,
  BattleWorkerEvent,
  BattleWorkerRequest,
  ShowdownBattleCallbacks,
} from '../types/battle-worker';
import type { RunDifficulty, RunPokemon } from '../types/battle-run';
import { compactBattleWorkerEvents } from '../utils/battle-worker-events';

let prewarmedWorker: Worker | null = null;

function createBattleWorker(): Worker {
  return new Worker(new URL('../workers/showdown-battle.worker.ts', import.meta.url), {
    type: 'module',
    name: 'battle-run-simulator',
  });
}

function acquireBattleWorker(): Worker {
  const worker = prewarmedWorker ?? createBattleWorker();
  prewarmedWorker = null;
  return worker;
}

export function prewarmShowdownBattleWorker(): void {
  if (typeof Worker === 'undefined' || prewarmedWorker) return;

  const worker = createBattleWorker();
  prewarmedWorker = worker;
  worker.onerror = () => {
    if (prewarmedWorker !== worker) return;
    worker.terminate();
    prewarmedWorker = null;
  };
}

export function disposePrewarmedShowdownBattleWorker(): void {
  prewarmedWorker?.terminate();
  prewarmedWorker = null;
}

export class ShowdownBattleWorkerSession implements BattleSession {
  private readonly worker: Worker;
  private readonly callbacks: ShowdownBattleCallbacks;
  private ready = false;
  private startRequested = false;
  private disposed = false;
  private pendingEvents: BattleWorkerEvent[] = [];
  private flushFrame: number | null = null;
  private readyTimer: number | null = null;

  constructor(
    playerParty: RunPokemon[],
    opponentParty: RunPokemon[],
    stage: number,
    callbacks: ShowdownBattleCallbacks,
    difficulty: RunDifficulty = 'medium',
    names: { playerName?: string; opponentName?: string } = {},
  ) {
    this.callbacks = callbacks;
    this.worker = acquireBattleWorker();
    this.worker.onmessage = ({ data }: MessageEvent<BattleWorkerEvent>) => this.enqueueEvent(data);
    this.worker.onerror = event => {
      this.callbacks.onError(event.message || 'The battle engine failed to load.', true);
      this.dispose();
    };
    this.readyTimer = window.setTimeout(() => {
      if (this.ready || this.disposed) return;
      this.callbacks.onError('The battle engine took too long to initialize.', true);
      this.dispose();
    }, 12_000);
    this.send({
      type: 'init',
      playerParty,
      opponentParty,
      playerName: names.playerName,
      opponentName: names.opponentName,
      stage,
      difficulty,
    });
  }

  start(): void {
    if (this.ready) {
      this.send({ type: 'start' });
    } else {
      this.startRequested = true;
    }
  }

  chooseMove(slot: number): void {
    this.send({ type: 'choose-move', slot });
  }

  chooseSwitch(slot: number): void {
    this.send({ type: 'choose-switch', slot });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.flushFrame !== null) window.cancelAnimationFrame(this.flushFrame);
    if (this.readyTimer !== null) window.clearTimeout(this.readyTimer);
    this.flushFrame = null;
    this.readyTimer = null;
    this.pendingEvents = [];
    this.worker.terminate();
  }

  private send(message: BattleWorkerRequest): void {
    if (!this.disposed) this.worker.postMessage(message);
  }

  private enqueueEvent(event: BattleWorkerEvent): void {
    if (this.disposed) return;

    this.pendingEvents.push(event);
    if (this.flushFrame !== null) return;
    this.flushFrame = window.requestAnimationFrame(() => this.flushEvents());
  }

  private flushEvents(): void {
    this.flushFrame = null;
    const events = compactBattleWorkerEvents(this.pendingEvents);
    this.pendingEvents = [];

    for (const event of events) {
      if (this.disposed) break;
      this.handleEvent(event);
    }
  }

  private handleEvent(event: BattleWorkerEvent): void {
    if (this.disposed) return;

    switch (event.type) {
      case 'ready':
        this.ready = true;
        if (this.readyTimer !== null) window.clearTimeout(this.readyTimer);
        this.readyTimer = null;
        if (this.startRequested) this.send({ type: 'start' });
        break;
      case 'snapshot':
        this.callbacks.onSnapshot(event.snapshot);
        break;
      case 'decision':
        this.callbacks.onDecision(event.decision);
        break;
      case 'log':
        this.callbacks.onLog(event.message);
        break;
      case 'visual':
        this.callbacks.onVisual(event.event);
        break;
      case 'protocol':
        this.callbacks.onProtocol?.(event.chunk);
        break;
      case 'end':
        this.callbacks.onEnd(event.result);
        this.dispose();
        break;
      case 'error':
        this.callbacks.onError(event.message, event.fatal);
        if (event.fatal) this.dispose();
        break;
    }
  }
}
