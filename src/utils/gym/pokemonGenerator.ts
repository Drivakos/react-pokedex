import { GymPokemon, GymType } from './types';
import { selectPokemonMoves } from '../../services/moves';
import { BattleEngine } from '../battleEngine';
import { generateRandom, generateByMethod } from '../randomMoveGenerator';


// Enhanced Pokemon data fetcher that gets complete game-accurate information
export const fetchCompletePokemonData = async (pokemonId: number): Promise<any> => {
  try {
    // Fetch both Pokemon and Species data for complete information
    const [pokemonResponse, speciesResponse] = await Promise.all([
      fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`),
      fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`)
    ]);

    if (!pokemonResponse.ok || !speciesResponse.ok) {
      throw new Error(`Failed to fetch Pokemon data for ID ${pokemonId}`);
    }

    const pokemonData = await pokemonResponse.json();
    const speciesData = await speciesResponse.json();

    // Extract game-accurate data
    return {
      id: pokemonData.id,
      name: pokemonData.name,
      species: speciesData.name,
      types: pokemonData.types.map((type: any) => type.type.name),
      abilities: pokemonData.abilities.map((ability: any) => ({
        name: ability.ability.name,
        isHidden: ability.is_hidden,
        slot: ability.slot
      })),
      baseStats: {
        hp: pokemonData.stats[0].base_stat,
        attack: pokemonData.stats[1].base_stat,
        defense: pokemonData.stats[2].base_stat,
        'special-attack': pokemonData.stats[3].base_stat,
        'special-defense': pokemonData.stats[4].base_stat,
        speed: pokemonData.stats[5].base_stat
      },
      moves: pokemonData.moves, // Complete moveset with learn methods and levels
      sprites: pokemonData.sprites,
      height: pokemonData.height,
      weight: pokemonData.weight,
      baseExperience: pokemonData.base_experience,
      evolutionChain: speciesData.evolution_chain,
      habitat: speciesData.habitat,
      generation: speciesData.generation
    };
  } catch (error) {
    console.error(`Error fetching complete Pokemon data for ID ${pokemonId}:`, error);
    return null;
  }
};

// Generate authentic movesets from Pokemon's actual learnset
export const generateAuthenticMoveSet = async (pokemonData: any, level: number): Promise<any[]> => {
  try {
    console.log(`Generating authentic moveset for ${pokemonData.name} at level ${level}`);
    
    // Extract moves the Pokemon can actually learn
    const availableMoves: any[] = [];
    
    for (const moveEntry of pokemonData.moves) {
      const moveName = moveEntry.move.name;
      
      // Check all version groups to find valid learn methods
      for (const versionGroupDetail of moveEntry.version_group_details) {
        const learnMethod = versionGroupDetail.move_learn_method.name;
        const levelLearned = versionGroupDetail.level_learned_at;
        
        // Include moves based on valid learn methods
        const validMethods = ['level-up', 'machine', 'tutor', 'egg'];
        if (validMethods.includes(learnMethod)) {
          // For level-up moves, only include if Pokemon level is sufficient
          if (learnMethod === 'level-up' && levelLearned > level) {
            continue;
          }
          
          availableMoves.push({
            name: moveName,
            learnMethod,
            levelLearned,
            versionGroup: versionGroupDetail.version_group.name
          });
          break; // Only need one valid entry per move
        }
      }
    }

    console.log(`Found ${availableMoves.length} available moves for ${pokemonData.name}`);

    if (availableMoves.length === 0) {
      console.warn(`No moves found for ${pokemonData.name}, using fallback`);
      return generateFallbackMoves(pokemonData.types, level);
    }

    // Fetch detailed data for selected moves
    const selectedMoves: any[] = [];
    const processedMoves = new Set<string>();

    // Prioritize STAB moves
    const stabMoves = availableMoves.filter(move => {
      return pokemonData.types.some((type: string) => 
        move.name.includes(type) || isSTABMove(move.name, pokemonData.types)
      );
    });

    // Add 1-2 STAB moves
    for (const moveEntry of shuffleArray(stabMoves).slice(0, 2)) {
      if (selectedMoves.length >= 4) break;
      
      try {
        const moveDetails = await fetchMoveDetails(moveEntry.name);
        if (moveDetails && !processedMoves.has(moveEntry.name)) {
          selectedMoves.push(convertToGymMove(moveDetails, moveEntry));
          processedMoves.add(moveEntry.name);
        }
      } catch (error) {
        console.warn(`Failed to fetch details for move ${moveEntry.name}`);
      }
    }

    // Add coverage moves (different types)
    const coverageMoves = availableMoves.filter(move => 
      !pokemonData.types.some((type: string) => 
        move.name.includes(type) || isSTABMove(move.name, pokemonData.types)
      )
    );

    for (const moveEntry of shuffleArray(coverageMoves).slice(0, 2)) {
      if (selectedMoves.length >= 4) break;
      
      try {
        const moveDetails = await fetchMoveDetails(moveEntry.name);
        if (moveDetails && !processedMoves.has(moveEntry.name)) {
          selectedMoves.push(convertToGymMove(moveDetails, moveEntry));
          processedMoves.add(moveEntry.name);
        }
      } catch (error) {
        console.warn(`Failed to fetch details for move ${moveEntry.name}`);
      }
    }

    // Fill remaining slots with any available moves
    for (const moveEntry of shuffleArray(availableMoves)) {
      if (selectedMoves.length >= 4) break;
      
      if (!processedMoves.has(moveEntry.name)) {
        try {
          const moveDetails = await fetchMoveDetails(moveEntry.name);
          if (moveDetails) {
            selectedMoves.push(convertToGymMove(moveDetails, moveEntry));
            processedMoves.add(moveEntry.name);
          }
        } catch (error) {
          console.warn(`Failed to fetch details for move ${moveEntry.name}`);
        }
      }
    }

    // Ensure we have at least 4 moves
    while (selectedMoves.length < 4) {
      const fallbackMoves = generateFallbackMoves(pokemonData.types, level);
      for (const fallbackMove of fallbackMoves) {
        if (selectedMoves.length >= 4) break;
        if (!processedMoves.has(fallbackMove.name)) {
          selectedMoves.push(fallbackMove);
          processedMoves.add(fallbackMove.name);
        }
      }
    }

    console.log(`Generated moveset for ${pokemonData.name}: ${selectedMoves.map(m => m.name).join(', ')}`);
    return selectedMoves.slice(0, 4);

  } catch (error) {
    console.error(`Error generating authentic moveset for ${pokemonData.name}:`, error);
    return generateFallbackMoves(pokemonData.types || ['normal'], level);
  }
};

// Fetch detailed move information from PokeAPI
const fetchMoveDetails = async (moveName: string): Promise<any> => {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/move/${moveName}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch move ${moveName}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`Error fetching move details for ${moveName}:`, error);
    return null;
  }
};

// Convert PokeAPI move data to our gym move format
const convertToGymMove = (moveData: any, learnData: any): any => {
  return {
    name: moveData.name,
    type: moveData.type.name,
    power: moveData.power || 0,
    accuracy: moveData.accuracy || 100,
    pp: moveData.pp || 10,
    currentPP: moveData.pp || 10,
    damageClass: moveData.damage_class.name,
    priority: moveData.priority || 0,
    target: moveData.target.name,
    description: moveData.flavor_text_entries.find((entry: any) => 
      entry.language.name === 'en'
    )?.flavor_text || `${moveData.name} - A ${moveData.type.name} type move`,
    effect: moveData.effect_entries.find((entry: any) => 
      entry.language.name === 'en'
    )?.short_effect || '',
    learnMethod: learnData.learnMethod,
    levelLearned: learnData.levelLearned
  };
};

// Check if a move is STAB (Same Type Attack Bonus)
const isSTABMove = (moveName: string, pokemonTypes: string[]): boolean => {
  // Common STAB move patterns
  const stabPatterns: Record<string, string[]> = {
    fire: ['flame', 'fire', 'heat', 'blaze', 'burn'],
    water: ['water', 'surf', 'hydro', 'aqua', 'bubble'],
    electric: ['thunder', 'electric', 'shock', 'bolt', 'spark'],
    grass: ['leaf', 'grass', 'solar', 'vine', 'seed', 'petal'],
    psychic: ['psychic', 'psych', 'mental', 'mind', 'confusion'],
    ice: ['ice', 'freeze', 'frost', 'blizzard', 'hail'],
    dragon: ['dragon', 'draco'],
    dark: ['dark', 'night', 'shadow', 'bite'],
    steel: ['steel', 'iron', 'metal'],
    fairy: ['fairy', 'moon', 'charm', 'play'],
    fighting: ['fight', 'combat', 'punch', 'kick', 'chop'],
    poison: ['poison', 'toxic', 'acid', 'sludge'],
    ground: ['earth', 'ground', 'sand', 'dig'],
    flying: ['air', 'wind', 'fly', 'wing', 'gust'],
    bug: ['bug', 'web', 'sting', 'swarm'],
    rock: ['rock', 'stone', 'slide'],
    ghost: ['ghost', 'shadow', 'spirit', 'phantom'],
    normal: ['tackle', 'scratch', 'pound', 'slam']
  };

  return pokemonTypes.some(type => {
    const patterns = stabPatterns[type] || [];
    return patterns.some(pattern => moveName.includes(pattern));
  });
};

// Utility function to shuffle array
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Get authentic ability for Pokemon based on its actual ability list
export const getAuthenticAbility = (pokemonData: any): string => {
  if (!pokemonData.abilities || pokemonData.abilities.length === 0) {
    return 'pressure'; // Fallback
  }

  // Prefer non-hidden abilities for competitive balance
  const normalAbilities = pokemonData.abilities.filter((ability: any) => !ability.isHidden);
  const availableAbilities = normalAbilities.length > 0 ? normalAbilities : pokemonData.abilities;

  // Select random ability from available ones
  const selectedAbility = availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
  
  // All abilities are supported in native Showdown
  return selectedAbility.name.toLowerCase();
};

// Calculate competitive stats with IVs, EVs, and nature
export const calculateCompetitiveStats = (baseStats: any, level: number, nature: string = 'hardy'): any => {
  // Competitive IVs (31 in all stats)
  const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
  
  // Random competitive EV spread
  const evSpreads = [
    { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 },     // Physical Attacker
    { hp: 252, atk: 0, def: 4, spa: 252, spd: 0, spe: 0 },     // Special Attacker
    { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },     // Physical Wall
    { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },     // Special Wall
    { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },     // Fast Physical
    { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },     // Fast Special
    { hp: 252, atk: 0, def: 128, spa: 0, spd: 128, spe: 0 }    // Balanced Bulk
  ];
  
  const evs = evSpreads[Math.floor(Math.random() * evSpreads.length)];

  // Nature modifiers
  const natureModifiers = getNatureModifiers(nature);

  // Calculate final stats
  const hp = Math.floor(((2 * baseStats.hp + ivs.hp + Math.floor(evs.hp / 4)) * level) / 100) + level + 10;
  const attack = Math.floor((Math.floor(((2 * baseStats.attack + ivs.atk + Math.floor(evs.atk / 4)) * level) / 100) + 5) * natureModifiers.attack);
  const defense = Math.floor((Math.floor(((2 * baseStats.defense + ivs.def + Math.floor(evs.def / 4)) * level) / 100) + 5) * natureModifiers.defense);
  const specialAttack = Math.floor((Math.floor(((2 * baseStats['special-attack'] + ivs.spa + Math.floor(evs.spa / 4)) * level) / 100) + 5) * natureModifiers.specialAttack);
  const specialDefense = Math.floor((Math.floor(((2 * baseStats['special-defense'] + ivs.spd + Math.floor(evs.spd / 4)) * level) / 100) + 5) * natureModifiers.specialDefense);
  const speed = Math.floor((Math.floor(((2 * baseStats.speed + ivs.spe + Math.floor(evs.spe / 4)) * level) / 100) + 5) * natureModifiers.speed);

  return {
    hp,
    attack,
    defense,
    'special-attack': specialAttack,
    'special-defense': specialDefense,
    speed,
    // Additional competitive data
    ivs,
    evs,
    nature
  };
};

// Get nature stat modifiers
const getNatureModifiers = (nature: string): any => {
  const natures: Record<string, any> = {
    'hardy': { attack: 1, defense: 1, specialAttack: 1, specialDefense: 1, speed: 1 },
    'lonely': { attack: 1.1, defense: 0.9, specialAttack: 1, specialDefense: 1, speed: 1 },
    'brave': { attack: 1.1, defense: 1, specialAttack: 1, specialDefense: 1, speed: 0.9 },
    'adamant': { attack: 1.1, defense: 1, specialAttack: 0.9, specialDefense: 1, speed: 1 },
    'naughty': { attack: 1.1, defense: 1, specialAttack: 1, specialDefense: 0.9, speed: 1 },
    'bold': { attack: 0.9, defense: 1.1, specialAttack: 1, specialDefense: 1, speed: 1 },
    'docile': { attack: 1, defense: 1, specialAttack: 1, specialDefense: 1, speed: 1 },
    'relaxed': { attack: 1, defense: 1.1, specialAttack: 1, specialDefense: 1, speed: 0.9 },
    'impish': { attack: 1, defense: 1.1, specialAttack: 0.9, specialDefense: 1, speed: 1 },
    'lax': { attack: 1, defense: 1.1, specialAttack: 1, specialDefense: 0.9, speed: 1 },
    'timid': { attack: 0.9, defense: 1, specialAttack: 1, specialDefense: 1, speed: 1.1 },
    'hasty': { attack: 1, defense: 0.9, specialAttack: 1, specialDefense: 1, speed: 1.1 },
    'serious': { attack: 1, defense: 1, specialAttack: 1, specialDefense: 1, speed: 1 },
    'jolly': { attack: 1, defense: 1, specialAttack: 0.9, specialDefense: 1, speed: 1.1 },
    'naive': { attack: 1, defense: 1, specialAttack: 1, specialDefense: 0.9, speed: 1.1 },
    'modest': { attack: 0.9, defense: 1, specialAttack: 1.1, specialDefense: 1, speed: 1 },
    'mild': { attack: 1, defense: 0.9, specialAttack: 1.1, specialDefense: 1, speed: 1 },
    'quiet': { attack: 1, defense: 1, specialAttack: 1.1, specialDefense: 1, speed: 0.9 },
    'bashful': { attack: 1, defense: 1, specialAttack: 1, specialDefense: 1, speed: 1 },
    'rash': { attack: 1, defense: 1, specialAttack: 1.1, specialDefense: 0.9, speed: 1 },
    'calm': { attack: 0.9, defense: 1, specialAttack: 1, specialDefense: 1.1, speed: 1 },
    'gentle': { attack: 1, defense: 0.9, specialAttack: 1, specialDefense: 1.1, speed: 1 },
    'sassy': { attack: 1, defense: 1, specialAttack: 1, specialDefense: 1.1, speed: 0.9 },
    'careful': { attack: 1, defense: 1, specialAttack: 0.9, specialDefense: 1.1, speed: 1 },
    'quirky': { attack: 1, defense: 1, specialAttack: 1, specialDefense: 1, speed: 1 }
  };

  return natures[nature.toLowerCase()] || natures['hardy'];
};

// Enhanced Pokemon creation with authentic game data
export const createGymPokemon = async (basePokemon: any, level: number, isRandomized: boolean = false): Promise<GymPokemon> => {
  try {
    // Fetch complete Pokemon data if we only have basic info
    let completeData = basePokemon;
    if (!basePokemon.abilities || !basePokemon.moves) {
      console.log(`Fetching complete data for ${basePokemon.name} (ID: ${basePokemon.id})`);
      completeData = await fetchCompletePokemonData(basePokemon.id);
      if (!completeData) {
        console.warn(`Failed to fetch complete data for ${basePokemon.name}, using basic data`);
        completeData = basePokemon;
      }
    }

    // Use authentic base stats
    const baseStats = completeData.baseStats || {
      hp: 100, attack: 80, defense: 80,
      'special-attack': 80, 'special-defense': 80, speed: 80
    };

    // Generate competitive nature
    const nature = getRandomNature();

    // Calculate accurate competitive stats
    const competitiveStats = calculateCompetitiveStats(baseStats, level, nature);

    // Generate authentic moveset from Pokemon's real movepool
    const moves = await generateAuthenticMoveSet(completeData, level);

    // Get authentic ability from Pokemon's actual ability list
    const ability = getAuthenticAbility(completeData);

    // Assign competitive item (optional for variety)
    const item = getRandomCompetitiveItem();

    console.log(`Created ${completeData.name}: Level ${level}, Ability: ${ability}, Nature: ${nature}`);
    console.log(`  Stats: HP:${competitiveStats.hp} ATK:${competitiveStats.attack} DEF:${competitiveStats.defense} SPA:${competitiveStats['special-attack']} SPD:${competitiveStats['special-defense']} SPE:${competitiveStats.speed}`);
    console.log(`  Moves: ${moves.map(m => m.name).join(', ')}`);

    return {
      id: completeData.id,
      name: completeData.name,
      species: completeData.species || completeData.name,
      types: completeData.types || ['normal'],
      sprites: {
        front_default: completeData.sprites?.other?.['official-artwork']?.front_default || 
                      completeData.sprites?.front_default || '',
        back_default: completeData.sprites?.back_default || 
                     completeData.sprites?.front_default || ''
      },
      stats: {
        hp: competitiveStats.hp,
        attack: competitiveStats.attack,
        defense: competitiveStats.defense,
        'special-attack': competitiveStats['special-attack'],
        'special-defense': competitiveStats['special-defense'],
        speed: competitiveStats.speed
      },
      baseStats,
      moves,
      level,
      currentHp: competitiveStats.hp,
      maxHp: competitiveStats.hp,
      ability,
      nature,
      item,
      status: null,
      statusTurns: 0,
      // Additional competitive data
      ivs: competitiveStats.ivs,
      evs: competitiveStats.evs,
      experience: Math.floor(Math.pow(level, 3)),
      happiness: 255
    };

  } catch (error) {
    console.error(`Error creating competitive Pokemon for ${basePokemon.name}:`, error);
    
    // Fallback to basic creation
    return createBasicGymPokemon(basePokemon, level);
  }
};

// Fallback function for basic Pokemon creation
const createBasicGymPokemon = (basePokemon: any, level: number): GymPokemon => {
  const baseStats = basePokemon.stats || {
    hp: 100, attack: 80, defense: 80,
    'special-attack': 80, 'special-defense': 80, speed: 80
  };

  const nature = getRandomNature();
  const competitiveStats = calculateCompetitiveStats(baseStats, level, nature);
  const ability = getRandomAbilityForPokemon(basePokemon.name, basePokemon.types || ['normal']);
  const moves = generateFallbackMoves(basePokemon.types || ['normal'], level);

  return {
    id: basePokemon.id,
    name: basePokemon.name,
    types: basePokemon.types || ['normal'],
    sprites: {
      front_default: basePokemon.sprites?.other?.['official-artwork']?.front_default || 
                    basePokemon.sprites?.front_default || '',
      back_default: basePokemon.sprites?.back_default || 
                   basePokemon.sprites?.front_default || ''
    },
    stats: {
      hp: competitiveStats.hp,
      attack: competitiveStats.attack,
      defense: competitiveStats.defense,
      'special-attack': competitiveStats['special-attack'],
      'special-defense': competitiveStats['special-defense'],
      speed: competitiveStats.speed
    },
    moves,
    level,
    currentHp: competitiveStats.hp,
    maxHp: competitiveStats.hp,
    ability,
    nature,
    item: null,
    status: null,
    statusTurns: 0
  };
};

// Get random competitive item
const getRandomCompetitiveItem = (): string | null => {
  const competitiveItems = [
    null, null, null, // 60% chance of no item for balance
    'leftovers',
    'life-orb',
    'choice-band',
    'choice-specs',
    'choice-scarf',
    'rocky-helmet',
    'assault-vest',
    'focus-sash',
    'sitrus-berry',
    'lum-berry'
  ];

  return competitiveItems[Math.floor(Math.random() * competitiveItems.length)];
};

// Legacy synchronous version for backward compatibility
export const createGymPokemonSync = (basePokemon: any, level: number, isRandomized: boolean = false): GymPokemon => {
  console.log(`Creating sync Pokemon: ${basePokemon.name}`);
  return createBasicGymPokemon(basePokemon, level);
};

// Generate a smart moveset for a Pokemon
export const generateMoveset = (pokemon: any, isRandomized: boolean = false) => {
  const pokemonMoves = pokemon.moves || [];
  const pokemonTypes = pokemon.types || ['normal'];
  
  // Create a pool of potential moves
  const movePool: any[] = [];
  
  // Add moves from Pokemon's actual moveset if available
  if (pokemonMoves.length > 0) {
    pokemonMoves.forEach((move: string) => {
      const moveName = move.replace(/-/g, ' ');
      movePool.push({
        name: move,
        type: pokemonTypes[0], // Default to first type
        power: getMovePowerByName(move),
        accuracy: 100,
        pp: getMovePPByName(move),
        damageClass: getMovePowerByName(move) > 0 ? 'physical' as const : 'status' as const,
        description: `${moveName} - A ${pokemonTypes[0]} type move`
      });
    });
  }
  
  // Add type-specific moves to ensure good coverage
  pokemonTypes.forEach((type: string) => {
    movePool.push({
      name: `${type}-blast`,
      type: type,
      power: 90,
      accuracy: 100,
      pp: 15,
      damageClass: 'special' as const,
      description: `A powerful ${type} type attack`
    });
    
    movePool.push({
      name: `${type}-strike`,
      type: type,
      power: 70,
      accuracy: 100,
      pp: 20,
      damageClass: 'physical' as const,
      description: `A ${type} type physical attack`
    });
  });
  
  // Add some universal moves
  movePool.push(
    { name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, damageClass: 'physical' as const, description: 'A basic physical attack' },
    { name: 'quick-attack', type: 'normal', power: 40, accuracy: 100, pp: 30, damageClass: 'physical' as const, description: 'A priority attack' },
    { name: 'rest', type: 'psychic', power: 0, accuracy: 100, pp: 10, damageClass: 'status' as const, description: 'Restores HP completely and causes sleep' },
    { name: 'protect', type: 'normal', power: 0, accuracy: 100, pp: 10, damageClass: 'status' as const, description: 'Protects from attacks this turn' },
    { name: 'growl', type: 'normal', power: 0, accuracy: 100, pp: 40, damageClass: 'status' as const, description: 'Lowers the target\'s Attack' },
    { name: 'swords-dance', type: 'normal', power: 0, accuracy: 100, pp: 20, damageClass: 'status' as const, description: 'Sharply raises user\'s Attack' },
    { name: 'thunder-wave', type: 'electric', power: 0, accuracy: 90, pp: 20, damageClass: 'status' as const, description: 'Paralyzes the target' },
    { name: 'toxic', type: 'poison', power: 0, accuracy: 90, pp: 10, damageClass: 'status' as const, description: 'Badly poisons the target' },
    { name: 'will-o-wisp', type: 'fire', power: 0, accuracy: 85, pp: 15, damageClass: 'status' as const, description: 'Burns the target' },
    { name: 'recover', type: 'normal', power: 0, accuracy: 100, pp: 10, damageClass: 'status' as const, description: 'Restores 50% of max HP' }
  );
  
  // Shuffle and pick 4 moves, ensuring at least 2 attacking moves
  const shuffled = [...movePool].sort(() => Math.random() - 0.5);
  const attackingMoves = shuffled.filter(move => move.power > 0);
  const statusMoves = shuffled.filter(move => move.power === 0);
  
  const selectedMoves: any[] = [];
  
  // Ensure at least 2 attacking moves
  selectedMoves.push(...attackingMoves.slice(0, 3));
  
  // Add 1 status move if available
  if (statusMoves.length > 0) {
    selectedMoves.push(statusMoves[0]);
  } else if (attackingMoves.length > 3) {
    selectedMoves.push(attackingMoves[3]);
  }
  
  // Fill up to 4 moves
  while (selectedMoves.length < 4 && shuffled.length > selectedMoves.length) {
    const nextMove = shuffled.find(move => !selectedMoves.some(sm => sm.name === move.name));
    if (nextMove) selectedMoves.push(nextMove);
    else break;
  }
  
  // Add currentPP to each move
  return selectedMoves.slice(0, 4).map(move => ({
    ...move,
    currentPP: move.pp
  }));
};

// Helper function to assign competitive abilities to Pokemon
export const getRandomAbilityForPokemon = (pokemonName: string, types: string[]): string => {
  // Competitive ability mapping based on Pokemon types and common abilities
  const typeBasedAbilities: Record<string, string[]> = {
    fire: ['blaze', 'flash-fire', 'drought', 'flame-body'],
    water: ['torrent', 'water-absorb', 'drizzle', 'swift-swim'],
    electric: ['volt-absorb', 'motor-drive', 'lightning-rod', 'static'],
    grass: ['overgrow', 'chlorophyll', 'leaf-guard', 'sap-sipper'],
    psychic: ['synchronize', 'trace', 'magic-guard', 'telepathy'],
    ice: ['snow-warning', 'ice-body', 'slush-rush', 'snow-cloak'],
    dragon: ['multiscale', 'inner-focus', 'marvel-scale', 'shed-skin'],
    dark: ['dark-aura', 'moxie', 'justified', 'guts'],
    steel: ['levitate', 'sturdy', 'clear-body', 'heavy-metal'],
    fairy: ['pixilate', 'magic-bounce', 'cute-charm', 'competitive'],
    fighting: ['guts', 'no-guard', 'inner-focus', 'justified'],
    poison: ['poison-point', 'corrosion', 'merciless', 'immunity'],
    ground: ['arena-trap', 'sand-rush', 'sand-force', 'reckless'],
    flying: ['pressure', 'keen-eye', 'big-pecks', 'gale-wings'],
    bug: ['swarm', 'compound-eyes', 'tinted-lens', 'skill-link'],
    rock: ['sturdy', 'rock-head', 'sand-stream', 'solid-rock'],
    ghost: ['cursed-body', 'frisk', 'infiltrator', 'shadow-tag'],
    normal: ['normalize', 'natural-cure', 'serene-grace', 'skill-link']
  };

  // Universal competitive abilities that work on any Pokemon
  const universalAbilities = [
    'pressure', 'intimidate', 'trace', 'synchronize', 'natural-cure',
    'clear-body', 'serene-grace', 'keen-eye', 'inner-focus'
  ];

  // Get abilities based on primary type
  const primaryType = types[0] || 'normal';
  const typeAbilities = typeBasedAbilities[primaryType] || [];
  
  // Combine type-specific and universal abilities
  const availableAbilities = [...typeAbilities, ...universalAbilities];
  
  // All abilities are supported in native Showdown
  if (availableAbilities.length > 0) {
    return availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
  }
  
  return 'pressure'; // Default fallback ability
};

// Helper function to assign competitive natures
export const getRandomNature = (): string => {
  const competitiveNatures = [
    'adamant',    // +Atk, -SpA
    'modest',     // +SpA, -Atk  
    'timid',      // +Spe, -Atk
    'jolly',      // +Spe, -SpA
    'bold',       // +Def, -Atk
    'calm',       // +SpD, -Atk
    'impish',     // +Def, -SpA
    'careful',    // +SpD, -SpA
    'naive',      // +Spe, -SpD
    'hasty',      // +Spe, -Def
    'hardy',      // Neutral
    'docile',     // Neutral
    'serious',    // Neutral
    'bashful',    // Neutral
    'quirky'      // Neutral
  ];

  return competitiveNatures[Math.floor(Math.random() * competitiveNatures.length)];
};

// Helper functions for move data
export const getMovePowerByName = (moveName: string): number => {
  const powerMap: Record<string, number> = {
    'tackle': 40, 'scratch': 35, 'pound': 40, 'quick-attack': 40,
    'thunderbolt': 90, 'thunder': 110, 'thunder-shock': 40,
    'flamethrower': 90, 'fire-blast': 110, 'ember': 40,
    'surf': 90, 'hydro-pump': 110, 'water-gun': 40,
    'solar-beam': 120, 'petal-dance': 120, 'vine-whip': 45,
    'psychic': 90, 'confusion': 50, 'psybeam': 65,
    'ice-beam': 90, 'blizzard': 110, 'powder-snow': 40,
    'earthquake': 100, 'rock-slide': 75, 'stone-edge': 100,
    'aerial-ace': 60, 'air-slash': 75, 'fly': 90,
    'shadow-ball': 80, 'night-shade': 1, 'dark-pulse': 80,
    'iron-tail': 100, 'steel-wing': 70, 'metal-claw': 50,
    'moonblast': 95, 'dazzling-gleam': 80, 'play-rough': 90,
    'close-combat': 120, 'brick-break': 75, 'karate-chop': 50,
    'poison-jab': 80, 'sludge-bomb': 90, 'acid': 40,
    'bug-bite': 60, 'x-scissor': 80, 'pin-missile': 25
  };
  return powerMap[moveName] || (moveName.includes('blast') ? 90 : moveName.includes('strike') ? 70 : 60);
};

export const getMovePPByName = (moveName: string): number => {
  const ppMap: Record<string, number> = {
    'tackle': 35, 'scratch': 35, 'pound': 35,
    'thunderbolt': 15, 'flamethrower': 15, 'surf': 15, 'psychic': 10,
    'earthquake': 10, 'blizzard': 5, 'fire-blast': 5, 'hydro-pump': 5,
    'solar-beam': 10, 'close-combat': 5, 'rest': 10, 'protect': 10
  };
  return ppMap[moveName] || 15;
};

// Get random Pokemon of a specific type with enhanced randomization
export const getRandomPokemonOfType = (allPokemon: any[], type: string, count: number = 3) => {
  if (!allPokemon || allPokemon.length === 0) {
    console.warn('No Pokemon data available for type filtering');
    return [];
  }

  const typeFilteredPokemon = allPokemon.filter(pokemon => 
    pokemon.types && pokemon.types.includes(type)
  );

  if (typeFilteredPokemon.length === 0) {
    console.warn(`No Pokemon found for type: ${type}`);
    return allPokemon.slice(0, count); // Fallback to any Pokemon
  }

  // Enhanced shuffling: Use crypto random if available, multiple shuffle passes
  const shuffled = [...typeFilteredPokemon];
  
  // Fisher-Yates shuffle for better randomization
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Additional entropy: shuffle again with different random values
  shuffled.sort(() => (Math.random() - 0.5) * 2);
  
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

// Generate moves for the Pokemon
// Enhanced move generation using our new random move generator
const generatePokemonMoves = async (pokemonData: any, level: number): Promise<any[]> => {
  try {
    // Use our new random move generator for realistic movesets
    const battleMoves = await generateRandom(pokemonData.id, {
      maxMoves: 4,
      level,
      prioritizeSTAB: true,
      balanceTypes: true,
      learnMethods: {
        levelUp: true,
        machine: true,
        tutor: true
      },
      minDamageMoves: 2,
      maxStatusMoves: 2
    });
    
    return battleMoves.map(move => ({
      name: move.name,
      type: move.type,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
      currentPP: move.currentPP,
      damageClass: move.damageClass,
      priority: move.priority,
      effect: move.effect,
      target: move.target,
      description: move.description
    }));
  } catch (error) {
    console.warn(`Failed to generate moves for ${pokemonData.name}, using fallback`, error);
    
    // Fallback to type-based moves if API fails
    return generateFallbackMoves(pokemonData.types || ['normal'], level);
  }
};

// Fallback move generation (simplified)
const generateFallbackMoves = (types: string[], level: number): any[] => {
  const moves = [];

  // Add type-specific STAB moves first
  types.forEach(type => {
    switch (type) {
      case 'fire':
        moves.push({
          name: 'flamethrower',
          type: 'fire',
          power: 90,
          accuracy: 100,
          pp: 15,
          currentPP: 15,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The target is scorched with an intense blast of fire.'
        });
        break;
      case 'water':
        moves.push({
          name: 'surf',
          type: 'water',
          power: 90,
          accuracy: 100,
          pp: 15,
          currentPP: 15,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The user attacks everything around it by swamping its surroundings with a giant wave.'
        });
        break;
      case 'electric':
        moves.push({
          name: 'thunderbolt',
          type: 'electric',
          power: 90,
          accuracy: 100,
          pp: 15,
          currentPP: 15,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'A strong electric blast crashes down on the target. This may also leave the target with paralysis.',
          effect: 'paralyze'
        });
        break;
      case 'grass':
        moves.push({
          name: 'solar-beam',
          type: 'grass',
          power: 120,
          accuracy: 100,
          pp: 10,
          currentPP: 10,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'A two-turn attack. The user gathers light, then blasts a bundled beam on the next turn.'
        });
        break;
      case 'ice':
        moves.push({
          name: 'ice-beam',
          type: 'ice',
          power: 90,
          accuracy: 100,
          pp: 10,
          currentPP: 10,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The target is struck with an icy-cold beam of energy. This may also leave the target frozen.',
          effect: 'freeze'
        });
        break;
      case 'fighting':
        moves.push({
          name: 'close-combat',
          type: 'fighting',
          power: 120,
          accuracy: 100,
          pp: 5,
          currentPP: 5,
          damageClass: 'physical',
          priority: 0,
          target: 'opponent',
          description: 'The user fights the target up close without guarding itself.',
          effect: 'lower_defense'
        });
        break;
      case 'poison':
        moves.push({
          name: 'sludge-bomb',
          type: 'poison',
          power: 90,
          accuracy: 100,
          pp: 10,
          currentPP: 10,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'Unsanitary sludge is hurled at the target. This may also poison the target.',
          effect: 'poison'
        });
        break;
      case 'ground':
        moves.push({
          name: 'earthquake',
          type: 'ground',
          power: 100,
          accuracy: 100,
          pp: 10,
          currentPP: 10,
          damageClass: 'physical',
          priority: 0,
          target: 'opponent',
          description: 'The user sets off an earthquake that strikes every Pokémon around it.'
        });
        break;
      case 'flying':
        moves.push({
          name: 'air-slash',
          type: 'flying',
          power: 75,
          accuracy: 95,
          pp: 15,
          currentPP: 15,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The user attacks with a blade of air that slices even the sky.',
          effect: 'flinch'
        });
        break;
      case 'psychic':
        moves.push({
          name: 'psychic',
          type: 'psychic',
          power: 90,
          accuracy: 100,
          pp: 10,
          currentPP: 10,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The target is hit by a strong telekinetic force.',
          effect: 'lower_special_defense'
        });
        break;
      case 'bug':
        moves.push({
          name: 'x-scissor',
          type: 'bug',
          power: 80,
          accuracy: 100,
          pp: 15,
          currentPP: 15,
          damageClass: 'physical',
          priority: 0,
          target: 'opponent',
          description: 'The user slashes at the target by crossing its scythes or claws as if they were a pair of scissors.'
        });
        break;
      case 'rock':
        moves.push({
          name: 'stone-edge',
          type: 'rock',
          power: 100,
          accuracy: 80,
          pp: 5,
          currentPP: 5,
          damageClass: 'physical',
          priority: 0,
          target: 'opponent',
          description: 'The user stabs the target from below with sharpened stones. Critical hits land more easily.'
        });
        break;
      case 'ghost':
        moves.push({
          name: 'shadow-ball',
          type: 'ghost',
          power: 80,
          accuracy: 100,
          pp: 15,
          currentPP: 15,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The user hurls a shadowy blob at the target.',
          effect: 'lower_special_defense'
        });
        break;
      case 'dragon':
        moves.push({
          name: 'dragon-pulse',
          type: 'dragon',
          power: 85,
          accuracy: 100,
          pp: 10,
          currentPP: 10,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The target is attacked with a shock wave generated by the user\'s gaping mouth.'
        });
        break;
      case 'dark':
        moves.push({
          name: 'dark-pulse',
          type: 'dark',
          power: 80,
          accuracy: 100,
          pp: 15,
          currentPP: 15,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'The user releases a horrible aura imbued with dark thoughts.',
          effect: 'flinch'
        });
        break;
      case 'steel':
        moves.push({
          name: 'iron-tail',
          type: 'steel',
          power: 100,
          accuracy: 75,
          pp: 15,
          currentPP: 15,
          damageClass: 'physical',
          priority: 0,
          target: 'opponent',
          description: 'The target is slammed with a steel-hard tail.',
          effect: 'lower_defense'
        });
        break;
      case 'fairy':
        moves.push({
          name: 'moonblast',
          type: 'fairy',
          power: 95,
          accuracy: 100,
          pp: 15,
          currentPP: 15,
          damageClass: 'special',
          priority: 0,
          target: 'opponent',
          description: 'Borrowing the power of the moon, the user attacks the target.',
          effect: 'lower_special_attack'
        });
        break;
      default:
        // For normal type or unknown types, add tackle
        moves.push({
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
        });
    }
  });

  // Add diverse status moves to create strategic depth
  const statusMoves = [
    {
      name: 'toxic',
      type: 'poison',
      power: 0,
      accuracy: 90,
      pp: 10,
      currentPP: 10,
      damageClass: 'status',
      priority: 0,
      target: 'opponent',
      description: 'A move that leaves the target badly poisoned.',
      effect: 'bad_poison'
    },
    {
      name: 'thunder-wave',
      type: 'electric',
      power: 0,
      accuracy: 90,
      pp: 20,
      currentPP: 20,
      damageClass: 'status',
      priority: 0,
      target: 'opponent',
      description: 'The user launches a weak jolt of electricity that paralyzes the target.',
      effect: 'paralyze'
    },
    {
      name: 'will-o-wisp',
      type: 'fire',
      power: 0,
      accuracy: 85,
      pp: 15,
      currentPP: 15,
      damageClass: 'status',
      priority: 0,
      target: 'opponent',
      description: 'The user shoots a sinister, bluish-white flame at the target to inflict a burn.',
      effect: 'burn'
    },
    {
      name: 'swords-dance',
      type: 'normal',
      power: 0,
      accuracy: 100,
      pp: 20,
      currentPP: 20,
      damageClass: 'status',
      priority: 0,
      target: 'self',
      description: 'A frenetic dance to uplift the fighting spirit. This sharply raises the user\'s Attack stat.',
      effect: 'raise_attack_2'
    },
    {
      name: 'recover',
      type: 'normal',
      power: 0,
      accuracy: 100,
      pp: 10,
      currentPP: 10,
      damageClass: 'status',
      priority: 0,
      target: 'self',
      description: 'Restoring its own cells, the user restores its own HP by half of its max HP.',
      effect: 'heal_50'
    }
  ];

  // Add a second attacking move based on types or generic
  if (types.includes('fire')) {
    moves.push({
      name: 'fire-blast',
      type: 'fire',
      power: 110,
      accuracy: 85,
      pp: 5,
      currentPP: 5,
      damageClass: 'special',
      priority: 0,
      target: 'opponent',
      description: 'A searing blast of fire that may inflict a burn.',
      effect: 'burn'
    });
  } else if (types.includes('water')) {
    moves.push({
      name: 'hydro-pump',
      type: 'water',
      power: 110,
      accuracy: 80,
      pp: 5,
      currentPP: 5,
      damageClass: 'special',
      priority: 0,
      target: 'opponent',
      description: 'The target is blasted by a huge volume of water launched under great pressure.'
    });
  } else {
    moves.push({
      name: 'return',
      type: 'normal',
      power: 80,
      accuracy: 100,
      pp: 20,
      currentPP: 20,
      damageClass: 'physical',
      priority: 0,
      target: 'opponent',
      description: 'A full-power attack that grows more powerful the more the user likes its Trainer.'
    });
  }

  // Add one random status move
  const randomStatusMove = statusMoves[Math.floor(Math.random() * statusMoves.length)];
  moves.push(randomStatusMove);

  // Add protect as a defensive option
  moves.push({
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

  return moves.slice(0, 4);
}; 