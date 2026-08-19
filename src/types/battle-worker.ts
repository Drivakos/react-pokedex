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

/** Runtime boundary used by the UI battle engine for either AI or VS sessions. */
export interface BattleSession {
  start: () => void;
  chooseMove: (slot: number) => void;
  chooseSwitch: (slot: number) => void;
  /** Optional remote-aware forfeit hook. The engine still owns local teardown. */
  forfeit?: () => void;
  dispose: () => void;
}

export interface BattleSessionFactoryConfig {
  playerParty: RunPokemon[];
  opponentParty: RunPokemon[];
  level: number;
  difficulty: RunDifficulty;
  callbacks: ShowdownBattleCallbacks;
}

/** Factories must not emit callbacks synchronously before returning the session. */
export type BattleSessionFactory = (config: BattleSessionFactoryConfig) => BattleSession;

export type BattleWorkerRequest =
  | { type: 'init'; playerParty: RunPokemon[]; opponentParty: RunPokemon[]; stage: number; difficulty?: RunDifficulty }
  | {
      type: 'init-vs';
      playerParty: RunPokemon[];
      opponentParty: RunPokemon[];
      battleSeed: [number, number, number, number];
      isHost: boolean;
      playerName: string;
      opponentName: string;
    }
  | { type: 'start' }
  | { type: 'choose-move'; slot: number }
  | { type: 'choose-switch'; slot: number }
  | { type: 'synchronized-choices'; hostChoice: string; guestChoice: string };

export type BattleWorkerEvent =
  | { type: 'ready' }
  | { type: 'snapshot'; snapshot: BattleSnapshot }
  | { type: 'decision'; decision: BattleDecision }
  | { type: 'log'; message: string }
  | { type: 'visual'; event: BattleVisualEvent }
  | { type: 'protocol'; chunk: string }
  | { type: 'opponent-request'; requestId: number }
  | { type: 'end'; result: BattleResult }
  | { type: 'error'; message: string; fatal?: boolean };
