import { useEffect, useRef, useState } from 'react';
import { createRunPokemon } from '../../services/battle-content.service';
import { ShowdownBattleWorkerSession } from '../../services/showdown-battle-worker.service';

/**
 * THROWAWAY PROTOTYPE — Milestone 1 of the Showdown-scene productionization spike.
 *
 * Runs a REAL Battle Run battle in the worker (@pkmn/sim) and feeds its raw protocol
 * stream into Pokémon Showdown's own BattleScene, which renders the genuine move
 * animations client-side (no server). Moves are auto-chosen so it plays hands-free.
 *
 * Isolated from the live game. Loads the Showdown client through the dev /ps proxy
 * (their CDN 503s cross-origin hotlinks). Delete once the go/no-go call is made.
 */

const PS = '/ps';

const SCRIPTS = [
  `${PS}/js/lib/ps-polyfill.js`,
  `${PS}/js/lib/preact.min.js`,
  `${PS}/config/config.js`,
  `${PS}/js/lib/jquery-1.11.0.min.js`,
  `${PS}/js/lib/html-sanitizer-minified.js`,
  `${PS}/js/battle-sound.js`,
  `${PS}/js/battledata.js`,
  `${PS}/data/pokedex-mini.js`,
  `${PS}/data/graphics.js`,
  `${PS}/data/pokedex.js`,
  `${PS}/data/moves.js`,
  `${PS}/data/abilities.js`,
  `${PS}/data/items.js`,
  `${PS}/js/battle-tooltips.js`,
  `${PS}/js/battle.js`,
];

const STYLES = [`${PS}/style/font-awesome.css`, `${PS}/style/battle.css`];

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-ps="${src}"]`)) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.async = false; // preserve execution order
    el.dataset.ps = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

function loadStyle(href: string): void {
  if (document.querySelector(`link[data-ps="${href}"]`)) return;
  const el = document.createElement('link');
  el.rel = 'stylesheet';
  el.href = href;
  el.dataset.ps = href;
  document.head.appendChild(el);
}

// Feed a raw protocol chunk into a live Showdown Battle, skipping the lines that are
// side channels (choice requests / errors) rather than renderable battle events.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function feedProtocol(battle: any, chunk: string): void {
  for (const line of chunk.split('\n')) {
    if (!line || line.startsWith('|request') || line.startsWith('|error')) continue;
    battle.add(line);
  }
}

export default function BattleAnimLab() {
  const frameRef = useRef<HTMLDivElement>(null);
  const logFrameRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Loading Showdown client…');

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let battle: any = null;
    let session: ShowdownBattleWorkerSession | null = null;

    (async () => {
      try {
        STYLES.forEach(loadStyle);
        for (const src of SCRIPTS) {
          await loadScript(src);
          if (cancelled) return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        if (!w.Battle || !w.jQuery) throw new Error('Showdown globals missing after load');

        // Repoint the client's asset resolver at the same-origin proxy.
        if (w.Config?.routes) w.Config.routes.client = `${window.location.host}/ps`;
        if (w.Dex) {
          w.Dex.resourcePrefix = `${window.location.origin}/ps/`;
          w.Dex.fxPrefix = `${window.location.origin}/ps/fx/`;
        }
        w.BattleSound?.setMute?.(true);

        // Live battle (no log) — we stream protocol into it as the worker produces it.
        battle = new w.Battle({
          id: 'anim-lab',
          $frame: w.jQuery(frameRef.current),
          $logFrame: w.jQuery(logFrameRef.current),
          paused: false,
          autoresize: true,
        });
        w.battle = battle;

        const player = ['Pikachu', 'Garchomp', 'Dragonite'].map(s => createRunPokemon(s, 10));
        const opponent = ['Charizard', 'Blastoise', 'Gengar'].map(s => createRunPokemon(s, 10));

        session = new ShowdownBattleWorkerSession(player, opponent, 10, {
          onSnapshot: () => undefined,
          onLog: () => undefined,
          onVisual: () => undefined,
          onError: message => setStatus(`Error: ${message}`),
          onEnd: result => setStatus(`Finished — winner: ${result.winner}`),
          onProtocol: chunk => {
            if (!cancelled && battle) feedProtocol(battle, chunk);
          },
          onDecision: decision => {
            if (!session) return;
            if (decision.kind === 'move' && decision.moves.length) {
              const move = decision.moves.find(m => !m.disabled) ?? decision.moves[0];
              session.chooseMove(move.slot);
            } else if (decision.kind === 'switch' && decision.switches.length) {
              session.chooseSwitch(decision.switches[0].slot);
            }
          },
        });
        session.start();
        setStatus('Live battle streaming into Showdown BattleScene (moves auto-chosen).');
      } catch (error) {
        setStatus(`Error: ${(error as Error).message}`);
      }
    })();

    return () => {
      cancelled = true;
      try {
        session?.dispose();
        battle?.destroy?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: 24 }}>
      <h1 style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Battle animation lab (prototype)</h1>
      <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>{status}</p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div ref={frameRef} className="battle" />
        <div ref={logFrameRef} className="battle-log" style={{ maxWidth: 320 }} />
      </div>
    </div>
  );
}
