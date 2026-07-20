import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeBattleProtocol, useBattleRunStore } from '../../store/battleRunStore';
import { feedShowdownProtocol, loadShowdownClient, type ShowdownGlobals } from './showdown-client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/**
 * Renders the Battle Run arena with Pokémon Showdown's real BattleScene, driven live
 * by the worker's protocol stream (via the store's replay-on-subscribe feed).
 *
 * The battle is created by seeding its constructor with the buffered opening log
 * (|player|/|start|/|switch| …) — the well-tested replay path that builds sprites —
 * and only genuinely-live turns are add()-ed afterwards. Falls back via onLoadError
 * if the client bundle can't load.
 */
export function ShowdownStage({ onLoadError }: { onLoadError?: () => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const battleRef = useRef<Any>(null);
  const globalsRef = useRef<ShowdownGlobals | null>(null);
  const bufferRef = useRef<string[]>([]);
  const createTimer = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);

  const battleNonce = useBattleRunStore(state => state.battleNonce);

  // Build the Battle from whatever protocol has buffered so far (the opening burst).
  const createBattle = useCallback(() => {
    const globals = globalsRef.current;
    if (!globals || !frameRef.current || battleRef.current) return;
    const logLines = bufferRef.current
      .flatMap(chunk => chunk.split('\n'))
      .filter(line => line && !line.startsWith('|request') && !line.startsWith('|error'));
    if (logLines.length === 0) return;

    const battle = new globals.Battle({
      id: 'battle-run',
      $frame: globals.jQuery(frameRef.current),
      $logFrame: globals.jQuery(logRef.current),
      log: logLines,
      paused: false,
      autoresize: true,
    });
    battle.setMute?.(true);
    battle.play?.();
    battleRef.current = battle;
    bufferRef.current = [];
  }, []);

  // Debounce creation so the whole opening burst is captured before we seed the log.
  const scheduleCreate = useCallback(() => {
    if (battleRef.current || createTimer.current !== null) return;
    createTimer.current = window.setTimeout(() => {
      createTimer.current = null;
      createBattle();
    }, 80);
  }, [createBattle]);

  const destroyBattle = useCallback(() => {
    if (createTimer.current !== null) {
      window.clearTimeout(createTimer.current);
      createTimer.current = null;
    }
    try {
      battleRef.current?.destroy?.();
    } catch {
      /* noop */
    }
    battleRef.current = null;
    bufferRef.current = [];
  }, []);

  // Subscribe to the protocol feed and load the client once, for the stage's lifetime.
  useEffect(() => {
    let disposed = false;
    const unsubscribe = subscribeBattleProtocol(chunk => {
      if (disposed) return;
      if (battleRef.current) {
        feedShowdownProtocol(battleRef.current, chunk);
      } else {
        bufferRef.current.push(chunk);
        if (globalsRef.current) scheduleCreate();
      }
    });

    loadShowdownClient()
      .then(globals => {
        if (disposed) return;
        globalsRef.current = globals;
        if (bufferRef.current.length) scheduleCreate();
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
  }, [scheduleCreate, destroyBattle, onLoadError]);

  // A new battle resets the scene; the next protocol chunks rebuild it from scratch.
  useEffect(() => {
    destroyBattle();
    if (globalsRef.current && bufferRef.current.length) scheduleCreate();
  }, [battleNonce, destroyBattle, scheduleCreate]);

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
