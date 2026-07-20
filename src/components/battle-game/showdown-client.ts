/**
 * Loads Pokémon Showdown's real client bundle (jQuery + battledata + battle.js +
 * BattleScene + move animations) once, and repoints its asset resolver at the
 * same-origin /ps proxy (their CDN 503s cross-origin hotlinks, and absolute
 * cross-origin URLs are blocked by our CSP). Client-side only, no server. Used to
 * render genuine move animations for Battle Run.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export interface ShowdownGlobals {
  Battle: Any;
  jQuery: Any;
}

const PS = '/ps';

// The client resolves every asset (sprites, fx, backdrops, icons) from
// `Config.routes.client`. battledata.js bakes `Dex.resourcePrefix`/`Dex.fxPrefix`
// from it the moment it loads, and graphics.js bakes every `BattleEffects[*].url`
// (move animation sprite) from `Dex.fxPrefix` the moment IT loads. So the override
// MUST land after config.js (which defines Config.routes) but BEFORE battledata.js
// and graphics.js — otherwise the fx URLs bake against the CDN host and get
// CSP-blocked. We apply it the instant the config script resolves.
const CONFIG_SCRIPT = `${PS}/config/config.js`;

const SCRIPTS = [
  `${PS}/js/lib/ps-polyfill.js`,
  `${PS}/js/lib/preact.min.js`,
  CONFIG_SCRIPT,
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

// Point the whole client at the same-origin proxy. `routes.client` is a bare
// host[:port]/path (no scheme) — the client prepends `//` and derives every asset
// prefix from it. Setting it here, before the prefix-baking scripts run, is what
// makes sprites AND move fx load through /ps instead of the CDN.
function applyProxyRoute(): void {
  const w = window as Any;
  const proxyHost = `${window.location.host}/ps`;
  if (w.Config) {
    w.Config.routes = w.Config.routes || {};
    w.Config.routes.client = proxyHost;
  }
}

export function loadShowdownClient(): Promise<ShowdownGlobals> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    STYLES.forEach(loadStyle);
    for (const src of SCRIPTS) {
      await loadScript(src);
      // The instant config.js has run, repoint routes.client — before battledata.js
      // and graphics.js read it to bake resourcePrefix/fxPrefix/BattleEffects.
      if (src === CONFIG_SCRIPT) applyProxyRoute();
    }

    const w = window as Any;
    if (!w.Battle || !w.jQuery) throw new Error('Showdown client failed to initialise');

    // Belt-and-suspenders: re-assert the route + derived prefixes in case config.js
    // loaded from cache in a different order. These are plain writable properties.
    applyProxyRoute();
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

// Feed a raw protocol chunk into a live Battle, skipping:
//  - side-channel lines (choice requests / errors) that aren't renderable events;
//  - the team-preview block (|clearpoke, |poke|…, |teampreview). gen9customgame
//    always opens with team preview, which makes the scene flash every party member
//    for a beat before the battle starts. We drop it so the scene goes straight to
//    the lead switch-ins; the |teamsize lines that follow keep the ball indicators
//    correct. (The worker's own client still receives the full protocol, so battle
//    state is unaffected — this only shapes what the scene renders.)
export function feedShowdownProtocol(battle: Any, chunk: string): void {
  for (const line of chunk.split('\n')) {
    if (!line || line.startsWith('|request') || line.startsWith('|error')) continue;
    if (line.startsWith('|clearpoke') || line.startsWith('|poke|') || line.startsWith('|teampreview')) continue;
    battle.add(line);
  }
}
