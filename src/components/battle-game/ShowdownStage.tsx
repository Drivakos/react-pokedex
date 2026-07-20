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

    const battle = new globals.Battle({
      id: 'battle-run',
      $frame: globals.jQuery(frameRef.current),
      $logFrame: globals.jQuery(logEl),
      paused: false,
      autoresize: false, // we scale to the arena container ourselves, not the window
    });
    battle.setMute?.(true);
    battleRef.current = battle;

    const unsubscribe = subscribeBattleProtocol(chunk => {
      if (battleRef.current !== battle) return;
      feedShowdownProtocol(battle, chunk);
    });

    return () => {
      unsubscribe();
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
