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

// Battle audio (looping BGM + Pokémon cries). Volumes are 0–100 amplitude, read
// directly by BattleSound as volume/100. Music sits under the cries so a long run
// doesn't get fatiguing. Mute state is persisted; sound is on by default.
const MUTE_KEY = 'battle-run-muted';
const BGM_VOLUME = 22;
const EFFECT_VOLUME = 52;

function readMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Current persisted mute preference (defaults to unmuted). */
export function isShowdownMuted(): boolean {
  return readMuted();
}

/**
 * Persist the mute preference and apply it live. BattleSound.setMute pauses/resumes
 * the current BGM, so toggling mid-battle takes effect immediately. Safe to call
 * before the client bundle has loaded — the value is persisted and re-applied then.
 */
export function setShowdownMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // A restricted browser session can still toggle sound for the current battle.
  }
  (window as Any).BattleSound?.setMute?.(muted);
}

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

    // Enable Showdown's audio: a looping battle theme plus Pokémon cries on
    // switch-in / faint. Cries and BGM resolve through Config.routes.client, so they
    // stream from the same-origin /ps proxy like every other asset (no CSP change).
    // We wrap playSound to swallow audio.play() rejections — the browser autoplay
    // policy can reject a cry, and that unhandled rejection was what previously fired
    // from inside animSummon/animFaint and aborted sprite creation. With it caught,
    // a blocked sound is harmless. Mute state comes from the persisted preference.
    if (w.BattleSound) {
      w.BattleSound.bgmVolume = BGM_VOLUME;
      w.BattleSound.effectVolume = EFFECT_VOLUME;
      // BattleSound.getSound hardcodes `https://` + Config.routes.client, which
      // fails on the http dev server (and needlessly ignores the page scheme). Build
      // the URL from the page origin instead — same-origin /ps, correct scheme in
      // both dev and prod — mirroring how sprites resolve via Dex.resourcePrefix.
      const audioPrefix = `${window.location.origin}/ps/`;
      w.BattleSound.getSound = function getSound(this: Any, url: string) {
        if (!window.HTMLAudioElement) return undefined;
        if (this.soundCache[url]) return this.soundCache[url];
        try {
          const sound = document.createElement('audio');
          sound.src = `${audioPrefix}${url}`;
          sound.volume = this.effectVolume / 100;
          this.soundCache[url] = sound;
          return sound;
        } catch {
          return undefined;
        }
      };
      w.BattleSound.playSound = function playSound(this: Any, url: string, volume: number) {
        if (!volume) return;
        const effect = this.getSound(url);
        if (!effect) return;
        effect.volume = volume / 100;
        const played = effect.play?.();
        if (played && typeof played.catch === 'function') played.catch(() => undefined);
      };
      w.BattleSound.setMute(readMuted());
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
