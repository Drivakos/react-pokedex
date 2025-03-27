export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  weight: number;
  height: number;
  moves: Move[];
  sprites: {
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  evolution_chain?: {
    url: string;
  };
  can_mega_evolve: boolean;
  generation: string;
  has_evolutions: boolean;
}

export interface Move {
  move: {
    name: string;
    url: string;
  };
}

export interface PokemonType {
  name: string;
  color: string;
}

export interface Filters {
  types: string[];
  moves: string[];
  generation: string;
  weight: {
    min: number;
    max: number;
  };
  height: {
    min: number;
    max: number;
  };
  canMegaEvolve: boolean | null;
  hasEvolutions: boolean | null;
}

export const TYPE_COLORS: Record<string, string> = {
  normal: 'bg-gray-400',
  fire: 'bg-red-500',
  water: 'bg-blue-500',
  electric: 'bg-yellow-400',
  grass: 'bg-green-500',
  ice: 'bg-blue-200',
  fighting: 'bg-red-700',
  poison: 'bg-purple-500',
  ground: 'bg-yellow-600',
  flying: 'bg-indigo-400',
  psychic: 'bg-pink-500',
  bug: 'bg-lime-500',
  rock: 'bg-yellow-800',
  ghost: 'bg-purple-700',
  dragon: 'bg-indigo-700',
  dark: 'bg-gray-700',
  steel: 'bg-gray-500',
  fairy: 'bg-pink-300'
};