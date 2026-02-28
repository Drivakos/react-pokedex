/**
 * Raw API response shapes used across the service layer.
 * These represent data as returned by PokeAPI (GraphQL) and Supabase.
 */

// ---------------------------------------------------------------------------
// Supabase pokemon table row
// ---------------------------------------------------------------------------
export interface SupabasePokemonRow {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  moves?: string[];
  generation?: string;
  can_evolve?: boolean;
  is_starter?: boolean;
  evolves_from_id?: string | number | null;
  is_default?: boolean;
  base_experience?: number;
  hp: number;
  attack: number;
  defense: number;
  special_attack: number;
  special_defense: number;
  speed: number;
  is_legendary?: boolean;
  is_mythical?: boolean;
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------
export interface RawStat {
  base_stat: number;
  pokemon_v2_stat: { name: string };
}

export interface RawTypeEntry {
  type: { name: string };
}

// ---------------------------------------------------------------------------
// Abilities
// ---------------------------------------------------------------------------
export interface RawAbilityEntry {
  ability: {
    name: string;
    pokemon_v2_abilityflavortexts?: Array<{ flavor_text: string }>;
  };
  is_hidden: boolean;
}

/** Shape returned by the abilities GraphQL query */
export interface RawAbilityRaw {
  ability: { id: number; name: string };
  is_hidden: boolean;
}

// ---------------------------------------------------------------------------
// Moves (details page)
// ---------------------------------------------------------------------------
export interface RawMoveEntry {
  move: { name: string };
  level: number;
  pokemon_v2_movelearnmethod?: { name: string };
  pokemon_v2_versiongroup?: { id: number; name: string };
}

/** One entry in the moveset-editor moves query */
export interface RawPokemonMoveEntry {
  move: {
    id: number;
    name: string;
    type: { name: string } | null;
    power: number | null;
    accuracy: number | null;
    pp: number | null;
    damage_class: { name: string } | null;
    target: { name: string } | null;
    priority: number;
    flavor_text: Array<{ flavor_text: string }>;
    effect: { effect_text: Array<{ short_effect: string }> } | null;
  };
  level: number;
  pokemon_v2_movelearnmethod: { name: string } | null;
}

export interface RawMoveFlavorText {
  flavor_text: string;
  language: { name: string };
}

export interface RawMoveEffectText {
  short_effect: string;
  effect: string;
  language: { name: string };
}

export interface RawMoveDetail {
  id: number;
  name: string;
  type: { name: string } | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damage_class: { name: string } | null;
  target: { name: string } | null;
  priority: number;
  flavor_text: RawMoveFlavorText[];
  effect: { effect_text: RawMoveEffectText[] } | null;
}

// ---------------------------------------------------------------------------
// Evolution
// ---------------------------------------------------------------------------
export interface RawEvolutionSpecies {
  id: number;
  name: string;
  evolves_from_species_id: number | null;
  pokemon_v2_pokemonspeciesnames?: Array<{ name: string }>;
  pokemon_v2_pokemonevolutions?: Array<{
    min_level?: number | null;
    pokemon_v2_item?: { name: string } | null;
    pokemon_v2_evolutiontrigger?: { name: string } | null;
  }>;
}

// ---------------------------------------------------------------------------
// Pokemon details (fetchPokemonDetailsDirect)
// ---------------------------------------------------------------------------
export interface RawPokemonDetails {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  types: RawTypeEntry[];
  abilities: RawAbilityEntry[];
  moves: RawMoveEntry[];
  stats: RawStat[];
  sprites: Array<{ data: string | null }>;
  species?: {
    flavor_text?: Array<{ flavor_text: string }>;
    genera?: Array<{ genus: string }>;
    generation?: { name: string };
    evolution_chain?: {
      pokemon_v2_pokemonspecies: RawEvolutionSpecies[];
    };
  };
}

// ---------------------------------------------------------------------------
// GraphQL response wrappers
// ---------------------------------------------------------------------------
export interface RawPokemonDetailsResponse {
  pokemon_v2_pokemon_by_pk: RawPokemonDetails | null;
}

export interface RawPokemonAbilitiesResponse {
  pokemon_v2_pokemon_by_pk: { abilities: RawAbilityRaw[] } | null;
}

export interface RawPokemonMovesResponse {
  pokemon_v2_pokemon_by_pk: { moves: RawPokemonMoveEntry[] } | null;
}

export interface RawMoveDetailsResponse {
  pokemon_v2_move: RawMoveDetail[];
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------
export interface RawItemData {
  id: number;
  name: string;
  cost: number;
  category?: { name: string };
}

export interface RawItemsResponse {
  pokemon_v2_item: RawItemData[];
}
