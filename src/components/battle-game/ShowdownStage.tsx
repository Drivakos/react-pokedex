import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeBattleProtocol, useBattleRunStore } from '../../store/battleRunStore';
import { feedShowdownProtocol, loadShowdownClient, type ShowdownGlobals } from './showdown-client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/**
 * Renders the Battle Run arena using Pokémon Showdown's real BattleScene, driven
 * live by the worker's protocol stream (via the store's protocol feed). Falls back
 * to a message if the client bundle can't load — the caller keeps the stylized fx
 * arena available for that case.
 */
export function ShowdownStage({ onLoadError }: { onLoadError?: () => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const battleRef = useRef<Any>(null);
  const globalsRef = useRef<ShowdownGlobals | null>(null);
  const bufferRef = useRef<string[]>([]);
  const [failed, setFailed] = useState(false);

  const battleNonce = useBattleRunStore(state => state.battleNonce);

  // Create (or recreate) a fresh Battle bound to the frame, flushing buffered protocol.
  const createBattle = useCallback(() => {
    const globals = globalsRef.current;
    if (!globals || !frameRef.current) return;
    try {
      battleRef.current?.destroy?.();
    } catch {
      /* noop */
    }
    const battle = new globals.Battle({
      id: 'battle-run',
      $frame: globals.jQuery(frameRef.current),
      $logFrame: globals.jQuery(logRef.current),
      paused: false,
      autoresize: true,
    });
    battle.setMute?.(true); // suppress BGM/effect audio (autoplay is blocked anyway)
    battleRef.current = battle;
    const buffered = bufferRef.current;
    bufferRef.current = [];
    buffered.forEach(chunk => feedShowdownProtocol(battle, chunk));
  }, []);

  // Load the client once and subscribe to the protocol feed for the stage's lifetime.
  useEffect(() => {
    let disposed = false;
    const unsubscribe = subscribeBattleProtocol(chunk => {
      if (battleRef.current) feedShowdownProtocol(battleRef.current, chunk);
      else bufferRef.current.push(chunk);
    });

    loadShowdownClient()
      .then(globals => {
        if (disposed) return;
        globalsRef.current = globals;
        createBattle();
      })
      .catch(() => {
        if (disposed) return;
        setFailed(true);
        onLoadError?.();
      });

    return () => {
      disposed = true;
      unsubscribe();
      try {
        battleRef.current?.destroy?.();
      } catch {
        /* noop */
      }
      battleRef.current = null;
    };
  }, [createBattle, onLoadError]);

  // Reset the scene whenever a new battle begins.
  useEffect(() => {
    bufferRef.current = [];
    if (globalsRef.current) createBattle();
  }, [battleNonce, createBattle]);

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
