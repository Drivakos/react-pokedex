import { Pokemon, RawPokemonData, Filters, PokemonDetails, TYPE_COLORS } from '../types/pokemon';
import { 
  fetchCachedPokemonById, 
  fetchCachedPokemonData, 
  fetchCachedPokemonDetails, 
  fetchCachedFilterOptions 
} from './cached-api';
import { buildCompleteWhereClause, POKEMON_FIELDS } from '../utils/query-builder';
import { transformSinglePokemon, transformRawData } from '../utils/pokemon-transform';
import { cacheAside, CACHE_KEYS, CACHE_TTL, generateSearchCacheKey, isCacheEnabled } from '../lib/redis';
// Import local database
import localPokemonDb from '../data/pokemon-db.json';
import localFilterOptions from '../data/filter-options.json';

// Use environment variables for API endpoints (fallback for direct calls)
const GRAPHQL_ENDPOINT = import.meta.env.VITE_API_GRAPHQL_URL;
const REST_ENDPOINT = import.meta.env.VITE_API_REST_URL || import.meta.env.VITE_API_URL;

// Feature flag to enable/disable caching (disabled in development by default)
const USE_CACHED_API = import.meta.env.VITE_USE_CACHED_API === 'true' && !import.meta.env.DEV;

// Validate API endpoints
if (!GRAPHQL_ENDPOINT || !REST_ENDPOINT) {
  console.error('Missing required API endpoint environment variables');
}

// Query building functions moved to ../utils/query-builder.ts

/**
 * Transform local DB Pokemon to application Pokemon type
 */
const transformLocalPokemon = (localPokemon: any): Pokemon => {
  return {
    id: localPokemon.id,
    name: localPokemon.name,
    height: localPokemon.height,
    weight: localPokemon.weight,
    types: localPokemon.types,
    moves: localPokemon.moves || [],
    sprites: {
      front_default: '', // Handled by PokemonImage component
      back_default: '',
      front_shiny: '',
      back_shiny: '',
      official_artwork: ''
    },
    generation: localPokemon.generation || 'unknown',
    has_evolutions: localPokemon.evolution?.can_evolve || false,
    is_starter: localPokemon.evolution?.is_starter || false,
    evolution_chain: localPokemon.evolution ? {
      evolves_from: localPokemon.evolution.evolves_from ? String(localPokemon.evolution.evolves_from) : undefined
    } : undefined,
    is_default: true,
    base_experience: localPokemon.base_experience || 0,
    stats: localPokemon.stats,
    is_legendary: localPokemon.is_legendary,
    is_mythical: localPokemon.is_mythical
  };
};

/**
 * Filter local Pokemon data based on criteria
 */
const filterLocalPokemon = (
  allPokemon: any[],
  searchTerm: string,
  filters: Filters
): any[] => {
  return allPokemon.filter(p => {
    // Search term filter (name or ID)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesName = p.name.includes(term);
      const matchesId = p.id.toString() === term;
      if (!matchesName && !matchesId) return false;
    }

    // Type filter (match all selected types)
    if (filters.types.length > 0) {
      const hasAllTypes = filters.types.every(type => p.types.includes(type));
      if (!hasAllTypes) return false;
    }

    // Move filter (match all selected moves)
    if (filters.moves.length > 0) {
      if (!p.moves) return false;
      const hasAllMoves = filters.moves.every(move => p.moves.includes(move));
      if (!hasAllMoves) return false;
    }

    // Generation filter
    if (filters.generation && p.generation !== filters.generation) {
      return false;
    }

    // Weight filter
    if (filters.weight.min > 0 && p.weight < filters.weight.min) return false;
    if (filters.weight.max > 0 && filters.weight.max < 1000 && p.weight > filters.weight.max) return false;

    // Height filter
    if (filters.height.min > 0 && p.height < filters.height.min) return false;
    if (filters.height.max > 0 && filters.height.max < 100 && p.height > filters.height.max) return false;

    // Has Evolutions filter
    if (filters.hasEvolutions !== null) {
      const hasEvo = p.evolution?.can_evolve || false;
      if (filters.hasEvolutions !== hasEvo) return false;
    }

    return true;
  });
};

/**
 * Transform local DB Pokemon to application PokemonDetails type
 */
const transformLocalToDetails = (localPokemon: any): PokemonDetails => {
  return {
    id: localPokemon.id,
    name: localPokemon.name,
    height: localPokemon.height,
    weight: localPokemon.weight,
    types: localPokemon.types,
    abilities: [], // Local DB doesn't have abilities details
    stats: {
      hp: localPokemon.stats.hp,
      attack: localPokemon.stats.attack,
      defense: localPokemon.stats.defense,
      // Local DB is missing special stats, default to 0
      special_attack: localPokemon.stats.special_attack || localPokemon.stats['special-attack'] || 0,
      special_defense: localPokemon.stats.special_defense || localPokemon.stats['special-defense'] || 0,
      speed: localPokemon.stats.speed
    },
    sprites: {
      front_default: '', // PokemonImage handles this
      back_default: '',
      front_shiny: '',
      back_shiny: '',
      official_artwork: ''
    },
    moves: (localPokemon.moves || []).map((name: string) => ({
      name,
      learned_at_level: 0,
      learn_method: 'unknown'
    })),
    flavor_text: '',
    genera: 'Pokémon',
    generation: localPokemon.generation,
    evolution_chain: [], // Local DB doesn't have detailed evolution chain
    base_experience: localPokemon.base_experience || 0,
    has_evolutions: localPokemon.evolution?.can_evolve || false
  };
};

/**
 * Fetches a single Pokemon by ID with caching support
 */
export const fetchPokemonById = async (id: number): Promise<Pokemon> => {
  // Try Redis cache first if enabled
  if (isCacheEnabled()) {
    const cacheKey = `${CACHE_KEYS.POKEMON_BY_ID}${id}`;
    return cacheAside(cacheKey, async () => {
      // Try Supabase cached version if enabled
      if (USE_CACHED_API) {
        try {
          return await fetchCachedPokemonById(id);
        } catch (error) {
          console.warn(`⚠️ Supabase cached API failed for Pokemon ${id}:`, error);
        }
      }
      
      // Fetch from direct GraphQL API
      return fetchPokemonByIdDirect(id);
    }, CACHE_TTL.POKEMON);
  }

  // Try cached version first if enabled (no Redis)
  if (USE_CACHED_API) {
    try {
      return await fetchCachedPokemonById(id);
    } catch (error) {
      console.warn(`⚠️ Cached API failed for Pokemon ${id}, falling back to direct API:`, error);
    }
  }

  // Fallback to direct API call
  return fetchPokemonByIdDirect(id);
};

/**
 * Direct fetch from GraphQL (internal helper)
 */
async function fetchPokemonByIdDirect(id: number): Promise<Pokemon> {
  try {
    const query = `
      query GetPokemonById($id: Int!) {
        pokemon_v2_pokemon_by_pk(id: $id) {
          ${POKEMON_FIELDS}
        }
      }
    `;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id } }),
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    const rawPokemon = result.data.pokemon_v2_pokemon_by_pk as RawPokemonData;
    
    if (!rawPokemon) {
      throw new Error(`Pokemon with ID ${id} not found`);
    }
    
    return transformSinglePokemon(rawPokemon);
  } catch (error) {
    console.error(`Error fetching Pokemon with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Fetches Pokemon data from GraphQL API with caching support
 */
export const fetchPokemonData = async (
  limit: number, 
  offset: number, 
  searchTerm: string, 
  filters: Filters
): Promise<Pokemon[]> => {
  // 1. Try local data first
  try {
    const localResults = filterLocalPokemon(localPokemonDb, searchTerm, filters);
    
    if (localResults.length > 0) {
      // Apply pagination to local results
      const paginatedResults = localResults.slice(offset, offset + limit);
      return paginatedResults.map(transformLocalPokemon);
    }
    
    // If local results are empty but we have filters, it's possible the local DB just doesn't have it
    // or the criteria really matches nothing.
    // The requirement is "unless we dont find any then call the api".
    // So if localResults.length === 0, we proceed to API.
    console.log('No local results found, falling back to API');
  } catch (error) {
    console.error('Error querying local pokemon data:', error);
    // Fallback to API on error
  }

  // 2. Try Redis cache if enabled
  if (isCacheEnabled()) {
    const cacheKey = generateSearchCacheKey(limit, offset, searchTerm, filters);
    return cacheAside(cacheKey, async () => {
      // Try Supabase cached version if enabled
      if (USE_CACHED_API) {
        try {
          return await fetchCachedPokemonData(limit, offset, searchTerm, filters);
        } catch (error) {
          console.warn(`⚠️ Supabase cached API failed for Pokemon data:`, error);
        }
      }
      
      // Fetch from direct GraphQL API
      return fetchPokemonDataDirect(limit, offset, searchTerm, filters);
    }, CACHE_TTL.POKEMON_LIST);
  }

  // 3. Try cached version first if enabled (no Redis)
  if (USE_CACHED_API) {
    try {
      return await fetchCachedPokemonData(limit, offset, searchTerm, filters);
    } catch (error) {
      console.warn(`⚠️ Cached API failed for Pokemon data, falling back to direct API:`, error);
    }
  }

  // 4. Fallback to direct API call
  return fetchPokemonDataDirect(limit, offset, searchTerm, filters);
};

/**
 * Direct fetch from GraphQL (internal helper)
 */
async function fetchPokemonDataDirect(
  limit: number,
  offset: number,
  searchTerm: string,
  filters: Filters
): Promise<Pokemon[]> {
  try {
    const whereClause = buildCompleteWhereClause(searchTerm, filters);

    const query = `
      query GetFilteredPokemon($limit: Int!, $offset: Int!) {
        pokemon_v2_pokemon(
          limit: $limit, 
          offset: $offset, 
          order_by: {id: asc}
          where: {
            ${whereClause}
          }
        ) {
          ${POKEMON_FIELDS}
        }
      }
    `;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { limit, offset } }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL HTTP error! Status: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', JSON.stringify(result.errors));
      throw new Error(`GraphQL error: ${result.errors[0]?.message || 'Unknown GraphQL error'}`);
    }
    
    if (!result.data) {
      console.error('No data returned from GraphQL:', result);
      throw new Error('No data returned from GraphQL query');
    }

    const rawPokemon = result.data.pokemon_v2_pokemon as RawPokemonData[];
    
    return transformRawData(rawPokemon);
  } catch (error) {
    console.error('Error fetching Pokemon data:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error type:', typeof error);
    }
    throw error;
  }
}

// Transform functions moved to ../utils/pokemon-transform.ts

/**
 * Fetches detailed Pokemon data from GraphQL API (simplified, single call)
 */
export const fetchPokemonDetails = async (id: number): Promise<PokemonDetails> => {
  // 1. Try local data first
  try {
    // Force type casting to access array methods on the JSON import
    const localDb = localPokemonDb as any[];
    const localPokemon = localDb.find((p: any) => p.id === id);
    if (localPokemon) {
      // console.log(`Found Pokemon ${id} in local DB`);
      return transformLocalToDetails(localPokemon);
    }
  } catch (error) {
    console.warn(`Error checking local DB for Pokemon ${id}:`, error);
  }

  // Try cached version first if enabled
  if (USE_CACHED_API) {
    try {
      return await fetchCachedPokemonDetails(id);
    } catch (error) {
      console.warn(`⚠️ Cached API failed for Pokemon details ${id}, falling back to direct API:`, error);
    }
  }

  // Use GraphQL for single API call instead of multiple REST calls
  try {
    const query = `
      query GetPokemonDetails($id: Int!) {
        pokemon_v2_pokemon_by_pk(id: $id) {
          id
          name
          height
          weight
          base_experience
          types: pokemon_v2_pokemontypes {
            type: pokemon_v2_type {
              name
            }
          }
          abilities: pokemon_v2_pokemonabilities {
            ability: pokemon_v2_ability {
              name
              pokemon_v2_abilityflavortexts(where: { pokemon_v2_language: { name: { _eq: "en" } } }) {
                flavor_text
              }
            }
            is_hidden
          }
          moves: pokemon_v2_pokemonmoves(where: { pokemon_v2_versiongroup: { name: { _eq: "red-blue" } } }) {
            move: pokemon_v2_move {
              name
            }
            level
            pokemon_v2_movelearnmethod {
              name
            }
          }
          stats: pokemon_v2_pokemonstats {
            base_stat
            pokemon_v2_stat {
              name
            }
          }
          sprites: pokemon_v2_pokemonsprites {
            data: sprites
          }
          species: pokemon_v2_pokemonspecy {
            flavor_text: pokemon_v2_pokemonspeciesflavortexts(where: { pokemon_v2_language: { name: { _eq: "en" } } }, limit: 1) {
              flavor_text
            }
            genera: pokemon_v2_pokemonspeciesnames(where: { pokemon_v2_language: { name: { _eq: "en" } } }) {
              genus
            }
            generation: pokemon_v2_generation {
              name
            }
            evolution_chain: pokemon_v2_evolutionchain {
              pokemon_v2_pokemonspecies {
                id
                name
                pokemon_v2_pokemonspeciesnames(where: { pokemon_v2_language: { name: { _eq: "en" } } }) {
                  name
                }
                pokemon_v2_pokemonevolutions {
                  min_level
                  pokemon_v2_item {
                    name
                  }
                  pokemon_v2_evolutiontrigger {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id } }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    const pokemon = result.data.pokemon_v2_pokemon_by_pk;

    if (!pokemon) {
      throw new Error(`Pokemon with ID ${id} not found`);
    }

    // Transform GraphQL data to our format
    const stats = pokemon.stats.reduce((acc: any, stat: any) => {
      const statName = stat.pokemon_v2_stat.name.replace('-', '_');
      acc[statName] = stat.base_stat;
      return acc;
    }, {});

    const abilities = pokemon.abilities.map((ability: any) => ({
      name: ability.ability.name.replace('-', ' '),
      is_hidden: ability.is_hidden,
      description: ability.ability.pokemon_v2_abilityflavortexts?.[0]?.flavor_text || 'No description available.'
    }));

    const moves = pokemon.moves.map((move: any) => ({
      name: move.move.name,
      learned_at_level: move.level || 0,
      learn_method: move.pokemon_v2_movelearnmethod?.name || 'unknown'
    }));

    // Process evolution chain
    const evolutions: Array<{
      species_name: string;
      species_id: number;
      min_level: number | null;
      trigger_name: string | null;
      item: string | null;
    }> = [];
    if (pokemon.species?.evolution_chain?.pokemon_v2_pokemonspecies) {
      const species = pokemon.species.evolution_chain.pokemon_v2_pokemonspecies;
      species.forEach((evo: any) => {
        const evolutionDetails = evo.pokemon_v2_pokemonevolutions?.[0];
        evolutions.push({
          species_name: evo.name,
          species_id: evo.id,
          min_level: evolutionDetails?.min_level || null,
          trigger_name: evolutionDetails?.pokemon_v2_evolutiontrigger?.name || null,
          item: evolutionDetails?.pokemon_v2_item?.name || null
        });
      });
    }

    // Get sprites from GraphQL data
    const spritesData = pokemon.sprites?.[0]?.data;
    let sprites = {
      front_default: '',
      back_default: '',
      front_shiny: '',
      back_shiny: '',
      official_artwork: ''
    };

    if (spritesData) {
      try {
        const parsedSprites = JSON.parse(spritesData);
        sprites = {
          front_default: parsedSprites.front_default || '',
          back_default: parsedSprites.back_default || '',
          front_shiny: parsedSprites.front_shiny || '',
          back_shiny: parsedSprites.back_shiny || '',
          official_artwork: parsedSprites.other?.['official-artwork']?.front_default || ''
        };
      } catch (e) {
        // If parsing fails, use defaults
      }
    }

    return {
      id: pokemon.id,
      name: pokemon.name,
      height: pokemon.height,
      weight: pokemon.weight,
      types: pokemon.types.map((t: any) => t.type.name),
      abilities,
      stats,
      sprites,
      moves,
      flavor_text: pokemon.species?.flavor_text?.[0]?.flavor_text || '',
      genera: pokemon.species?.genera?.[0]?.genus || '',
      generation: pokemon.species?.generation?.name || 'unknown',
      evolution_chain: evolutions,
      base_experience: pokemon.base_experience,
      has_evolutions: evolutions.length > 1
    };
  } catch (error) {
    console.error(`Error fetching detailed Pokemon data for ID ${id}:`, error);
    throw error;
  }
};

/**
 * Fetches Pokemon moves for moveset editor
 */
export const fetchPokemonMoves = async (pokemonId: number) => {
  try {
    const query = `
      query GetPokemonMoves($pokemonId: Int!) {
        pokemon_v2_pokemon_by_pk(id: $pokemonId) {
          moves: pokemon_v2_pokemonmoves(
            where: {
              pokemon_v2_versiongroup: {
                pokemon_v2_versions: {
                  pokemon_v2_versionnames: {
                    pokemon_v2_language: { name: { _eq: "en" } }
                  }
                }
              }
            }
            order_by: { level: asc }
          ) {
            move: pokemon_v2_move {
              id
              name
              type: pokemon_v2_type {
                name
              }
              power
              accuracy
              pp
              damage_class: pokemon_v2_movedamageclass {
                name
              }
              target: pokemon_v2_movetarget {
                name
              }
              priority
            }
            level
            pokemon_v2_movelearnmethod {
              name
            }
          }
        }
      }
    `;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { pokemonId } }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.pokemon_v2_pokemon_by_pk.moves || [];
  } catch (error) {
    console.error('Error fetching Pokemon moves:', error);
    throw error;
  }
};

/**
 * Fetches move details by name
 */
export const fetchMoveDetails = async (moveName: string) => {
  try {
    const query = `
      query GetMoveDetails($moveName: String!) {
        pokemon_v2_move(where: { name: { _eq: $moveName } }) {
          id
          name
          type: pokemon_v2_type {
            name
          }
          power
          accuracy
          pp
          damage_class: pokemon_v2_movedamageclass {
            name
          }
          target: pokemon_v2_movetarget {
            name
          }
          priority
        }
      }
    `;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { moveName } }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    const move = result.data.pokemon_v2_move[0];
    if (move) {
      return {
        ...move,
        effect_entries: [{
          short_effect: 'Move description',
          language: { name: 'en' }
        }],
        flavor_text_entries: [{
          flavor_text: 'Move flavor text',
          language: { name: 'en' }
        }]
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching move details:', error);
    throw error;
  }
};

/**
 * Fetches Pokemon abilities
 */
export const fetchPokemonAbilities = async (pokemonId: number) => {
  try {
    const query = `
      query GetPokemonAbilities($pokemonId: Int!) {
        pokemon_v2_pokemon_by_pk(id: $pokemonId) {
          abilities: pokemon_v2_pokemonabilities {
            ability: pokemon_v2_ability {
              id
              name
            }
            is_hidden
          }
        }
      }
    `;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { pokemonId } }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.pokemon_v2_pokemon_by_pk.abilities.map((ability: any) => ({
      ...ability,
      ability: {
        ...ability.ability,
        effect_entries: [{
          short_effect: 'Ability description',
          language: { name: 'en' }
        }]
      }
    })) || [];
  } catch (error) {
    console.error('Error fetching Pokemon abilities:', error);
    throw error;
  }
};

/**
 * Fetches competitive items
 */
export const fetchCompetitiveItems = async () => {
  try {
    const competitiveItems = [
      'Choice Band', 'Choice Specs', 'Choice Scarf',
      'Leftovers', 'Heavy-Duty Boots', 'Assault Vest',
      'Rocky Helmet', 'Black Sludge', 'Life Orb',
      'Expert Belt', 'Muscle Band', 'Wise Glasses',
      'Focus Sash', 'Focus Band', 'Sitrus Berry',
      'Lum Berry', 'Chesto Berry', 'Leppa Berry',
      'Liechi Berry', 'Ganlon Berry', 'Salac Berry',
      'Petaya Berry', 'Apicot Berry', 'Occa Berry',
      'Passho Berry', 'Wacan Berry', 'Rindo Berry',
      'Yache Berry', 'Chople Berry', 'Kebia Berry',
      'Shuca Berry', 'Coba Berry', 'Payapa Berry',
      'Tanga Berry', 'Charti Berry', 'Kasib Berry',
      'Haban Berry', 'Colbur Berry', 'Babiri Berry',
      'Chilan Berry', 'Roseli Berry', 'Air Balloon',
      'Mental Herb', 'Power Herb', 'Quick Claw',
      'King\'s Rock', 'Razor Claw', 'Scope Lens',
      'Wide Lens', 'Zoom Lens', 'Flame Orb',
      'Toxic Orb', 'Electric Seed', 'Grassy Seed',
      'Misty Seed', 'Psychic Seed', 'Heat Rock',
      'Damp Rock', 'Smooth Rock', 'Icy Rock',
      'Eject Button', 'Red Card', 'Shed Shell',
      'Safety Goggles', 'Protective Pads', 'Clear Amulet',
      'Covert Cloak', 'Loaded Dice', 'Booster Energy',
      'Mirror Herb', 'Punching Glove'
    ];

    const query = `
      query GetCompetitiveItems($itemNames: [String!]!) {
        pokemon_v2_item(where: { name: { _in: $itemNames } }) {
          id
          name
          cost
          category: pokemon_v2_itemcategory {
            name
          }
        }
      }
    `;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { itemNames: competitiveItems } }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.pokemon_v2_item.map((item: any) => ({
      ...item,
      effect_entries: [{
        short_effect: 'Competitive battle item',
        language: { name: 'en' }
      }],
      flavor_text_entries: [{
        flavor_text: 'Competitive battle item'
      }]
    })) || [];
  } catch (error) {
    console.error('Error fetching competitive items:', error);
    throw error;
  }
};

/**
 * Fetches available filter options (types, moves, generations)
 */
export const fetchFilterOptions = async () => {
  // Use local filter options data
  try {
    const { types, moves, generations } = localFilterOptions.data;
    return {
      types: types.map((t: { name: string }) => t.name),
      moves: moves.map((m: { name: string }) => m.name),
      generations: generations.map((g: { name: string }) => g.name),
    };
  } catch (error) {
    console.error('Error processing local filter options:', error);
    // Fallback if local processing fails (though unlikely)
  }

  // Fallback to cached version if enabled
  if (USE_CACHED_API) {
    try {
      return await fetchCachedFilterOptions();
    } catch (error) {
      console.warn(`⚠️ Cached API failed for filter options, falling back to direct API:`, error);
    }
  }

  // Fallback to direct API call
  try {
    const query = `
      query GetFilterOptions {
        types: pokemon_v2_type(where: {pokemon_v2_pokemontypes: {pokemon_v2_pokemon: {is_default: {_eq: true}}}}) {
          name
        }
        moves: pokemon_v2_move(limit: 1000) {
          name
        }
        generations: pokemon_v2_generation {
          name
        }
      }
    `;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL HTTP error! Status: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', JSON.stringify(result.errors));
      throw new Error(`GraphQL error: ${result.errors[0]?.message || 'Unknown GraphQL error'}`);
    }

    if (!result.data) {
      console.error('No data returned from GraphQL:', result);
      throw new Error('No data returned from GraphQL query');
    }

    return {
      types: result.data.types.map((t: { name: string }) => t.name),
      moves: result.data.moves.map((m: { name: string }) => m.name),
      generations: result.data.generations.map((g: { name: string }) => g.name),
    };
  } catch (error) {
    console.error('Error fetching filter options:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error type:', typeof error);
    }
    throw error;
  }
};
