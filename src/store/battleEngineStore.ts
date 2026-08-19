import { create } from 'zustand';
import { ShowdownBattleWorkerSession } from '../services/showdown-battle-worker.service';
import type {
  BattleDecision,
  BattleEngineStatus,
  BattleResult,
  BattleSnapshot,
  BattleVisualEvent,
  RunDifficulty,
  RunPokemon,
} from '../types/battle-run';
import { canSubmitMove, canSubmitSwitch } from '../utils/battle-request-rules';
import type { BattleSession, BattleSessionFactory, ShowdownBattleCallbacks } from '../types/battle-worker';

/**
 * The reusable battle engine.
 *
 * This store runs a single Pokémon battle and nothing else. It drives the
 * @pkmn/sim worker, streams the Showdown protocol to the on-screen scene, paces
 * the game off the scene's real animation clock, and exposes the player's move /
 * switch commands. It knows nothing about *why* the battle is happening — who the
 * fighters are, what winning means, or what comes next. A "narrative" store
 * (Battle Run today, other challenges tomorrow) supplies the two parties via
 * `startBattle` and reacts to the outcome through its callbacks. Keeping this
 * layer narrative-free is what lets a new challenge reuse the whole battle
 * experience (engine + `ShowdownStage` + the battle UI) unchanged.
 */

const emptyDecision: BattleDecision = { kind: 'wait', moves: [], switches: [], switchingBlocked: false };

/** Everything a narrative hands the engine to run one battle. */
export interface StartBattleConfig {
  playerParty: RunPokemon[];
  enemyParty: RunPokemon[];
  /** Difficulty/level context for the worker (higher = tougher AI and levels). */
  level: number;
  /** AI decision profile selected by the narrative. */
  difficulty?: RunDifficulty;
  /** Opening lines shown in the battle feed before the first turn (flavor text). */
  introLog?: string[];
  /** Fired once the battle is actually live on screen (first event from the worker). */
  onActive?: () => void;
  /** Fired exactly once when the on-screen battle is over (final KO animation done). */
  onEnd: (result: BattleResult) => void;
  /** Optional transport/simulator implementation. Battle Run uses the local AI session. */
  sessionFactory?: BattleSessionFactory;
}

// The live worker session for the current battle (null between battles).
let session: BattleSession | null = null;
let startTimer: number | null = null;
// The narrative's outcome callback for the current battle.
let onBattleEnd: ((result: BattleResult) => void) | null = null;
let lastBattleConfig: StartBattleConfig | null = null;

// --- Raw Showdown protocol feed --------------------------------------------
// A streaming side channel (not React state) so the Showdown BattleScene can
// animate turns in order without re-render churn. The current battle's chunks are
// retained and replayed to any late subscriber, so a scene that mounts after the
// opening |switch| lines still receives the full log (the sim protocol is one
// ordered sequence from |start| onward).
const battleProtocolListeners = new Set<(chunk: string) => void>();
let currentBattleProtocol: string[] = [];

function resetBattleProtocol(): void {
  currentBattleProtocol = [];
}

function emitBattleProtocol(chunk: string): void {
  currentBattleProtocol.push(chunk);
  battleProtocolListeners.forEach(listener => listener(chunk));
}

export function subscribeBattleProtocol(listener: (chunk: string) => void): () => void {
  // Replay everything so far so the subscriber never misses the battle opening.
  for (const chunk of currentBattleProtocol) listener(chunk);
  battleProtocolListeners.add(listener);
  return () => battleProtocolListeners.delete(listener);
}

// --- Showdown scene playback gate ------------------------------------------
// The worker resolves each turn instantly and hands us the next decision (and the
// final result) long before the Showdown scene — which animates in real time —
// catches up. Releasing them immediately makes the move UI reappear mid-animation
// and cuts the final KO off abruptly. So while a live scene is attached we buffer
// the next decision / end result and release them only when the scene reports its
// animation queue has drained ('atqueueend'). Without a live scene (fallback
// renderer) the gate is inactive and the visual-event queue paces the game.
let sceneGateActive = false;
let sceneIdle = true;
let bufferedDecision: BattleDecision | null = null;
let pendingBattleResult: BattleResult | null = null;

const createLocalAiSession: BattleSessionFactory = ({
  playerParty,
  opponentParty,
  level,
  callbacks,
  difficulty,
}) => new ShowdownBattleWorkerSession(playerParty, opponentParty, level, callbacks, difficulty);

interface BattleEngineStore {
  snapshot: BattleSnapshot | null;
  decision: BattleDecision;
  battleLog: string[];
  visualEvents: BattleVisualEvent[];
  // Bumped each time a new battle begins, so a Showdown scene can reset itself.
  battleNonce: number;
  status: BattleEngineStatus;
  error: string | null;
  startBattle: (config: StartBattleConfig) => void;
  chooseMove: (slot: number) => void;
  chooseSwitch: (slot: number) => void;
  consumeVisualEvent: (id: number) => void;
  // Tear down the current battle (used when a narrative restarts from scratch).
  resetBattle: () => void;
  retryBattle: () => void;
  forfeitBattle: () => void;
  // Wired up by the live Showdown scene so pacing follows the real on-screen
  // animation rather than the (instant) worker / guessed durations.
  attachBattleScene: () => void;
  detachBattleScene: () => void;
  reportBattleScenePlayback: (idle: boolean) => void;
}

export const useBattleEngineStore = create<BattleEngineStore>((set, get) => {
  // Flush a decision that was held back while the scene animated the previous turn.
  const releaseBufferedDecision = () => {
    if (!bufferedDecision) return;
    const decision = bufferedDecision;
    bufferedDecision = null;
    set({ decision, status: 'awaiting-choice', error: null });
  };

  // Report the battle outcome to the narrative — exactly once, when the on-screen
  // battle is truly over. `pendingBattleResult` is the single-fire guard (set when
  // the worker ends the battle, cleared here on the first call).
  const finishBattle = (result: BattleResult) => {
    if (pendingBattleResult === null) return;
    pendingBattleResult = null;
    bufferedDecision = null;
    sceneGateActive = false;
    const notify = onBattleEnd;
    onBattleEnd = null;
    set({ decision: emptyDecision, visualEvents: [], status: 'finished', error: null });
    notify?.(result);
  };

  return {
    snapshot: null,
    decision: emptyDecision,
    battleLog: [],
    visualEvents: [],
    battleNonce: 0,
    status: 'idle',
    error: null,

    startBattle: config => {
      const {
        playerParty,
        enemyParty,
        level,
        difficulty = 'medium',
        introLog = [],
        onActive,
        onEnd,
      } = config;
      session?.dispose();
      if (startTimer !== null) window.clearTimeout(startTimer);
      startTimer = null;
      resetBattleProtocol();
      sceneGateActive = false;
      sceneIdle = true;
      bufferedDecision = null;
      pendingBattleResult = null;
      onBattleEnd = onEnd;
      lastBattleConfig = config;
      set(current => ({
        snapshot: null,
        decision: emptyDecision,
        battleLog: introLog,
        visualEvents: [],
        status: 'starting',
        error: null,
        battleNonce: current.battleNonce + 1,
      }));

      const callbacks: ShowdownBattleCallbacks = {
        onProtocol: chunk => {
          if (session === battleSession) emitBattleProtocol(chunk);
        },
        onSnapshot: snapshot => {
          if (session !== battleSession) return;
          onActive?.();
          set(current => ({
            snapshot,
            status: current.status === 'starting' ? 'animating' : current.status,
          }));
        },
        onDecision: decision => {
          if (session !== battleSession) return;
          onActive?.();
          // Hold an actionable decision until the scene has finished animating the
          // turn it belongs to; a bare 'wait' can pass straight through to lock the UI.
          if (sceneGateActive && !sceneIdle && decision.kind !== 'wait') {
            bufferedDecision = decision;
            set({ decision: emptyDecision, status: 'animating', error: null });
          } else {
            bufferedDecision = null;
            set({
              decision,
              status: decision.kind === 'wait' ? 'animating' : 'awaiting-choice',
              error: null,
            });
          }
        },
        onLog: message => {
          if (session !== battleSession) return;
          set(current => ({ battleLog: [...current.battleLog, message].slice(-12) }));
        },
        onVisual: event => {
          if (session !== battleSession) return;
          set(current => ({ visualEvents: [...current.visualEvents, event].slice(-40) }));
        },
        onError: (message, fatal = false) => {
          if (session !== battleSession) return;
          onActive?.();
          if (!fatal) {
            set({ error: message });
            return;
          }
          battleSession.dispose();
          session = null;
          if (startTimer !== null) window.clearTimeout(startTimer);
          startTimer = null;
          pendingBattleResult = null;
          bufferedDecision = null;
          sceneGateActive = false;
          sceneIdle = true;
          set({ decision: emptyDecision, status: 'error', error: message });
        },
        onEnd: result => {
          if (session !== battleSession) return;
          if (session === battleSession) session = null;
          pendingBattleResult = result;
          // With a live scene, wait for it to finish animating the final KO
          // ('atqueueend' → reportBattleScenePlayback(true)); otherwise fall back to
          // the visual-event queue draining.
          const finishNow = sceneGateActive ? sceneIdle : get().visualEvents.length === 0;
          if (finishNow) finishBattle(result);
        },
      };
      const battleSession = (config.sessionFactory ?? createLocalAiSession)({
        playerParty,
        opponentParty: enemyParty,
        level,
        callbacks,
        difficulty,
      });
      session = battleSession;
      startTimer = window.setTimeout(() => {
        startTimer = null;
        if (session === battleSession) battleSession.start();
      }, 900);
    },

    chooseMove: slot => {
      const decision = get().decision;
      if (!session) {
        set({ error: 'The battle session disconnected. Reload to reconnect.' });
        return;
      }
      if (!canSubmitMove(decision, slot)) {
        set({ error: 'That move is no longer available. Choose another action.' });
        return;
      }
      set({ decision: emptyDecision, status: 'animating', error: null });
      session.chooseMove(slot);
    },

    chooseSwitch: slot => {
      const decision = get().decision;
      if (!session) {
        set({ error: 'The battle session disconnected. Reload to reconnect.' });
        return;
      }
      if (!canSubmitSwitch(decision, slot)) {
        set({ error: 'That switch is no longer available. Choose another action.' });
        return;
      }
      set({ decision: emptyDecision, status: 'animating', error: null });
      session.chooseSwitch(slot);
    },

    consumeVisualEvent: id => {
      let completedResult: BattleResult | null = null;
      set(current => {
        const visualEvents = current.visualEvents.filter(event => event.id !== id);
        if (visualEvents.length === 0 && pendingBattleResult) completedResult = pendingBattleResult;
        return { visualEvents };
      });
      if (completedResult) finishBattle(completedResult);
    },

    resetBattle: () => {
      session?.dispose();
      if (startTimer !== null) window.clearTimeout(startTimer);
      startTimer = null;
      session = null;
      onBattleEnd = null;
      lastBattleConfig = null;
      pendingBattleResult = null;
      bufferedDecision = null;
      sceneGateActive = false;
      sceneIdle = true;
      resetBattleProtocol();
      set({
        snapshot: null,
        decision: emptyDecision,
        battleLog: [],
        visualEvents: [],
        status: 'idle',
        error: null,
      });
    },

    retryBattle: () => {
      const config = lastBattleConfig;
      if (get().status !== 'error' || !config) return;
      get().startBattle(config);
    },

    forfeitBattle: () => {
      const config = lastBattleConfig;
      if (!config || !onBattleEnd) return;
      session?.forfeit?.();
      session?.dispose();
      if (startTimer !== null) window.clearTimeout(startTimer);
      startTimer = null;
      session = null;
      sceneGateActive = false;
      sceneIdle = true;
      bufferedDecision = null;
      pendingBattleResult = {
        winner: 'opponent',
        faintedPlayerSpecies: config.playerParty.map(pokemon => pokemon.species),
      };
      finishBattle(pendingBattleResult);
    },

    attachBattleScene: () => {
      sceneGateActive = true;
      // The scene is about to (re)play its buffered opening, so treat it as busy and
      // hold any decision that already arrived until the opening finishes animating.
      sceneIdle = false;
      const current = get().decision;
      bufferedDecision = current.kind === 'wait' ? null : current;
      if (bufferedDecision) set({ decision: emptyDecision, status: 'animating' });
    },

    detachBattleScene: () => {
      if (!sceneGateActive) return;
      sceneGateActive = false;
      sceneIdle = true;
      releaseBufferedDecision();
      if (pendingBattleResult && get().visualEvents.length === 0) finishBattle(pendingBattleResult);
    },

    reportBattleScenePlayback: idle => {
      if (!sceneGateActive) return;
      sceneIdle = idle;
      if (!idle) return;
      // Queue drained: the on-screen animation has caught up — release the held
      // turn decision and, if the battle already ended, finish it now.
      releaseBufferedDecision();
      if (pendingBattleResult) finishBattle(pendingBattleResult);
    },
  };
});
