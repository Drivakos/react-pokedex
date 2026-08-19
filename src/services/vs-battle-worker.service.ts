import type { RunPokemon } from '../types/battle-run';
import type { BattleWorkerEvent, BattleWorkerRequest, ShowdownBattleCallbacks } from '../types/battle-worker';

export interface VsLocalSimulator {
  start: () => void;
  submitSynchronizedChoices: (hostChoice: string, guestChoice: string) => void;
  dispose: () => void;
}

interface VsSimulatorOptions {
  isHost: boolean;
  playerParty: RunPokemon[];
  opponentParty: RunPokemon[];
  battleSeed: [number, number, number, number];
  playerName: string;
  opponentName: string;
  callbacks: ShowdownBattleCallbacks;
  onOpponentRequest: (requestId: number) => void;
}

export type VsSimulatorFactory = (options: VsSimulatorOptions) => VsLocalSimulator;

class VsBattleWorkerSimulator implements VsLocalSimulator {
  private readonly worker: Worker;
  private readonly callbacks: ShowdownBattleCallbacks;
  private readonly onOpponentRequest: (requestId: number) => void;
  private ready = false;
  private startRequested = false;
  private disposed = false;

  constructor(options: VsSimulatorOptions) {
    this.callbacks = options.callbacks;
    this.onOpponentRequest = options.onOpponentRequest;
    this.worker = new Worker(new URL('../workers/showdown-battle.worker.ts', import.meta.url), {
      type: 'module',
      name: 'vs-battle-simulator',
    });
    this.worker.onmessage = ({ data }: MessageEvent<BattleWorkerEvent>) => this.handleEvent(data);
    this.worker.onerror = event => this.callbacks.onError(event.message || 'The battle engine failed to load.', true);
    this.send({
      type: 'init-vs',
      playerParty: options.playerParty,
      opponentParty: options.opponentParty,
      battleSeed: options.battleSeed,
      isHost: options.isHost,
      playerName: options.playerName,
      opponentName: options.opponentName,
    });
  }

  start(): void {
    if (this.ready) this.send({ type: 'start' });
    else this.startRequested = true;
  }

  submitSynchronizedChoices(hostChoice: string, guestChoice: string): void {
    this.send({ type: 'synchronized-choices', hostChoice, guestChoice });
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
      case 'snapshot': this.callbacks.onSnapshot(event.snapshot); break;
      case 'decision': this.callbacks.onDecision(event.decision); break;
      case 'log': this.callbacks.onLog(event.message); break;
      case 'visual': this.callbacks.onVisual(event.event); break;
      case 'protocol': this.callbacks.onProtocol?.(event.chunk); break;
      case 'opponent-request': this.onOpponentRequest(event.requestId); break;
      case 'end': this.callbacks.onEnd(event.result); this.dispose(); break;
      case 'error':
        this.callbacks.onError(event.message, event.fatal);
        if (event.fatal) this.dispose();
        break;
    }
  }
}

export const createVsBattleWorkerSimulator: VsSimulatorFactory = options => new VsBattleWorkerSimulator(options);
