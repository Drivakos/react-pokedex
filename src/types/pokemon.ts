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
  is_default: boolean;
  base_experience: number;
}

export interface PokemonAbility {
  name: string;
  is_hidden: boolean;
  description: string;
}

export interface PokemonMove {
  name: string;
  learned_at_level: number;
  learn_method: string;
}

export interface PokemonSprites {
  front_default: string;
  back_default: string;
  front_shiny: string;
  back_shiny: string;
  official_artwork: string;
}

export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  special_attack: number;
  special_defense: number;
  speed: number;
}

export interface PokemonEvolution {
  species_name: string;
  species_id: number;
  min_level: number | null;
  trigger_name: string | null;
  item: string | null;
}

export interface PokemonDetails {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  abilities: PokemonAbility[];
  stats: PokemonStats;
  sprites: PokemonSprites;
  moves: PokemonMove[];
  flavor_text: string;
  genera: string;
  generation: string;
  evolution_chain: PokemonEvolution[];
  base_experience: number;
  has_evolutions: boolean;
}

interface PokemonForm {
  form_name: string;
  is_default: boolean;
}

interface PokemonWithForms {
  pokemon_v2_pokemonforms: PokemonForm[];
}

interface PokemonSpeciesEvolution {
  name: string;
}

interface EvolutionChain {
  pokemon_v2_pokemonspecies: PokemonSpeciesEvolution[];
}

interface Species {
  generation: {
    name: string;
  };
  pokemon_v2_pokemons: PokemonWithForms[];
  pokemon_v2_evolutionchain?: EvolutionChain;
}

export interface RawPokemonData {
  id: number;
  name: string;
  height: number;
  weight: number;
  is_default: boolean;
  base_experience: number;
  types: Array<{
    type: {
      name: string;
    };
  }>;
  moves: Array<{
    move: {
      name: string;
    };
  }>;
  sprites: Array<{
    data: any;
  }>;
  species: Species;
  forms: PokemonForm[];
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