import type {
  BattleDecision,
  BattleResult,
  BattleSnapshot,
  BattleVisualEvent,
  RunPokemon,
  RunDifficulty,
} from './battle-run';

export interface ShowdownBattleCallbacks {
  onSnapshot: (snapshot: BattleSnapshot) => void;
  onDecision: (decision: BattleDecision) => void;
  onLog: (message: string) => void;
  onVisual: (event: BattleVisualEvent) => void;
  onEnd: (result: BattleResult) => void;
  onError: (message: string, fatal?: boolean, cause?: unknown) => void;
  // Raw Showdown protocol chunks (player POV), forwarded so a Showdown BattleScene
  // can render the real move animations. Optional — game logic never depends on it.
  onProtocol?: (chunk: string) => void;
}

export type BattleWorkerRequest =
  | { type: 'init'; playerParty: RunPokemon[]; opponentParty: RunPokemon[]; stage: number; difficulty?: RunDifficulty }
  | { type: 'start' }
  | { type: 'choose-move'; slot: number }
  | { type: 'choose-switch'; slot: number };

export type BattleWorkerEvent =
  | { type: 'ready' }
  | { type: 'snapshot'; snapshot: BattleSnapshot }
  | { type: 'decision'; decision: BattleDecision }
  | { type: 'log'; message: string }
  | { type: 'visual'; event: BattleVisualEvent }
  | { type: 'protocol'; chunk: string }
  | { type: 'end'; result: BattleResult }
  | { type: 'error'; message: string; fatal?: boolean };
