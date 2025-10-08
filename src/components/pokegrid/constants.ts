// Game constants
export const GAME_CONSTANTS = {
  MAX_TOTAL_GUESSES: 9,
  BONUS_RETRIES: 3,
  MAX_UNDO_PER_SESSION: 3,
  GRID_SIZE: 3
} as const;

// Authentic PokéGrid constraint definitions
export const TYPE_CONSTRAINTS = [
  { id: 'fire-type', type: 'type' as const, value: 'fire', label: 'Fire', description: 'Fire-type Pokémon', icon: '', svgIcon: '/icons/types/fire.svg' },
  { id: 'water-type', type: 'type' as const, value: 'water', label: 'Water', description: 'Water-type Pokémon', icon: '', svgIcon: '/icons/types/water.svg' },
  { id: 'grass-type', type: 'type' as const, value: 'grass', label: 'Grass', description: 'Grass-type Pokémon', icon: '', svgIcon: '/icons/types/grass.svg' },
  { id: 'electric-type', type: 'type' as const, value: 'electric', label: 'Electric', description: 'Electric-type Pokémon', icon: '', svgIcon: '/icons/types/electric.svg' },
  { id: 'psychic-type', type: 'type' as const, value: 'psychic', label: 'Psychic', description: 'Psychic-type Pokémon', icon: '', svgIcon: '/icons/types/psychic.svg' },
  { id: 'ice-type', type: 'type' as const, value: 'ice', label: 'Ice', description: 'Ice-type Pokémon', icon: '', svgIcon: '/icons/types/ice.svg' },
  { id: 'dragon-type', type: 'type' as const, value: 'dragon', label: 'Dragon', description: 'Dragon-type Pokémon', icon: '', svgIcon: '/icons/types/dragon.svg' },
  { id: 'flying-type', type: 'type' as const, value: 'flying', label: 'Flying', description: 'Flying-type Pokémon', icon: '', svgIcon: '/icons/types/flying.svg' },
  { id: 'normal-type', type: 'type' as const, value: 'normal', label: 'Normal', description: 'Normal-type Pokémon', icon: '', svgIcon: '/icons/types/normal.svg' },
  { id: 'fighting-type', type: 'type' as const, value: 'fighting', label: 'Fighting', description: 'Fighting-type Pokémon', icon: '', svgIcon: '/icons/types/fighting.svg' },
  { id: 'poison-type', type: 'type' as const, value: 'poison', label: 'Poison', description: 'Poison-type Pokémon', icon: '', svgIcon: '/icons/types/poison.svg' },
  { id: 'ground-type', type: 'type' as const, value: 'ground', label: 'Ground', description: 'Ground-type Pokémon', icon: '', svgIcon: '/icons/types/ground.svg' },
  { id: 'rock-type', type: 'type' as const, value: 'rock', label: 'Rock', description: 'Rock-type Pokémon', icon: '', svgIcon: '/icons/types/rock.svg' },
  { id: 'bug-type', type: 'type' as const, value: 'bug', label: 'Bug', description: 'Bug-type Pokémon', icon: '', svgIcon: '/icons/types/bug.svg' },
  { id: 'ghost-type', type: 'type' as const, value: 'ghost', label: 'Ghost', description: 'Ghost-type Pokémon', icon: '', svgIcon: '/icons/types/ghost.svg' },
  { id: 'steel-type', type: 'type' as const, value: 'steel', label: 'Steel', description: 'Steel-type Pokémon', icon: '', svgIcon: '/icons/types/steel.svg' },
  { id: 'dark-type', type: 'type' as const, value: 'dark', label: 'Dark', description: 'Dark-type Pokémon', icon: '', svgIcon: '/icons/types/dark.svg' },
  { id: 'fairy-type', type: 'type' as const, value: 'fairy', label: 'Fairy', description: 'Fairy-type Pokémon', icon: '', svgIcon: '/icons/types/fairy.svg' },
];

export const GENERATION_CONSTRAINTS = [
  { id: 'gen-1', type: 'generation' as const, value: 'generation-i', label: 'Generation I', description: 'Kanto region Pokémon', icon: 'I' },
  { id: 'gen-2', type: 'generation' as const, value: 'generation-ii', label: 'Generation II', description: 'Johto region Pokémon', icon: 'II' },
  { id: 'gen-3', type: 'generation' as const, value: 'generation-iii', label: 'Generation III', description: 'Hoenn region Pokémon', icon: 'III' },
  { id: 'gen-4', type: 'generation' as const, value: 'generation-iv', label: 'Generation IV', description: 'Sinnoh region Pokémon', icon: 'IV' },
  { id: 'gen-5', type: 'generation' as const, value: 'generation-v', label: 'Generation V', description: 'Unova region Pokémon', icon: 'V' },
  { id: 'gen-6', type: 'generation' as const, value: 'generation-vi', label: 'Generation VI', description: 'Kalos region Pokémon', icon: 'VI' },
  { id: 'gen-7', type: 'generation' as const, value: 'generation-vii', label: 'Generation VII', description: 'Alola region Pokémon', icon: 'VII' },
  { id: 'gen-8', type: 'generation' as const, value: 'generation-viii', label: 'Generation VIII', description: 'Galar region Pokémon', icon: 'VIII' },
  { id: 'gen-9', type: 'generation' as const, value: 'generation-ix', label: 'Generation IX', description: 'Paldea region Pokémon', icon: 'IX' },
];

export const EVOLUTION_CONSTRAINTS = [
  { id: 'starter', type: 'evolution-stage' as const, value: 'starter', label: 'Starter', description: 'Starter Pokémon', icon: 'S' },
  { id: 'first-evo', type: 'evolution-stage' as const, value: 'first', label: 'First Evolution', description: 'First evolution stage', icon: '1E' },
  { id: 'final-evo', type: 'evolution-stage' as const, value: 'final', label: 'Final Evolution', description: 'Final evolution Pokémon', icon: 'FE' },
  { id: 'no-evolution', type: 'evolution-stage' as const, value: 'none', label: 'No Evolution', description: 'Does not evolve', icon: 'NE' },
  { id: 'legendary', type: 'evolution-stage' as const, value: 'legendary', label: 'Legendary', description: 'Legendary Pokémon', icon: 'L' },
  { id: 'mythical', type: 'evolution-stage' as const, value: 'mythical', label: 'Mythical', description: 'Mythical Pokémon', icon: 'M' },
];

export const STAT_CONSTRAINTS = [
  { id: 'high-hp', type: 'stat-range' as const, value: 'hp-high', label: 'High HP (≥ 100)', description: 'HP ≥ 100', icon: 'HP+' },
  { id: 'low-hp', type: 'stat-range' as const, value: 'hp-low', label: 'Low HP (≤ 50)', description: 'HP ≤ 50', icon: 'HP-' },
  { id: 'high-attack', type: 'stat-range' as const, value: 'attack-high', label: 'High Attack (≥ 120)', description: 'Attack ≥ 120', icon: 'ATK+' },
  { id: 'low-attack', type: 'stat-range' as const, value: 'attack-low', label: 'Low Attack (≤ 60)', description: 'Attack ≤ 60', icon: 'ATK-' },
  { id: 'high-defense', type: 'stat-range' as const, value: 'defense-high', label: 'High Defense (≥ 100)', description: 'Defense ≥ 100', icon: 'DEF+' },
  { id: 'low-defense', type: 'stat-range' as const, value: 'defense-low', label: 'Low Defense (≤ 60)', description: 'Defense ≤ 60', icon: 'DEF-' },
  { id: 'high-speed', type: 'stat-range' as const, value: 'speed-high', label: 'High Speed (≥ 100)', description: 'Speed ≥ 100', icon: 'SPD+' },
  { id: 'low-speed', type: 'stat-range' as const, value: 'speed-low', label: 'Low Speed (≤ 50)', description: 'Speed ≤ 50', icon: 'SPD-' },
];

export const SIZE_CONSTRAINTS = [
  { id: 'small-size', type: 'height-weight' as const, value: 'small', label: 'Small (< 1m & < 30kg)', description: 'Height < 1.0m AND Weight < 30kg', icon: 'SM' },
  { id: 'medium-size', type: 'height-weight' as const, value: 'medium', label: 'Medium (1-2m)', description: 'Height 1.0m - 2.0m', icon: 'MD' },
  { id: 'large-size', type: 'height-weight' as const, value: 'large', label: 'Large (> 2m or > 100kg)', description: 'Height > 2.0m OR Weight > 100kg', icon: 'LG' },
  { id: 'light-weight', type: 'height-weight' as const, value: 'light', label: 'Light (< 10kg)', description: 'Weight < 10kg', icon: 'LT' },
  { id: 'heavy-weight', type: 'height-weight' as const, value: 'heavy', label: 'Heavy (> 200kg)', description: 'Weight > 200kg', icon: 'HV' },
];

export const TYPE_COUNT_CONSTRAINTS = [
  { id: 'single-type', type: 'type-count' as const, value: 'single', label: 'Single Type', description: 'Single-type Pokémon', icon: '1T' },
  { id: 'dual-type', type: 'type-count' as const, value: 'dual', label: 'Dual Type', description: 'Dual-type Pokémon', icon: '2T' },
];

export const MOVE_CONSTRAINTS = [
  { id: 'learns-earthquake', type: 'move-category' as const, value: 'earthquake', label: 'Learns Earthquake', description: 'Can learn Earthquake', icon: 'EQ' },
  { id: 'learns-surf', type: 'move-category' as const, value: 'surf', label: 'Learns Surf', description: 'Can learn Surf', icon: 'SF' },
  { id: 'learns-fly', type: 'move-category' as const, value: 'fly', label: 'Learns Fly', description: 'Can learn Fly', icon: 'FLY' },
  { id: 'learns-thunder-wave', type: 'move-category' as const, value: 'thunder-wave', label: 'Learns Thunder Wave', description: 'Can learn Thunder Wave', icon: 'TW' },
  { id: 'learns-toxic', type: 'move-category' as const, value: 'toxic', label: 'Learns Toxic', description: 'Can learn Toxic', icon: 'TOX' },
  { id: 'learns-ice-beam', type: 'move-category' as const, value: 'ice-beam', label: 'Learns Ice Beam', description: 'Can learn Ice Beam', icon: 'IB' },
];

export const TYPE_EFFECTIVENESS_CONSTRAINTS = [
  { id: 'weak-to-fire', type: 'type-effectiveness' as const, value: 'weak-fire', label: 'Weak to Fire', description: 'Takes super effective damage from Fire', icon: 'W', svgIcon: '/icons/types/fire.svg' },
  { id: 'weak-to-water', type: 'type-effectiveness' as const, value: 'weak-water', label: 'Weak to Water', description: 'Takes super effective damage from Water', icon: 'W', svgIcon: '/icons/types/water.svg' },
  { id: 'weak-to-electric', type: 'type-effectiveness' as const, value: 'weak-electric', label: 'Weak to Electric', description: 'Takes super effective damage from Electric', icon: 'W', svgIcon: '/icons/types/electric.svg' },
  { id: 'weak-to-grass', type: 'type-effectiveness' as const, value: 'weak-grass', label: 'Weak to Grass', description: 'Takes super effective damage from Grass', icon: 'W', svgIcon: '/icons/types/grass.svg' },
  { id: 'weak-to-ice', type: 'type-effectiveness' as const, value: 'weak-ice', label: 'Weak to Ice', description: 'Takes super effective damage from Ice', icon: 'W', svgIcon: '/icons/types/ice.svg' },
  { id: 'weak-to-fighting', type: 'type-effectiveness' as const, value: 'weak-fighting', label: 'Weak to Fighting', description: 'Takes super effective damage from Fighting', icon: 'W', svgIcon: '/icons/types/fighting.svg' },
  { id: 'resists-fire', type: 'type-effectiveness' as const, value: 'resist-fire', label: 'Resists Fire', description: 'Takes reduced damage from Fire', icon: 'R', svgIcon: '/icons/types/fire.svg' },
  { id: 'resists-water', type: 'type-effectiveness' as const, value: 'resist-water', label: 'Resists Water', description: 'Takes reduced damage from Water', icon: 'R', svgIcon: '/icons/types/water.svg' },
  { id: 'resists-grass', type: 'type-effectiveness' as const, value: 'resist-grass', label: 'Resists Grass', description: 'Takes reduced damage from Grass', icon: 'R', svgIcon: '/icons/types/grass.svg' },
  { id: 'resists-steel', type: 'type-effectiveness' as const, value: 'resist-steel', label: 'Resists Steel', description: 'Takes reduced damage from Steel', icon: 'R', svgIcon: '/icons/types/steel.svg' },
];

export const OTHER_CONSTRAINTS = [
  ...GENERATION_CONSTRAINTS,
  ...EVOLUTION_CONSTRAINTS,
  ...STAT_CONSTRAINTS,
  ...SIZE_CONSTRAINTS,
  ...TYPE_COUNT_CONSTRAINTS,
  ...MOVE_CONSTRAINTS,
  ...TYPE_EFFECTIVENESS_CONSTRAINTS,
];
