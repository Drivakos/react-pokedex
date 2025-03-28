export interface PokemonForm {
  form_name: string;
  is_mega: boolean;
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  moves: string[];
  sprites: any;
  generation: string;
  has_evolutions: boolean;
  can_mega_evolve: boolean;
}

export interface RawPokemonData {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { type: { name: string } }[];
  moves: { move: { name: string } }[];
  sprites: { data: any }[];
  species: {
    generation: { name: string };
    evolution_chain_id: number | null;
    evolves_from_species_id: number | null;
  };
  forms: PokemonForm[];
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
  hasEvolutions: boolean | null;
  canMegaEvolve: boolean | null;
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