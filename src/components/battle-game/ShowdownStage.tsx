import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeBattleProtocol, useBattleRunStore } from '../../store/battleRunStore';
import { feedShowdownProtocol, loadShowdownClient, type ShowdownGlobals } from './showdown-client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/**
 * Renders the Battle Run arena with Pokémon Showdown's real BattleScene, driven live
 * by the worker's protocol stream (via the store's replay-on-subscribe feed).
 *
 * The Battle is created by seeding its constructor with the buffered opening log
 * (|player|/|start|/|switch| …) — the well-tested replay path that builds sprites —
 * and only genuinely-live turns are add()-ed afterwards. Creation is triggered
 * deterministically once the opening completes (first |turn|/|win|/|tie|) rather than
 * on a timer, so the whole opening is always present before we build the scene.
 */

// The opening (players, team sizes, switch-ins) is complete once a turn/end marker
// appears — that's when it's safe to seed the Battle with the buffered log.
function openingComplete(chunks: string[]): boolean {
  return chunks.some(chunk =>
    chunk.split('\n').some(line =>
      line.startsWith('|turn') || line.startsWith('|win') || line.startsWith('|tie')));
}

export function ShowdownStage({ onLoadError }: { onLoadError?: () => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const battleRef = useRef<Any>(null);
  const globalsRef = useRef<ShowdownGlobals | null>(null);
  const bufferRef = useRef<string[]>([]);
  const fallbackTimer = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);

  const battleNonce = useBattleRunStore(state => state.battleNonce);

  const clearFallback = useCallback(() => {
    if (fallbackTimer.current !== null) {
      window.clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
  }, []);

  // Build the Battle from the buffered opening log.
  const createBattle = useCallback(() => {
    const globals = globalsRef.current;
    if (!globals || !frameRef.current || battleRef.current) return;
    const logLines = bufferRef.current
      .flatMap(chunk => chunk.split('\n'))
      .filter(line => line && !line.startsWith('|request') && !line.startsWith('|error'));
    if (logLines.length === 0) return;

    clearFallback();
    // isReplay + paused, then play() is the config that reliably preloads assets and
    // builds the scene before animating (paused:false auto-plays before preload and
    // stalls on a grey field until a live add() wakes it up).
    const battle = new globals.Battle({
      id: 'battle-run',
      $frame: globals.jQuery(frameRef.current),
      $logFrame: globals.jQuery(logRef.current),
      log: logLines,
      isReplay: true,
      paused: true,
      autoresize: true,
    });
    battle.setMute?.(true);
    battleRef.current = battle;
    battle.play?.();
    bufferRef.current = [];
  }, [clearFallback]);

  // Create as soon as the opening is complete; a safety net covers the rare case
  // where no turn/end marker ever arrives.
  const maybeCreate = useCallback(() => {
    if (battleRef.current || !globalsRef.current || bufferRef.current.length === 0) return;
    if (openingComplete(bufferRef.current)) {
      createBattle();
    } else if (fallbackTimer.current === null) {
      fallbackTimer.current = window.setTimeout(() => {
        fallbackTimer.current = null;
        createBattle();
      }, 800);
    }
  }, [createBattle]);

  const destroyBattle = useCallback(() => {
    clearFallback();
    try {
      battleRef.current?.destroy?.();
    } catch {
      /* noop */
    }
    battleRef.current = null;
    bufferRef.current = [];
  }, [clearFallback]);

  // Subscribe to the protocol feed and load the client once, for the stage's lifetime.
  useEffect(() => {
    let disposed = false;
    const unsubscribe = subscribeBattleProtocol(chunk => {
      if (disposed) return;
      if (battleRef.current) {
        feedShowdownProtocol(battleRef.current, chunk);
        battleRef.current.play?.(); // continue playing the newly appended turn
      } else {
        bufferRef.current.push(chunk);
        maybeCreate();
      }
    });

    loadShowdownClient()
      .then(globals => {
        if (disposed) return;
        globalsRef.current = globals;
        maybeCreate();
      })
      .catch(() => {
        if (disposed) return;
        setFailed(true);
        onLoadError?.();
      });

    return () => {
      disposed = true;
      unsubscribe();
      destroyBattle();
    };
  }, [maybeCreate, destroyBattle, onLoadError]);

  // A new battle resets the scene; the next protocol chunks rebuild it from scratch.
  useEffect(() => {
    destroyBattle();
    maybeCreate();
  }, [battleNonce, destroyBattle, maybeCreate]);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-300">
        Battle renderer unavailable.
      </div>
    );
  }

  return (
    <div className="showdown-stage absolute inset-0 flex items-center justify-center">
      <div ref={frameRef} className="battle" />
      <div ref={logRef} className="battle-log" style={{ display: 'none' }} />
    </div>
  );
}
