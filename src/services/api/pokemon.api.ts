import { Pokemon, RawPokemonData, Filters, PokemonDetails } from '../../types/pokemon';
import {
  fetchCachedPokemonById,
  fetchCachedPokemonData,
  fetchCachedPokemonDetails
} from './pokemon.cached';
import { buildCompleteWhereClause, POKEMON_FIELDS } from '../../utils/query-builder';
import { transformSinglePokemon, transformRawData } from '../../utils/pokemon-transform';
import { cacheAside, CACHE_KEYS, CACHE_TTL, generateSearchCacheKey, isCacheEnabled } from '../../lib/redis';
import { supabase } from '../../lib/supabase';
import { GRAPHQL_ENDPOINT, handleGraphQLResponse } from './base';

/**
 * Transform Supabase Pokemon to application Pokemon type
 */
export const transformSupabasePokemon = (p: any): Pokemon => {
  return {
    id: p.id,
    name: p.name,
    height: p.height,
    weight: p.weight,
    types: p.types,
    moves: p.moves || [],
    sprites: {
      front_default: '', // Handled by PokemonImage component
      back_default: '',
      front_shiny: '',
      back_shiny: '',
      official_artwork: ''
    },
    generation: p.generation || 'unknown',
    has_evolutions: p.can_evolve || false,
    is_starter: p.is_starter || false,
    evolution_chain: p.evolves_from_id ? {
      evolves_from: String(p.evolves_from_id)
    } : undefined,
    is_default: true,
    base_experience: p.base_experience || 0,
    stats: {
      hp: p.hp,
      attack: p.attack,
      defense: p.defense,
      'special-attack': p.special_attack,
      'special-defense': p.special_defense,
      speed: p.speed
    },
    is_legendary: p.is_legendary,
    is_mythical: p.is_mythical
  };
};

/**
 * Direct fetch from GraphQL (internal helper)
 */
async function fetchPokemonByIdDirect(id: number, signal?: AbortSignal): Promise<Pokemon> {
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
      signal
    });

    const data = await handleGraphQLResponse<{ pokemon_v2_pokemon_by_pk: RawPokemonData }>(response);
    const rawPokemon = data.pokemon_v2_pokemon_by_pk;

    if (!rawPokemon) {
      throw new Error(`Pokemon with ID ${id} not found`);
    }

    return transformSinglePokemon(rawPokemon);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error;
    }
    console.error(`Error fetching Pokemon with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Direct fetch from GraphQL (internal helper)
 */
async function fetchPokemonDataDirect(
  limit: number,
  offset: number,
  searchTerm: string,
  filters: Filters,
  signal?: AbortSignal
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
      signal
    });

    const data = await handleGraphQLResponse<{ pokemon_v2_pokemon: RawPokemonData[] }>(response);
    return transformRawData(data.pokemon_v2_pokemon);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching Pokemon data:', error);
    throw error;
  }
}

/**
 * Fetches a single Pokemon by ID with caching support
 * Priority: Redis Cache → Supabase Cache (Edge) → Supabase Database → API
 */
export const fetchPokemonById = async (id: number, signal?: AbortSignal): Promise<Pokemon> => {
  if (isCacheEnabled()) {
    const cacheKey = `${CACHE_KEYS.POKEMON_BY_ID}${id}`;
    return cacheAside(cacheKey, async () => {
      try {
        return await fetchCachedPokemonById(id);
      } catch (error) {
        if (import.meta.env.DEV) console.warn('[cache fallback]', error);
      }

      try {
        const { data, error } = await supabase
          .from('pokemon')
          .select('*')
          .eq('id', id)
          .single();
        if (data && !error) return transformSupabasePokemon(data);
      } catch (error) {
        if (import.meta.env.DEV) console.warn('[cache fallback]', error);
      }

      return fetchPokemonByIdDirect(id, signal);
    }, CACHE_TTL.POKEMON);
  }

  try {
    return await fetchCachedPokemonById(id);
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[cache fallback]', error);
  }

  try {
    const { data, error } = await supabase
      .from('pokemon')
      .select('*')
      .eq('id', id)
      .single();
    if (data && !error) return transformSupabasePokemon(data);
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[cache fallback]', error);
  }

  return fetchPokemonByIdDirect(id, signal);
};

/**
 * Fetches Pokemon data from GraphQL API with caching support
 * Priority: Redis Cache → Supabase Cache (Edge) → Supabase Database → API
 */
export const fetchPokemonData = async (
  limit: number,
  offset: number,
  searchTerm: string,
  filters: Filters,
  signal?: AbortSignal
): Promise<Pokemon[]> => {
  const executeQuery = async () => {
    // Only use local/Supabase database cache, skip Redis for filtered lists
    // to ensure user always gets fresh results when clicking filters
    try {
      let query = supabase.from('pokemon').select('*');
      if (searchTerm) {
        if (!isNaN(Number(searchTerm))) query = query.eq('id', Number(searchTerm));
        else query = query.ilike('name', `%${searchTerm}%`);
      }
      
      if (filters.types.length > 0) query = query.contains('types', filters.types);
      if (filters.moves.length > 0) query = query.contains('moves', filters.moves);
      if (filters.generation) query = query.eq('generation', filters.generation);
      if (filters.weight.min > 0) query = query.gte('weight', filters.weight.min);
      if (filters.weight.max > 0 && filters.weight.max < 1000) query = query.lte('weight', filters.weight.max);
      if (filters.height.min > 0) query = query.gte('height', filters.height.min);
      if (filters.height.max > 0 && filters.height.max < 100) query = query.lte('height', filters.height.max);
      if (filters.hasEvolutions !== null) query = query.eq('can_evolve', filters.hasEvolutions);

      const { data, error } = await query
        .order('id', { ascending: true })
        .range(offset, offset + limit - 1)
        .abortSignal(signal as any); // Supabase supports abortSignal

      if (data && !error && data.length > 0) return data.map(transformSupabasePokemon);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[cache fallback]', error);
    }

    return fetchPokemonDataDirect(limit, offset, searchTerm, filters, signal);
  };

  return executeQuery();
};

/**
 * Direct fetch Pokemon details from GraphQL (internal helper)
 */
async function fetchPokemonDetailsDirect(id: number): Promise<PokemonDetails> {
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
          moves: pokemon_v2_pokemonmoves {
            move: pokemon_v2_move {
              name
            }
            level
            pokemon_v2_movelearnmethod {
              name
            }
            pokemon_v2_versiongroup {
              id
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
                evolves_from_species_id
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

    const data = await handleGraphQLResponse<any>(response);
    const pokemon = data.pokemon_v2_pokemon_by_pk;

    if (!pokemon) {
      throw new Error(`Pokemon with ID ${id} not found`);
    }

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

    const movesMap = new Map();
    const validMethods = ['level-up', 'machine', 'egg', 'tutor'];

    pokemon.moves.forEach((m: any) => {
      const moveName = m.move.name;
      const learnMethod = m.pokemon_v2_movelearnmethod?.name || 'unknown';
      const versionGroupId = m.pokemon_v2_versiongroup?.id || 0;
      if (!validMethods.includes(learnMethod)) return;
      const existing = movesMap.get(moveName);
      if (!existing || versionGroupId > existing.versionGroupId) {
        movesMap.set(moveName, {
          name: moveName,
          learned_at_level: m.level || 0,
          learn_method: learnMethod,
          versionGroupId
        });
      }
    });

    const moves = Array.from(movesMap.values()).map(m => ({
      name: m.name,
      learned_at_level: m.learned_at_level,
      learn_method: m.learn_method
    })).sort((a, b) => {
      if (a.learn_method === 'level-up' && b.learn_method === 'level-up') return a.learned_at_level - b.learned_at_level;
      if (a.learn_method === 'level-up') return -1;
      if (b.learn_method === 'level-up') return 1;
      return a.name.localeCompare(b.name);
    });

    const evolutions: any[] = [];
    if (pokemon.species?.evolution_chain?.pokemon_v2_pokemonspecies) {
      pokemon.species.evolution_chain.pokemon_v2_pokemonspecies.forEach((evo: any) => {
        const evolutionDetails = evo.pokemon_v2_pokemonevolutions?.[0];
        evolutions.push({
          species_name: evo.name,
          species_id: evo.id,
          evolves_from_id: evo.evolves_from_species_id || null,
          min_level: evolutionDetails?.min_level || null,
          trigger_name: evolutionDetails?.pokemon_v2_evolutiontrigger?.name || null,
          item: evolutionDetails?.pokemon_v2_item?.name || null
        });
      });
    }

    const spritesData = pokemon.sprites?.[0]?.data;
    let sprites = { front_default: '', back_default: '', front_shiny: '', back_shiny: '', official_artwork: '' };
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
      } catch (e) { /* use defaults */ }
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
    console.error(`Error fetching Pokemon details for ID ${id}:`, error);
    throw error;
  }
}

/**
 * Fetches Pokemon details with caching support
 */
export const fetchPokemonDetails = async (id: number): Promise<PokemonDetails> => {
  const executeQuery = async () => {
    try {
      return await fetchCachedPokemonDetails(id);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[cache fallback]', error);
    }
    return fetchPokemonDetailsDirect(id);
  };

  if (isCacheEnabled()) {
    const cacheKey = `${CACHE_KEYS.POKEMON_DETAILS}${id}`;
    return cacheAside(cacheKey, executeQuery, CACHE_TTL.POKEMON_DETAILS);
  }

  return executeQuery();
};
