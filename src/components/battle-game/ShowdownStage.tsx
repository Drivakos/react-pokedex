import { useEffect, useRef, useState } from 'react';
import { subscribeBattleProtocol, useBattleRunStore } from '../../store/battleRunStore';
import { feedShowdownProtocol, loadShowdownClient, type ShowdownGlobals } from './showdown-client';
import './showdown-stage.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

// The Showdown BattleScene renders into a fixed 640x360 frame.
const SCENE_W = 640;
const SCENE_H = 360;

/**
 * Renders the Battle Run arena with Pokémon Showdown's real BattleScene, driven live
 * by the worker's protocol stream (via the store's replay-on-subscribe feed).
 *
 * Drive model: the canonical *live* pattern the real Showdown client uses. We create
 * one un-paused Battle up front, then feed every protocol line through battle.add().
 * add() self-resumes playback whenever the queue was drained, so the scene builds its
 * sprites from the opening (|player|/|switch| …) the instant those lines arrive and
 * animates each turn as it streams — no replay/pause/buffer heuristics (those raced
 * the async sprite preload and left the field grey). The store replays the buffered
 * opening on subscribe, so a freshly-created Battle never misses the start.
 *
 * The Showdown play-by-play log renders into `logEl`, a DOM node owned by
 * BattleRunGame so it can live in a full-height right column beside the moves UI
 * rather than inside the arena box.
 */
export function ShowdownStage({
  onLoadError,
  logEl,
}: {
  onLoadError?: () => void;
  logEl: HTMLElement | null;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const battleRef = useRef<Any>(null);
  const globalsRef = useRef<ShowdownGlobals | null>(null);

  const [clientReady, setClientReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const battleNonce = useBattleRunStore(state => state.battleNonce);

  // Load the Showdown client bundle once, for the component's lifetime.
  useEffect(() => {
    let disposed = false;
    loadShowdownClient()
      .then(globals => {
        if (disposed) return;
        globalsRef.current = globals;
        setClientReady(true);
      })
      .catch(() => {
        if (disposed) return;
        setFailed(true);
        onLoadError?.();
      });
    return () => {
      disposed = true;
    };
  }, [onLoadError]);

  // Create a fresh Battle for each run (battleNonce) once the client is ready, and
  // stream the protocol into it live. Re-runs on battleNonce so a new battle rebuilds
  // the scene from scratch; the subscription replays the new opening on (re)subscribe.
  useEffect(() => {
    if (!clientReady || failed) return;
    const globals = globalsRef.current;
    if (!globals || !frameRef.current || !logEl) return;

    const store = useBattleRunStore.getState();
    // The Battle constructor (and destroy) fire the subscription synchronously with
    // an empty queue; `live` suppresses those so only real playback drives the gate.
    let live = false;
    // On (re)subscribe the store replays the whole buffered backlog synchronously.
    // The opening's team-preview chunk is all instant lines, so the queue drains
    // between it and the switch-in chunk — a transient 'atqueueend' that would
    // falsely read as "caught up". Suppress reports until the backlog is fully in,
    // then evaluate the real queue state once.
    let replaying = false;
    // Report whether the scene's animation queue is drained so the store can hold
    // the next decision / battle result until the on-screen animation catches up.
    const reportIdle = (idle: boolean) => {
      if (live && !replaying) store.reportBattleScenePlayback(idle);
    };

    store.attachBattleScene();
    const battle = new globals.Battle({
      id: 'battle-run',
      $frame: globals.jQuery(frameRef.current),
      $logFrame: globals.jQuery(logEl),
      paused: false,
      autoresize: false, // we scale to the arena container ourselves, not the window
      // 'atqueueend'/'paused' → the queue has drained (idle); 'playing'/'turn' → the
      // scene is still animating. 'ended'/'callback'/'error' don't change idleness.
      subscription: (state: string) => {
        if (state === 'atqueueend' || state === 'paused') reportIdle(true);
        else if (state === 'playing' || state === 'turn') reportIdle(false);
      },
    });
    battle.setMute?.(true);
    battleRef.current = battle;
    live = true; // construction finished — playback signals are now meaningful

    replaying = true;
    const unsubscribe = subscribeBattleProtocol(chunk => {
      if (battleRef.current !== battle) return;
      feedShowdownProtocol(battle, chunk);
      // The subscription's 'playing' signal doesn't fire on add(); read the queue
      // state directly so a freshly-fed turn registers as busy before its decision
      // is processed in the same synchronous batch. (No-op while replaying.)
      reportIdle(Boolean(battle.atQueueEnd));
    });
    // Backlog fully fed: now report the real queue state (busy if the opening's
    // switch-ins are still animating, so the turn-1 decision stays held).
    replaying = false;
    reportIdle(Boolean(battle.atQueueEnd));

    return () => {
      live = false;
      unsubscribe();
      store.detachBattleScene();
      try {
        battle.destroy?.();
      } catch {
        /* noop */
      }
      if (battleRef.current === battle) battleRef.current = null;
    };
  }, [clientReady, failed, battleNonce, logEl]);

  // Scale the fixed 640x360 frame to fit the arena region (contain: no cropping of
  // HP bars or sprites), re-measuring whenever the container resizes.
  useEffect(() => {
    if (!clientReady || failed) return;
    const arena = arenaRef.current;
    const frame = frameRef.current;
    if (!arena || !frame) return;

    const fit = () => {
      const { width, height } = arena.getBoundingClientRect();
      if (!width || !height) return;
      const scale = Math.min(width / SCENE_W, height / SCENE_H);
      frame.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(arena);
    return () => observer.disconnect();
  }, [clientReady, failed, battleNonce]);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-300">
        Battle renderer unavailable.
      </div>
    );
  }

  return (
    <div className="showdown-stage absolute inset-0">
      <div ref={arenaRef} className="showdown-arena">
        <div ref={frameRef} className="battle" />
      </div>
    </div>
  );
}
