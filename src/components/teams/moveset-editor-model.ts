export interface PokemonWithMoves {
  id: number;
  name: string;
  sprites: {
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  types: {
    type: {
      name: string;
    };
  }[];
  moves: string[];
}

export interface MovesetEditorProps {
  pokemon: PokemonWithMoves;
  teamId: number;
  onBack: () => void;
  initialBuild?: PokemonBuild;
  onSave?: (buildData: PokemonBuild) => void;
}

export interface MoveDetails {
  name: string;
  type: {
    name: string;
  };
  power: number | null;
  accuracy: number | null;
  pp: number;
  damage_class: {
    name: string;
  };
  effect_entries: {
    short_effect: string;
    language: {
      name: string;
    };
  }[];
  flavor_text_entries: {
    flavor_text: string;
    language: {
      name: string;
    };
  }[];
  target: {
    name: string;
  };
  priority: number;
}

export type MoveCategoryFilter = 'all' | 'physical' | 'special' | 'status';
export type MoveSortKey = 'name' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
export type SortDirection = 'asc' | 'desc';

export interface BuildValidationErrors {
  ability?: string;
  moves?: string;
}

export interface Nature {
  name: string;
  description: string;
  increased_stat?: { name: string };
  decreased_stat?: { name: string };
}

export interface PokemonBuild {
  moves: string[];
  nature: string;
  ability: string;
  gender: string | null;
  heldItem: string;
  nickname: string;
  isShiny: boolean;
  teraType: string;
  ivs: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
  };
  evs: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
  };
}

export const EV_PRESETS = {
  'Physical Attacker': {
    hp: 6,
    attack: 252,
    defense: 0,
    'special-attack': 0,
    'special-defense': 0,
    speed: 252
  },
  'Special Attacker': {
    hp: 6,
    attack: 0,
    defense: 0,
    'special-attack': 252,
    'special-defense': 0,
    speed: 252
  },
  'Physical Tank': {
    hp: 252,
    attack: 0,
    defense: 252,
    'special-attack': 0,
    'special-defense': 6,
    speed: 0
  },
  'Special Tank': {
    hp: 252,
    attack: 0,
    defense: 6,
    'special-attack': 0,
    'special-defense': 252,
    speed: 0
  },
  'Mixed Tank': {
    hp: 252,
    attack: 0,
    defense: 130,
    'special-attack': 0,
    'special-defense': 128,
    speed: 0
  },
  'Fast Support': {
    hp: 252,
    attack: 0,
    defense: 6,
    'special-attack': 0,
    'special-defense': 0,
    speed: 252
  },
  'Balanced': {
    hp: 85,
    attack: 85,
    defense: 85,
    'special-attack': 85,
    'special-defense': 85,
    speed: 85
  }
};

export const POKEMON_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
];

export const HELD_ITEMS = [
  // Choice Items
  'Choice Band',
  'Choice Specs',
  'Choice Scarf',
  // Defensive Items
  'Leftovers',
  'Heavy-Duty Boots',
  'Assault Vest',
  'Rocky Helmet',
  'Black Sludge',
  // Offensive Items
  'Life Orb',
  'Expert Belt',
  'Muscle Band',
  'Wise Glasses',
  // Focus Items
  'Focus Sash',
  'Focus Band',
  // Berries - Popular
  'Sitrus Berry',
  'Lum Berry',
  'Chesto Berry',
  'Leppa Berry',
  // Berries - Stat Boost
  'Liechi Berry',
  'Ganlon Berry',
  'Salac Berry',
  'Petaya Berry',
  'Apicot Berry',
  // Berries - Type Resist
  'Occa Berry',
  'Passho Berry',
  'Wacan Berry',
  'Rindo Berry',
  'Yache Berry',
  'Chople Berry',
  'Kebia Berry',
  'Shuca Berry',
  'Coba Berry',
  'Payapa Berry',
  'Tanga Berry',
  'Charti Berry',
  'Kasib Berry',
  'Haban Berry',
  'Colbur Berry',
  'Babiri Berry',
  'Chilan Berry',
  'Roseli Berry',
  // Utility Items
  'Air Balloon',
  'Mental Herb',
  'Power Herb',
  'Quick Claw',
  'King\'s Rock',
  'Razor Claw',
  'Scope Lens',
  'Wide Lens',
  'Zoom Lens',
  // Status Orbs
  'Flame Orb',
  'Toxic Orb',
  // Terrain Seeds
  'Electric Seed',
  'Grassy Seed',
  'Misty Seed',
  'Psychic Seed',
  // Weather Items
  'Heat Rock',
  'Damp Rock',
  'Smooth Rock',
  'Icy Rock',
  // Competitive Items
  'Eject Button',
  'Red Card',
  'Shed Shell',
  'Safety Goggles',
  'Protective Pads',
  'Clear Amulet',
  'Covert Cloak',
  'Loaded Dice',
  'Booster Energy',
  'Mirror Herb',
  'Punching Glove',
  // Type Enhancing Items
  'Black Belt',
  'Black Glasses',
  'Charcoal',
  'Dragon Fang',
  'Hard Stone',
  'Magnet',
  'Metal Coat',
  'Miracle Seed',
  'Mystic Water',
  'Never-Melt Ice',
  'Poison Barb',
  'Sharp Beak',
  'Silk Scarf',
  'Silver Powder',
  'Soft Sand',
  'Spell Tag',
  'Twisted Spoon',
  'Fairy Feather'
];

// Module-level in-memory cache for move details (persists across re-mounts)
export const moveDetailsCache: Record<string, MoveDetails> = {};
export const toShowdownId = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const typeColors: Record<string, string> = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
  grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC',
};

export const getTypeColor = (typeName: string): string => typeColors[typeName] || '#68A090';

export const formatMoveName = (move: string): string => (
  move.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
);
