import type {
  BattleWorkerEvent,
  BattleWorkerRequest,
  ShowdownBattleCallbacks,
} from '../types/battle-worker';
import type { RunPokemon } from '../types/battle-run';

export class ShowdownBattleWorkerSession {
  private readonly worker: Worker;
  private readonly callbacks: ShowdownBattleCallbacks;
  private ready = false;
  private startRequested = false;
  private disposed = false;

  constructor(
    playerParty: RunPokemon[],
    opponentParty: RunPokemon[],
    callbacks: ShowdownBattleCallbacks,
  ) {
    this.callbacks = callbacks;
    this.worker = new Worker(new URL('../workers/showdown-battle.worker.ts', import.meta.url), {
      type: 'module',
      name: 'battle-run-simulator',
    });
    this.worker.onmessage = ({ data }: MessageEvent<BattleWorkerEvent>) => this.handleEvent(data);
    this.worker.onerror = event => {
      this.callbacks.onError(event.message || 'The battle engine failed to load.');
      this.dispose();
    };
    this.send({ type: 'init', playerParty, opponentParty });
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
    this.worker.terminate();
  }

  private send(message: BattleWorkerRequest): void {
    if (!this.disposed) this.worker.postMessage(message);
  }

  private handleEvent(event: BattleWorkerEvent): void {
    if (this.disposed) return;

    switch (event.type) {
      case 'ready':
        this.ready = true;
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
      case 'end':
        this.callbacks.onEnd(event.result);
        this.dispose();
        break;
      case 'error':
        this.callbacks.onError(event.message);
        break;
    }
  }
}
