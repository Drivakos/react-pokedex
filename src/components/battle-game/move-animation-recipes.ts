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

const asset = (name: string) => `${FX_ROOT}/${name}.png`;
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
  dazzlinggleam: recipe('impact', '#f9a8d4', 'shine'),
  doubleedge: recipe('impact', '#d6d3d1', 'impact'),
  earthpower: recipe('scatter', '#b45309', 'rock1', 'rock2', 'rock3'),
  electroball: recipe('projectile', '#fde047', 'electroball'),
  energyball: recipe('projectile', '#4ade80', 'energyball'),
  flareblitz: recipe('projectile', '#fb923c', 'flareball'),
  flamethrower: recipe('projectile', '#f97316', 'fireball'),
  flashcannon: recipe('projectile', '#cbd5e1', 'shine'),
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
  if (includesAny(move, ['slash', 'claw', 'cut', 'chop'])) {
    return recipe('slash', '#f8fafc', 'leftslash', 'rightslash');
  }
  if (includesAny(move, ['punch', 'jab', 'smack'])) return recipe('impact', '#f8fafc', 'fist');
  if (includesAny(move, ['kick', 'stomp', 'slam'])) return recipe('impact', '#f8fafc', 'foot');
  if (includesAny(move, ['voice', 'sound', 'song', 'echo', 'boomburst'])) {
    return recipe('sound', '#e2e8f0', 'sound');
  }
  if (includesAny(move, ['web', 'string'])) return recipe('web', '#e2e8f0', 'web');
  if (includesAny(move, ['leaf', 'seed', 'grass', 'wood', 'vine', 'petal', 'flower'])) {
    return recipe('scatter', '#4ade80', 'leaf1', 'leaf2');
  }
  if (includesAny(move, ['rock', 'stone', 'boulder', 'earth', 'ground', 'mud'])) {
    return recipe('scatter', '#a16207', 'rock1', 'rock2', 'rock3');
  }

  switch (event.moveType) {
    case 'Fire': return recipe('projectile', '#fb923c', 'flareball');
    case 'Water': return recipe('projectile', '#38bdf8', 'waterwisp');
    case 'Electric': return recipe('projectile', '#fde047', 'electroball');
    case 'Grass': return recipe('projectile', '#4ade80', 'energyball');
    case 'Ice': return recipe('projectile', '#a5f3fc', 'iceball');
    case 'Ghost':
    case 'Dark': return recipe('projectile', '#7e22ce', 'shadowball');
    case 'Psychic': return recipe('projectile', '#f472b6', 'mistball');
    case 'Poison': return recipe('projectile', '#c084fc', 'poisonwisp');
    case 'Fairy': return recipe('impact', '#f9a8d4', 'shine');
    case 'Flying': return recipe('scatter', '#bae6fd', 'petal');
    case 'Rock':
    case 'Ground': return recipe('scatter', '#a16207', 'rock1', 'rock2', 'rock3');
    default:
      return event.moveCategory === 'Physical'
        ? recipe('impact', '#f8fafc', 'impact')
        : recipe('projectile', '#cbd5e1', 'shine');
  }
}
