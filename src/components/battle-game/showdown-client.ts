/**
 * Loads Pokémon Showdown's real client bundle (jQuery + battledata + battle.js +
 * BattleScene + move animations) once, and repoints its asset resolver at the
 * same-origin /ps proxy (their CDN 503s cross-origin hotlinks). Client-side only,
 * no server. Used to render genuine move animations for Battle Run.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export interface ShowdownGlobals {
  Battle: Any;
  jQuery: Any;
}

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

let loadPromise: Promise<ShowdownGlobals> | null = null;

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

export function loadShowdownClient(): Promise<ShowdownGlobals> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    STYLES.forEach(loadStyle);
    for (const src of SCRIPTS) await loadScript(src);

    const w = window as Any;
    if (!w.Battle || !w.jQuery) throw new Error('Showdown client failed to initialise');

    // Route sprites/fx/icons through the same-origin proxy.
    if (w.Config?.routes) w.Config.routes.client = `${window.location.host}/ps`;
    if (w.Dex) {
      w.Dex.resourcePrefix = `${window.location.origin}/ps/`;
      w.Dex.fxPrefix = `${window.location.origin}/ps/fx/`;
    }
    // Hard-disable the sound module: browser autoplay policy makes audio.play()
    // reject, and those rejections fire from inside animSummon/animFaint, which can
    // abort sprite creation. No-op every entry point so animations run cleanly.
    if (w.BattleSound) {
      w.BattleSound.setMute?.(true);
      w.BattleSound.muted = true;
      const noop = () => undefined;
      w.BattleSound.playEffect = noop;
      w.BattleSound.playSound = noop;
      w.BattleSound.loadEffect = noop;
      w.BattleSound.loadBgm = () => ({ play: noop, stop: noop, resume: noop, pause: noop, setVolume: noop });
      w.BattleSound.playBgm = noop;
      w.BattleSound.setBgm = noop;
    }

    return { Battle: w.Battle, jQuery: w.jQuery };
  })();
  return loadPromise;
}

// Feed a raw protocol chunk into a live Battle, skipping side-channel lines
// (choice requests / errors) that aren't renderable battle events.
export function feedShowdownProtocol(battle: Any, chunk: string): void {
  for (const line of chunk.split('\n')) {
    if (!line || line.startsWith('|request') || line.startsWith('|error')) continue;
    battle.add(line);
  }
}
