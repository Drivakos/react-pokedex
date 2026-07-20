import type { BattleVisualEvent } from '../../types/battle-run';

export type MoveEffectKind =
  | 'projectile'
  | 'lightning'
  | 'impact'
  | 'slash'
  | 'bite'
  | 'scatter'
  | 'sound'
  | 'web';

export interface MoveAnimationRecipe {
  kind: MoveEffectKind;
  assets: string[];
  accent: string;
}

const FX_ROOT = '/images/battle-fx';

const FX_ASSET_NAMES = [
  'angry',
  'blackwisp',
  'bluefireball',
  'bone',
  'bottombite',
  'electroball',
  'energyball',
  'feather',
  'fireball',
  'fist',
  'flareball',
  'foot',
  'gear',
  'heart',
  'iceball',
  'impact',
  'leaf1',
  'leaf2',
  'leftclaw',
  'leftslash',
  'lightning',
  'mistball',
  'mudwisp',
  'petal',
  'poisonwisp',
  'rainbow',
  'rightclaw',
  'rightslash',
  'rock1',
  'rock2',
  'rock3',
  'shadowball',
  'shine',
  'sound',
  'sword',
  'topbite',
  'waterwisp',
  'web',
  'wisp',
] as const;

const asset = (name: string) => `${FX_ROOT}/${name}.png`;
const fxAssets = FX_ASSET_NAMES.map(asset);
let preloadedFxImages: HTMLImageElement[] | null = null;

export function preloadMoveAnimationAssets(): void {
  if (typeof Image === 'undefined' || preloadedFxImages) return;

  preloadedFxImages = fxAssets.map(src => {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    void image.decode().catch(() => undefined);
    return image;
  });
}

const recipe = (kind: MoveEffectKind, accent: string, ...assets: string[]): MoveAnimationRecipe => ({
  kind,
  accent,
  assets: assets.map(asset),
});

const exactRecipes: Record<string, MoveAnimationRecipe> = {
  aquajet: recipe('projectile', '#38bdf8', 'waterwisp'),
  aurasphere: recipe('projectile', '#60a5fa', 'bluefireball'),
  blizzard: recipe('scatter', '#a5f3fc', 'iceball'),
  boomburst: recipe('sound', '#e2e8f0', 'sound'),
  crunch: recipe('bite', '#475569', 'topbite', 'bottombite'),
  dazzlinggleam: recipe('impact', '#f9a8d4', 'rainbow'),
  doubleedge: recipe('impact', '#d6d3d1', 'impact'),
  earthpower: recipe('scatter', '#b45309', 'mudwisp', 'rock1'),
  electroball: recipe('projectile', '#fde047', 'electroball'),
  energyball: recipe('projectile', '#4ade80', 'energyball'),
  flareblitz: recipe('projectile', '#fb923c', 'flareball'),
  flamethrower: recipe('projectile', '#f97316', 'fireball'),
  flashcannon: recipe('projectile', '#cbd5e1', 'gear'),
  heatwave: recipe('impact', '#fb923c', 'flareball'),
  hydropump: recipe('projectile', '#38bdf8', 'waterwisp'),
  icebeam: recipe('projectile', '#67e8f9', 'iceball'),
  leafstorm: recipe('scatter', '#4ade80', 'leaf1', 'leaf2'),
  moonblast: recipe('projectile', '#f9a8d4', 'mistball'),
  petalblizzard: recipe('scatter', '#f9a8d4', 'petal'),
  poisonjab: recipe('impact', '#c084fc', 'poisonwisp'),
  psychic: recipe('projectile', '#f472b6', 'mistball'),
  psychicfangs: recipe('bite', '#f472b6', 'topbite', 'bottombite'),
  rockslide: recipe('scatter', '#a16207', 'rock1', 'rock2', 'rock3'),
  seedbomb: recipe('scatter', '#65a30d', 'leaf1', 'leaf2'),
  shadowball: recipe('projectile', '#7e22ce', 'shadowball'),
  stoneedge: recipe('scatter', '#a16207', 'rock1', 'rock2', 'rock3'),
  surf: recipe('projectile', '#2563eb', 'waterwisp'),
  thunder: recipe('lightning', '#fde047', 'lightning'),
  thunderbolt: recipe('lightning', '#fde047', 'lightning'),
  wildcharge: recipe('lightning', '#facc15', 'electroball', 'lightning'),
  woodhammer: recipe('scatter', '#65a30d', 'leaf1', 'leaf2', 'impact'),
  // Blades and claws — sword/claw art instead of the generic slash streaks.
  sacredsword: recipe('slash', '#e2e8f0', 'sword'),
  nightslash: recipe('slash', '#7e22ce', 'sword'),
  psychocut: recipe('slash', '#f472b6', 'sword'),
  leafblade: recipe('slash', '#4ade80', 'sword'),
  solarblade: recipe('slash', '#a3e635', 'sword'),
  xscissor: recipe('slash', '#f87171', 'sword', 'sword'),
  dragonclaw: recipe('slash', '#c084fc', 'leftclaw', 'rightclaw'),
  shadowclaw: recipe('slash', '#7e22ce', 'leftclaw', 'rightclaw'),
  metalclaw: recipe('slash', '#cbd5e1', 'leftclaw', 'rightclaw'),
  crushclaw: recipe('slash', '#fca5a5', 'leftclaw', 'rightclaw'),
  // Steel — spinning gear rather than a plain flash.
  ironhead: recipe('impact', '#cbd5e1', 'gear'),
  meteormash: recipe('impact', '#e2e8f0', 'gear', 'fist'),
  geargrind: recipe('scatter', '#94a3b8', 'gear', 'gear'),
  // Dark — its own black wisp so it reads apart from Ghost's shadow ball.
  darkpulse: recipe('projectile', '#1e293b', 'blackwisp'),
  foulplay: recipe('projectile', '#334155', 'blackwisp'),
  nightdaze: recipe('projectile', '#1e293b', 'blackwisp'),
  // Ground / mud.
  mudshot: recipe('projectile', '#b45309', 'mudwisp'),
  muddywater: recipe('projectile', '#a16207', 'mudwisp'),
  bonerush: recipe('projectile', '#e7e5e4', 'bone'),
  bonemerang: recipe('projectile', '#e7e5e4', 'bone'),
  // Flying — feathers instead of flower petals.
  bravebird: recipe('scatter', '#bae6fd', 'feather'),
  hurricane: recipe('scatter', '#7dd3fc', 'feather'),
  airslash: recipe('slash', '#bae6fd', 'feather'),
  aerialace: recipe('slash', '#e0f2fe', 'feather'),
  // Status flourishes.
  willowisp: recipe('projectile', '#fb923c', 'wisp'),
  attract: recipe('scatter', '#f9a8d4', 'heart'),
  charm: recipe('scatter', '#fbcfe8', 'heart'),
  swagger: recipe('impact', '#f87171', 'angry'),
  taunt: recipe('impact', '#f87171', 'angry'),
};

const includesAny = (value: string, terms: string[]) => terms.some(term => value.includes(term));

export function getMoveAnimationRecipe(event: BattleVisualEvent): MoveAnimationRecipe {
  const move = (event.label ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (exactRecipes[move]) return exactRecipes[move];

  if (includesAny(move, ['thunder', 'electric', 'volt', 'spark', 'zap'])) {
    return recipe('lightning', '#fde047', 'lightning');
  }
  if (includesAny(move, ['bite', 'fang', 'crunch', 'jaw'])) {
    return recipe('bite', '#e2e8f0', 'topbite', 'bottombite');
  }
  if (includesAny(move, ['claw'])) {
    return recipe('slash', '#f8fafc', 'leftclaw', 'rightclaw');
  }
  if (includesAny(move, ['blade', 'sword', 'cut', 'scissor', 'slash', 'sacred', 'psychocut'])) {
    return recipe('slash', '#f8fafc', 'sword');
  }
  if (includesAny(move, ['chop'])) {
    return recipe('slash', '#f8fafc', 'leftslash', 'rightslash');
  }
  if (includesAny(move, ['punch', 'jab', 'smack', 'pound'])) return recipe('impact', '#f8fafc', 'fist');
  if (includesAny(move, ['kick', 'stomp', 'slam'])) return recipe('impact', '#f8fafc', 'foot');
  if (includesAny(move, ['voice', 'sound', 'song', 'echo', 'boomburst', 'screech', 'buzz', 'hypervoice', 'overdrive'])) {
    return recipe('sound', '#e2e8f0', 'sound');
  }
  if (includesAny(move, ['web', 'string'])) return recipe('web', '#e2e8f0', 'web');
  if (includesAny(move, ['bone'])) return recipe('projectile', '#e7e5e4', 'bone');
  if (includesAny(move, ['wing', 'aerial', 'air', 'peck', 'beak', 'gust', 'bird', 'fly', 'feather'])) {
    return recipe('scatter', '#bae6fd', 'feather');
  }
  if (includesAny(move, ['leaf', 'seed', 'grass', 'wood', 'vine', 'petal', 'flower'])) {
    return recipe('scatter', '#4ade80', 'leaf1', 'leaf2');
  }
  if (includesAny(move, ['mud', 'sludge', 'ooze'])) return recipe('projectile', '#b45309', 'mudwisp');
  if (includesAny(move, ['rock', 'stone', 'boulder', 'earth', 'ground'])) {
    return recipe('scatter', '#a16207', 'rock1', 'rock2', 'rock3');
  }
  if (includesAny(move, ['burn', 'wisp', 'ember'])) return recipe('projectile', '#fb923c', 'wisp');

  switch (event.moveType) {
    case 'Fire': return recipe('projectile', '#fb923c', 'flareball');
    case 'Water': return recipe('projectile', '#38bdf8', 'waterwisp');
    case 'Electric': return recipe('projectile', '#fde047', 'electroball');
    case 'Grass': return recipe('projectile', '#4ade80', 'energyball');
    case 'Ice': return recipe('projectile', '#a5f3fc', 'iceball');
    case 'Ghost': return recipe('projectile', '#7e22ce', 'shadowball');
    case 'Dark': return recipe('projectile', '#1e293b', 'blackwisp');
    case 'Psychic': return recipe('projectile', '#f472b6', 'mistball');
    case 'Poison': return recipe('projectile', '#c084fc', 'poisonwisp');
    case 'Steel': return recipe('projectile', '#cbd5e1', 'gear');
    case 'Fairy': return recipe('scatter', '#f9a8d4', 'heart', 'shine');
    case 'Dragon': return recipe('slash', '#c084fc', 'leftclaw', 'rightclaw');
    case 'Fighting': return recipe('impact', '#f8fafc', 'fist');
    case 'Flying': return recipe('scatter', '#bae6fd', 'feather');
    // Bug covers blades (X-Scissor), sound (Bug Buzz), horns — no single fit, so let
    // the move-name keywords above route the slashers and fall back to a neutral hit here.
    case 'Bug': return recipe('scatter', '#a3e635', 'energyball');
    case 'Rock':
    case 'Ground': return recipe('scatter', '#a16207', 'rock1', 'rock2', 'rock3');
    default:
      return event.moveCategory === 'Physical'
        ? recipe('impact', '#f8fafc', 'impact')
        : recipe('projectile', '#cbd5e1', 'shine');
  }
}
