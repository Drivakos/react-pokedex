import { BattleMove } from '../utils/battleEngine';

const GRAPHQL_ENDPOINT = import.meta.env.VITE_API_GRAPHQL_URL || 'https://beta.pokeapi.co/graphql/v1beta';
const REST_ENDPOINT = import.meta.env.VITE_API_REST_URL || import.meta.env.VITE_API_URL || 'https://pokeapi.co/api/v2';

export interface PokeAPIMoveData {
  id: number;
  name: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
  priority: number;
  type: {
    name: string;
  };
  damage_class: {
    name: string;
  };
  effect_entries: Array<{
    effect: string;
    short_effect: string;
    language: { name: string };
  }>;
  effect_chance: number | null;
  target: {
    name: string;
  };
  flavor_text_entries: Array<{
    flavor_text: string;
    language: { name: string };
    version_group: { name: string };
  }>;
}

export interface PokemonMoveLearnData {
  move: {
    name: string;
    url: string;
  };
  version_group_details: Array<{
    level_learned_at: number;
    move_learn_method: {
      name: string;
    };
    version_group: {
      name: string;
    };
  }>;
}

// Cache for move data to avoid repeated API calls
const moveCache = new Map<string, PokeAPIMoveData>();
const pokemonMoveCache = new Map<number, string[]>();

/**
 * Fetch detailed move data from PokeAPI
 */
export async function fetchMoveDetails(moveName: string): Promise<PokeAPIMoveData> {
  // Check cache first
  if (moveCache.has(moveName)) {
    return moveCache.get(moveName)!;
  }

  try {
    const response = await fetch(`${REST_ENDPOINT}/move/${moveName}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch move: ${moveName}`);
    }
    
    const moveData = await response.json() as PokeAPIMoveData;
    moveCache.set(moveName, moveData);
    return moveData;
  } catch (error) {
    console.error(`Error fetching move ${moveName}:`, error);
    throw error;
  }
}

/**
 * Fetch all moves a Pokemon can learn
 */
export async function fetchPokemonMoves(pokemonId: number): Promise<string[]> {
  // Check cache first
  if (pokemonMoveCache.has(pokemonId)) {
    return pokemonMoveCache.get(pokemonId)!;
  }

  try {
    const response = await fetch(`${REST_ENDPOINT}/pokemon/${pokemonId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokemon: ${pokemonId}`);
    }
    
    const pokemonData = await response.json();
    const moves = pokemonData.moves.map((moveEntry: PokemonMoveLearnData) => 
      moveEntry.move.name
    );
    
    pokemonMoveCache.set(pokemonId, moves);
    return moves;
  } catch (error) {
    console.error(`Error fetching moves for Pokemon ${pokemonId}:`, error);
    throw error;
  }
}

/**
 * Map PokeAPI move effects to our battle system effects
 */
export function mapMoveEffect(moveData: PokeAPIMoveData): string | undefined {
  const effectText = moveData.effect_entries
    .find(entry => entry.language.name === 'en')?.effect.toLowerCase() || '';
  
  // Status condition effects
  if (effectText.includes('paralyzes') || effectText.includes('paralysis')) return 'paralyze';
  if (effectText.includes('burns') || effectText.includes('burn')) return 'burn';
  if (effectText.includes('poisons') || effectText.includes('poison')) {
    return effectText.includes('badly') ? 'bad_poison' : 'poison';
  }
  if (effectText.includes('freezes') || effectText.includes('freeze')) return 'freeze';
  if (effectText.includes('sleep')) return 'sleep';
  if (effectText.includes('confuses') || effectText.includes('confusion')) return 'confuse';
  if (effectText.includes('flinch')) return 'flinch';
  
  // Stat changes
  if (effectText.includes('raises the user\'s attack') || effectText.includes('sharply raises the user\'s attack')) {
    return effectText.includes('sharply') ? 'raise_attack_2' : 'raise_attack';
  }
  if (effectText.includes('raises the user\'s defense')) {
    return effectText.includes('sharply') ? 'raise_defense_2' : 'raise_defense';
  }
  if (effectText.includes('raises the user\'s special attack')) {
    return effectText.includes('sharply') ? 'raise_special_attack_2' : 'raise_special_attack';
  }
  if (effectText.includes('raises the user\'s special defense')) {
    return effectText.includes('sharply') ? 'raise_special_defense_2' : 'raise_special_defense';
  }
  if (effectText.includes('raises the user\'s speed')) {
    return effectText.includes('sharply') ? 'raise_speed_2' : 'raise_speed';
  }
  
  if (effectText.includes('lowers the target\'s attack')) {
    return effectText.includes('sharply') ? 'lower_attack_2' : 'lower_attack';
  }
  if (effectText.includes('lowers the target\'s defense')) {
    return effectText.includes('sharply') ? 'lower_defense_2' : 'lower_defense';
  }
  if (effectText.includes('lowers the target\'s special attack')) {
    return effectText.includes('sharply') ? 'lower_special_attack_2' : 'lower_special_attack';
  }
  if (effectText.includes('lowers the target\'s special defense')) {
    return effectText.includes('sharply') ? 'lower_special_defense_2' : 'lower_special_defense';
  }
  if (effectText.includes('lowers the target\'s speed')) {
    return effectText.includes('sharply') ? 'lower_speed_2' : 'lower_speed';
  }
  
  // Protection and healing
  if (effectText.includes('protects') || moveData.name === 'protect') return 'protect';
  if (effectText.includes('restores') && effectText.includes('hp')) {
    if (effectText.includes('half') || effectText.includes('50%')) return 'heal_50';
    if (effectText.includes('full') || effectText.includes('all')) return 'heal_100';
    return 'heal_25';
  }
  if (moveData.name === 'rest') return 'rest';
  
  // Special cases
  if (moveData.name === 'light-screen') return 'light_screen';
  if (moveData.name === 'reflect') return 'reflect';
  if (moveData.name === 'toxic') return 'bad_poison';
  if (moveData.name === 'will-o-wisp') return 'burn';
  if (moveData.name === 'thunder-wave') return 'paralyze';
  
  return undefined;
}

/**
 * Map PokeAPI target to our battle system target
 */
export function mapMoveTarget(target: string): 'opponent' | 'self' | 'all' | 'all-opponents' | 'all-allies' {
  switch (target) {
    case 'selected-pokemon':
    case 'opponents-field':
    case 'random-opponent':
      return 'opponent';
    case 'user':
    case 'users-field':
      return 'self';
    case 'all-pokemon':
    case 'entire-field':
      return 'all';
    case 'all-opponents':
    case 'all-other-pokemon':
      return 'all-opponents';
    case 'all-allies':
    case 'users-party':
      return 'all-allies';
    default:
      return 'opponent';
  }
}

/**
 * Convert PokeAPI move data to our BattleMove format
 */
export function convertToBattleMove(moveData: PokeAPIMoveData): BattleMove {
  // Get English flavor text for description
  const description = moveData.flavor_text_entries
    .find(entry => entry.language.name === 'en')?.flavor_text
    .replace(/\n/g, ' ') || `${moveData.name} - A Pokemon move.`;

  return {
    name: moveData.name,
    type: moveData.type.name,
    power: moveData.power || 0,
    accuracy: moveData.accuracy || 100,
    pp: moveData.pp,
    currentPP: moveData.pp,
    damageClass: moveData.damage_class.name as 'physical' | 'special' | 'status',
    priority: moveData.priority,
    effect: mapMoveEffect(moveData),
    target: mapMoveTarget(moveData.target.name),
    description
  };
}

/**
 * Select appropriate moves for a Pokemon based on level and type
 */
export async function selectPokemonMoves(
  pokemonId: number, 
  pokemonTypes: string[], 
  level: number,
  maxMoves: number = 4
): Promise<BattleMove[]> {
  try {
    // Get all moves the Pokemon can learn
    const allMoves = await fetchPokemonMoves(pokemonId);
    
    if (allMoves.length === 0) {
      // Fallback to basic moves
      return getDefaultMoveset(pokemonTypes);
    }

    const selectedMoves: BattleMove[] = [];
    const damageMovesAdded: string[] = [];
    const statusMovesAdded: string[] = [];

    // Helper function to add move if not already added
    const tryAddMove = async (moveName: string): Promise<boolean> => {
      if (selectedMoves.length >= maxMoves) return false;
      if (selectedMoves.some(m => m.name === moveName)) return false;

      try {
        const moveData = await fetchMoveDetails(moveName);
        const battleMove = convertToBattleMove(moveData);
        selectedMoves.push(battleMove);
        
        if (battleMove.power > 0) {
          damageMovesAdded.push(moveName);
        } else {
          statusMovesAdded.push(moveName);
        }
        return true;
      } catch (error) {
        console.warn(`Failed to fetch move ${moveName}:`, error);
        return false;
      }
    };

    // 1. Prioritize STAB (Same Type Attack Bonus) moves
    const stabMoves = [];
    for (const moveName of allMoves.slice(0, 20)) { // Limit API calls
      try {
        const moveData = await fetchMoveDetails(moveName);
        if (pokemonTypes.includes(moveData.type.name) && moveData.power && moveData.power > 0) {
          stabMoves.push(moveName);
        }
      } catch (error) {
        // Skip moves that can't be fetched
        continue;
      }
    }

    // Add 1-2 STAB moves
    const shuffledStabMoves = stabMoves.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(2, shuffledStabMoves.length); i++) {
      await tryAddMove(shuffledStabMoves[i]);
    }

    // 2. Add variety: ensure at least 2 damage moves total
    if (damageMovesAdded.length < 2) {
      for (const moveName of allMoves.slice(0, 30).sort(() => Math.random() - 0.5)) {
        if (selectedMoves.length >= maxMoves) break;
        
        try {
          const moveData = await fetchMoveDetails(moveName);
          if (moveData.power && moveData.power > 0 && !selectedMoves.some(m => m.name === moveName)) {
            await tryAddMove(moveName);
            if (damageMovesAdded.length >= 2) break;
          }
        } catch (error) {
          continue;
        }
      }
    }

    // 3. Add 1-2 status moves for strategy
    const strategicStatusMoves = ['protect', 'toxic', 'thunder-wave', 'will-o-wisp', 'recover', 'rest', 'swords-dance'];
    for (const moveName of strategicStatusMoves) {
      if (selectedMoves.length >= maxMoves) break;
      if (allMoves.includes(moveName) && statusMovesAdded.length < 2) {
        await tryAddMove(moveName);
      }
    }

    // 4. Fill remaining slots with random moves
    const remainingMoves = allMoves
      .filter(move => !selectedMoves.some(sm => sm.name === move))
      .sort(() => Math.random() - 0.5)
      .slice(0, 10); // Limit API calls

    for (const moveName of remainingMoves) {
      if (selectedMoves.length >= maxMoves) break;
      await tryAddMove(moveName);
    }

    // Ensure we have at least 2 damage moves (fallback)
    const finalDamageMoves = selectedMoves.filter(m => m.power > 0);
    if (finalDamageMoves.length < 2) {
      const fallbackMoves = getDefaultMoveset(pokemonTypes);
      for (const fallbackMove of fallbackMoves) {
        if (selectedMoves.length >= maxMoves) break;
        if (fallbackMove.power > 0 && !selectedMoves.some(m => m.name === fallbackMove.name)) {
          selectedMoves.push(fallbackMove);
        }
      }
    }

    return selectedMoves.slice(0, maxMoves);

  } catch (error) {
    console.error(`Error selecting moves for Pokemon ${pokemonId}:`, error);
    return getDefaultMoveset(pokemonTypes);
  }
}

/**
 * Fallback moveset when API fails
 */
function getDefaultMoveset(types: string[]): BattleMove[] {
  const defaultMoves: BattleMove[] = [
    {
      name: 'tackle',
      type: 'normal',
      power: 40,
      accuracy: 100,
      pp: 35,
      currentPP: 35,
      damageClass: 'physical',
      priority: 0,
      target: 'opponent',
      description: 'A physical attack in which the user charges and slams into the target with its whole body.'
    },
    {
      name: 'growl',
      type: 'normal',
      power: 0,
      accuracy: 100,
      pp: 40,
      currentPP: 40,
      damageClass: 'status',
      priority: 0,
      target: 'all-opponents',
      description: 'The user growls in an endearing way, making opposing Pokémon less wary. This lowers their Attack stats.',
      effect: 'lower_attack'
    }
  ];

  // Add type-specific moves
  if (types.includes('fire')) {
    defaultMoves.push({
      name: 'ember',
      type: 'fire',
      power: 40,
      accuracy: 100,
      pp: 25,
      currentPP: 25,
      damageClass: 'special',
      priority: 0,
      target: 'opponent',
      description: 'The target is attacked with small flames. This may also leave the target with a burn.',
      effect: 'burn'
    });
  } else if (types.includes('water')) {
    defaultMoves.push({
      name: 'water-gun',
      type: 'water',
      power: 40,
      accuracy: 100,
      pp: 25,
      currentPP: 25,
      damageClass: 'special',
      priority: 0,
      target: 'opponent',
      description: 'The target is blasted with a forceful shot of water.'
    });
  } else if (types.includes('electric')) {
    defaultMoves.push({
      name: 'thunder-shock',
      type: 'electric',
      power: 40,
      accuracy: 100,
      pp: 30,
      currentPP: 30,
      damageClass: 'special',
      priority: 0,
      target: 'opponent',
      description: 'A jolt of electricity crashes down on the target to inflict damage. This may also leave the target with paralysis.',
      effect: 'paralyze'
    });
  } else if (types.includes('grass')) {
    defaultMoves.push({
      name: 'vine-whip',
      type: 'grass',
      power: 45,
      accuracy: 100,
      pp: 25,
      currentPP: 25,
      damageClass: 'physical',
      priority: 0,
      target: 'opponent',
      description: 'The target is struck with slender, whiplike vines to inflict damage.'
    });
  }

  // Add a status move
  defaultMoves.push({
    name: 'protect',
    type: 'normal',
    power: 0,
    accuracy: 100,
    pp: 10,
    currentPP: 10,
    damageClass: 'status',
    priority: 4,
    target: 'self',
    description: 'Enables the user to evade all attacks. Its chance of failing rises if it is used in succession.',
    effect: 'protect'
  });

  return defaultMoves.slice(0, 4);
}

/**
 * Batch fetch multiple moves for better performance
 */
export async function batchFetchMoves(moveNames: string[]): Promise<Map<string, PokeAPIMoveData>> {
  const results = new Map<string, PokeAPIMoveData>();
  const promises = moveNames.map(async (moveName) => {
    try {
      const moveData = await fetchMoveDetails(moveName);
      results.set(moveName, moveData);
    } catch (error) {
      console.warn(`Failed to fetch move: ${moveName}`, error);
    }
  });

  await Promise.all(promises);
  return results;
} 