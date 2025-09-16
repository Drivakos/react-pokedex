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

export const OTHER_CONSTRAINTS = [
  { id: 'gen-1', type: 'generation' as const, value: 'generation-i', label: 'Generation I', description: 'Kanto region Pokémon', icon: 'I' },
  { id: 'gen-2', type: 'generation' as const, value: 'generation-ii', label: 'Generation II', description: 'Johto region Pokémon', icon: 'II' },
  { id: 'gen-3', type: 'generation' as const, value: 'generation-iii', label: 'Generation III', description: 'Hoenn region Pokémon', icon: 'III' },
  { id: 'gen-4', type: 'generation' as const, value: 'generation-iv', label: 'Generation IV', description: 'Sinnoh region Pokémon', icon: 'IV' },
  { id: 'gen-5', type: 'generation' as const, value: 'generation-v', label: 'Generation V', description: 'Unova region Pokémon', icon: 'V' },
  { id: 'starter', type: 'evolution-stage' as const, value: 'starter', label: 'Starter', description: 'Starter Pokémon', icon: 'S' },
  { id: 'final-evo', type: 'evolution-stage' as const, value: 'final', label: 'Final Evolution', description: 'Final evolution Pokémon', icon: 'F' },
  { id: 'legendary', type: 'evolution-stage' as const, value: 'legendary', label: 'Legendary', description: 'Legendary Pokémon', icon: 'L' },
  { id: 'single-type', type: 'type-count' as const, value: 'single', label: 'Single Type', description: 'Single-type Pokémon', icon: '1' },
  { id: 'dual-type', type: 'type-count' as const, value: 'dual', label: 'Dual Type', description: 'Dual-type Pokémon', icon: '2' },
  { id: 'high-hp', type: 'stat-range' as const, value: 'hp-high', label: 'High HP', description: 'HP ≥ 100', icon: 'HP' },
  { id: 'high-attack', type: 'stat-range' as const, value: 'attack-high', label: 'High Attack', description: 'Attack ≥ 120', icon: 'ATK' },
  { id: 'high-speed', type: 'stat-range' as const, value: 'speed-high', label: 'High Speed', description: 'Speed ≥ 100', icon: 'SPD' },
  { id: 'small-size', type: 'height-weight' as const, value: 'small', label: 'Small Size', description: 'Height < 1m, Weight < 30kg', icon: 'SM' },
  { id: 'large-size', type: 'height-weight' as const, value: 'large', label: 'Large Size', description: 'Height > 2m or Weight > 100kg', icon: 'LG' },
  { id: 'physical-moves', type: 'move-category' as const, value: 'physical', label: 'Physical Moves', description: 'Can learn physical moves', icon: 'PHY' },
];
