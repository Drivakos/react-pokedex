import { PokemonTeamMember } from '../types/teams';
// Import the canonical PokemonDetails and supporting types from pokemon.ts
import { PokemonDetails, PokemonSprites, PokemonMove, PokemonAbility } from '../types/pokemon'; 

// TODO: Replace 'any' with specific types from the API or main Pokemon type, potentially RawPokemonData

export const formatType = (typeObj: any): { type: { name: string } } => {
  if (typeof typeObj === 'string') {
    return { type: { name: typeObj } };
  } else if (typeObj && typeObj.type && typeObj.type.name) {
    return { type: { name: typeObj.type.name } };
  } else {
    return { type: { name: 'unknown' } };
  }
};

export const formatMove = (moveObj: any): { move: { name: string } } => {
  if (typeof moveObj === 'string') {
    return { move: { name: moveObj } };
  } else if (moveObj && moveObj.move && moveObj.move.name) {
    return { move: { name: moveObj.move.name } };
  } else if (moveObj && moveObj.name) { // Handle cases where name is directly available
    return { move: { name: moveObj.name } };
  } else {
    return { move: { name: 'unknown' } };
  }
};

export const formatAbility = (abilityObj: any): { ability: { name: string } } => {
  if (typeof abilityObj === 'string') {
    return { ability: { name: abilityObj } };
  } else if (abilityObj && abilityObj.ability && abilityObj.ability.name) {
    return { ability: { name: abilityObj.ability.name } };
  } else if (abilityObj && abilityObj.name) {
    return { ability: { name: abilityObj.name } };
  } else {
    return { ability: { name: 'unknown' } };
  }
};

// TODO: Define a specific input type instead of 'any', likely RawPokemonData from '../types/pokemon'
export const adaptToPokemonDetails = (sourcePokemon: any): PokemonDetails => {
  if (!sourcePokemon || typeof sourcePokemon !== 'object') {
    console.error('Invalid source Pokemon data for adaptation:', sourcePokemon);
    return {
      id: 0,
      name: 'Unknown',
      types: [],
      moves: [],
      abilities: [],
      sprites: {} as PokemonSprites,
      height: 0,
      weight: 0,
      stats: { hp: 0, attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0 },
      flavor_text: '',
      genera: '',
      generation: 'unknown',
      evolution_chain: [],
      base_experience: 0,
      has_evolutions: false
    };
  }

  // Use nullish coalescing and optional chaining for safer access
  // Map raw types/moves/abilities structure to the canonical structure
  const types: string[] = Array.isArray(sourcePokemon.types) 
    ? sourcePokemon.types.map((t: any) => t?.type?.name).filter(Boolean)
    : [];

  const moves: PokemonMove[] = Array.isArray(sourcePokemon.moves)
    ? sourcePokemon.moves.map((m: any): PokemonMove => ({ 
        name: m?.move?.name ?? 'unknown',
        // Add defaults or map other fields if available in sourcePokemon
        learned_at_level: m?.version_group_details?.[0]?.level_learned_at ?? 0, 
        learn_method: m?.version_group_details?.[0]?.move_learn_method?.name ?? 'unknown',
      }))
    : [];

  const abilities: PokemonAbility[] = Array.isArray(sourcePokemon.abilities)
    ? sourcePokemon.abilities.map((a: any): PokemonAbility => ({ 
        name: a?.ability?.name ?? 'unknown',
        is_hidden: a?.is_hidden ?? false,
        // Add defaults or map other fields if available
        description: '', // Description likely needs another API call or source
      }))
    : [];

  // Handle sprites - assuming sourcePokemon.sprites is the complex object/array from RawPokemonData
  // This needs careful mapping to the flat PokemonSprites structure
  const spritesData = sourcePokemon.sprites?.data || sourcePokemon.sprites; // Adapt based on actual structure
  const sprites: PokemonSprites = {
      front_default: spritesData?.front_default ?? '',
      back_default: spritesData?.back_default ?? '',
      front_shiny: spritesData?.front_shiny ?? '',
      back_shiny: spritesData?.back_shiny ?? '',
      official_artwork: spritesData?.other?.['official-artwork']?.front_default ?? spritesData?.front_default ?? '' // Common pattern
  };


  return {
    id: sourcePokemon.id ?? 0,
    name: sourcePokemon.name ?? 'Unknown',
    height: sourcePokemon.height ?? 0,
    weight: sourcePokemon.weight ?? 0,
    types: types,
    sprites: sprites,
    abilities: abilities,
    moves: moves,
    // Map other required fields from PokemonDetails
    stats: sourcePokemon.stats ?? { hp: 0, attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0 },
    flavor_text: sourcePokemon.species?.flavor_text_entries?.[0]?.flavor_text ?? '', // Example
    genera: sourcePokemon.species?.genera?.[0]?.genus ?? '', // Example
    generation: sourcePokemon.species?.generation?.name ?? 'unknown', // Example
    evolution_chain: [], // Placeholder
    base_experience: sourcePokemon.base_experience ?? 0,
    has_evolutions: !!sourcePokemon.species?.pokemon_v2_evolutionchain, // Example
  };
};

// Creates a minimal PokemonTeamMember from detailed Pokemon data
export const createPokemonTeamMember = (pokemon: PokemonDetails): PokemonTeamMember => {
  if (!pokemon || typeof pokemon !== 'object' || !pokemon.id) {
     console.error('Invalid PokemonDetails for creating team member:', pokemon);
     // Handle invalid input appropriately
     return { id: 0, name: 'Invalid', types: [] };
  }
  
  // Adapt the canonical 'types' (string[]) to the structure expected by PokemonTeamMember
  const teamMemberTypes = Array.isArray(pokemon.types) 
      ? pokemon.types.map(typeName => ({ type: { name: typeName } })) 
      : [];

  return {
    id: pokemon.id,
    name: pokemon.name,
    types: teamMemberTypes,
  };
};
