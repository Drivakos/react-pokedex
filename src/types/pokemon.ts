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

// Thematic backgrounds based on Pokémon types
export const TYPE_BACKGROUNDS: Record<string, { gradient: string, pattern?: string }> = {
  normal: {
    gradient: 'from-gray-300 to-gray-400',
    pattern: 'bg-[url("/patterns/normal-pattern.svg")] bg-repeat opacity-10'
  },
  fire: {
    gradient: 'from-red-500 to-orange-500',
    pattern: 'bg-[url("/patterns/fire-pattern.svg")] bg-repeat opacity-10'
  },
  water: {
    gradient: 'from-blue-400 to-blue-600',
    pattern: 'bg-[url("/patterns/water-pattern.svg")] bg-repeat opacity-10'
  },
  electric: {
    gradient: 'from-yellow-300 to-yellow-500',
    pattern: 'bg-[url("/patterns/electric-pattern.svg")] bg-repeat opacity-10'
  },
  grass: {
    gradient: 'from-green-400 to-green-600',
    pattern: 'bg-[url("/patterns/grass-pattern.svg")] bg-repeat opacity-10'
  },
  ice: {
    gradient: 'from-blue-100 to-blue-300',
    pattern: 'bg-[url("/patterns/ice-pattern.svg")] bg-repeat opacity-10'
  },
  fighting: {
    gradient: 'from-red-600 to-red-800',
    pattern: 'bg-[url("/patterns/fighting-pattern.svg")] bg-repeat opacity-10'
  },
  poison: {
    gradient: 'from-purple-400 to-purple-600',
    pattern: 'bg-[url("/patterns/poison-pattern.svg")] bg-repeat opacity-10'
  },
  ground: {
    gradient: 'from-yellow-500 to-yellow-700',
    pattern: 'bg-[url("/patterns/ground-pattern.svg")] bg-repeat opacity-10'
  },
  flying: {
    gradient: 'from-indigo-300 to-indigo-500',
    pattern: 'bg-[url("/patterns/flying-pattern.svg")] bg-repeat opacity-10'
  },
  psychic: {
    gradient: 'from-pink-400 to-pink-600',
    pattern: 'bg-[url("/patterns/psychic-pattern.svg")] bg-repeat opacity-10'
  },
  bug: {
    gradient: 'from-lime-400 to-lime-600',
    pattern: 'bg-[url("/patterns/bug-pattern.svg")] bg-repeat opacity-10'
  },
  rock: {
    gradient: 'from-yellow-700 to-yellow-900',
    pattern: 'bg-[url("/patterns/rock-pattern.svg")] bg-repeat opacity-10'
  },
  ghost: {
    gradient: 'from-purple-600 to-purple-800',
    pattern: 'bg-[url("/patterns/ghost-pattern.svg")] bg-repeat opacity-10'
  },
  dragon: {
    gradient: 'from-indigo-600 to-indigo-800',
    pattern: 'bg-[url("/patterns/dragon-pattern.svg")] bg-repeat opacity-10'
  },
  dark: {
    gradient: 'from-gray-600 to-gray-800',
    pattern: 'bg-[url("/patterns/dark-pattern.svg")] bg-repeat opacity-10'
  },
  steel: {
    gradient: 'from-gray-400 to-gray-600',
    pattern: 'bg-[url("/patterns/steel-pattern.svg")] bg-repeat opacity-10'
  },
  fairy: {
    gradient: 'from-pink-200 to-pink-400',
    pattern: 'bg-[url("/patterns/fairy-pattern.svg")] bg-repeat opacity-10'
  }
};