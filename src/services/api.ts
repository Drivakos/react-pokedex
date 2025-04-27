import { Pokemon, RawPokemonData, Filters, PokemonDetails, PokemonStats, PokemonMove, PokemonAbility, PokemonSprites } from '../types/pokemon';

// Use environment variables for API endpoints
const GRAPHQL_ENDPOINT = import.meta.env.VITE_API_GRAPHQL_URL || 'https://beta.pokeapi.co/graphql/v1beta';
const REST_ENDPOINT = import.meta.env.VITE_API_REST_URL || import.meta.env.VITE_API_URL || 'https://pokeapi.co/api/v2';

// Validate API endpoints
if (!GRAPHQL_ENDPOINT || !REST_ENDPOINT) {
  console.error('Missing required API endpoint environment variables');
}

/**
 * Builds GraphQL query conditions based on filters and search term
 */
export const buildWhereConditions = (searchTerm: string, filters: Filters) => {
  const conditions = {
    types: filters.types.length > 0
      ? `pokemon_v2_pokemontypes: { pokemon_v2_type: { name: { _in: ${JSON.stringify(filters.types)} } } }`
      : '',
    
    moves: filters.moves.length > 0
      ? `pokemon_v2_pokemonmoves: { pokemon_v2_move: { name: { _in: ${JSON.stringify(filters.moves)} } } }`
      : '',

    generation: filters.generation
      ? `pokemon_v2_pokemonspecy: { pokemon_v2_generation: { name: { _eq: "${filters.generation}" } } }`
      : '',

    name: searchTerm
      ? `name: { _ilike: ${JSON.stringify(`%${searchTerm.toLowerCase()}%`)} }`
      : '',

    weight: filters.weight.min > 0 || filters.weight.max > 0
      ? `weight: { ${filters.weight.min > 0 ? `_gte: ${filters.weight.min},` : ''} ${filters.weight.max > 0 ? `_lte: ${filters.weight.max}` : ''} }`
      : '',

    height: filters.height.min > 0 || filters.height.max > 0
      ? `height: { ${filters.height.min > 0 ? `_gte: ${filters.height.min},` : ''} ${filters.height.max > 0 ? `_lte: ${filters.height.max}` : ''} }`
      : '',

    evolution: filters.hasEvolutions !== null
      ? `pokemon_v2_pokemonspecy: {
          pokemon_v2_evolutionchain: {
            pokemon_v2_pokemonspecies_aggregate: {
              count: ${filters.hasEvolutions ? 'gt: 1' : 'equals: 1'}
            }
          }
        }`
      : '',
  };

  return Object.values(conditions).filter(Boolean).join(', ');
};

/**
 * Builds the type AND condition for multiple type filtering
 */
export const buildTypeAndCondition = (types: string[]) => {
  if (types.length === 0) return '';
  
  return `_and: [${types.map(type => 
    `{ pokemon_v2_pokemontypes: { pokemon_v2_type: { name: { _eq: ${JSON.stringify(type)} } } } }`
  ).join(',')}]`;
};

/**
 * Fetches a single Pokemon by ID
 */
export const fetchPokemonById = async (id: number): Promise<Pokemon> => {
  try {
    const query = `
      query GetPokemonById($id: Int!) {
        pokemon_v2_pokemon_by_pk(id: $id) {
          id
          name
          height
          weight
          is_default
          base_experience
          types: pokemon_v2_pokemontypes {
            type: pokemon_v2_type {
              name
            }
          }
          moves: pokemon_v2_pokemonmoves {
            move: pokemon_v2_move {
              name
            }
          }
          sprites: pokemon_v2_pokemonsprites {
            data: sprites
          }
          species: pokemon_v2_pokemonspecy {
            generation: pokemon_v2_generation {
              name
            }
            pokemon_v2_pokemons {
              pokemon_v2_pokemonforms {
                form_name
                is_default
              }
            }
            pokemon_v2_evolutionchain {
              pokemon_v2_pokemonspecies {
                name
              }
            }
          }
          forms: pokemon_v2_pokemonforms {
            form_name
            is_default
          }
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
      console.error('GraphQL errors for ID', id, result.errors);
      const message = result.errors
        .map((e: any) => e.message)
        .join('; ');
      throw new Error(message);
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
};

/**
 * Fetches Pokemon data from GraphQL API
 */
export const fetchPokemonData = async (
  limit: number, 
  offset: number, 
  searchTerm: string, 
  filters: Filters
): Promise<Pokemon[]> => {
  try {
    const whereConditions = buildWhereConditions(searchTerm, filters);
    const typeAndCondition = buildTypeAndCondition(filters.types);

    // Construct the where clause with proper conditions
    const whereClause = [
      whereConditions,
      typeAndCondition,
      `pokemon_v2_pokemonforms: { is_default: { _eq: true } }`
    ].filter(Boolean).join(', ');

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
          id
          name
          height
          weight
          is_default
          base_experience
          types: pokemon_v2_pokemontypes {
            type: pokemon_v2_type {
              name
            }
          }
          moves: pokemon_v2_pokemonmoves {
            move: pokemon_v2_move {
              name
            }
          }
          sprites: pokemon_v2_pokemonsprites {
            data: sprites
          }
          species: pokemon_v2_pokemonspecy {
            generation: pokemon_v2_generation {
              name
            }
            pokemon_v2_pokemons {
              pokemon_v2_pokemonforms {
                form_name
                is_default
              }
            }
            pokemon_v2_evolutionchain {
              pokemon_v2_pokemonspecies {
                name
              }
            }
          }
          forms: pokemon_v2_pokemonforms {
            form_name
            is_default
          }
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
};

/**
 * Transforms raw API data to our Pokemon interface
 */
export const transformRawData = (rawData: RawPokemonData[]): Pokemon[] => {
  return rawData.map(p => transformSinglePokemon(p));
};

/**
 * Transforms a single raw Pokemon data object to our Pokemon interface
 */
export const transformSinglePokemon = (p: RawPokemonData): Pokemon => {
  return {
    id: p.id,
    name: p.name,
    height: p.height,
    weight: p.weight,
    types: p.types?.map(t => t.type.name) || [],
    moves: p.moves?.map(m => m.move.name) || [],
    sprites: p.sprites?.[0]?.data || {},
    generation: p.species?.generation?.name || 'unknown',
    has_evolutions: p.species?.pokemon_v2_evolutionchain?.pokemon_v2_pokemonspecies && 
                   p.species.pokemon_v2_evolutionchain.pokemon_v2_pokemonspecies.length > 1 || false,
    is_default: p.is_default,
    base_experience: p.base_experience,
  };
};

/**
 * Simple in-memory cache for Pokemon details
 */
const pokemonDetailsCache: Record<number, PokemonDetails> = {};

/**
 * Fetches detailed Pokemon data from the REST API with caching and retries
 */
export const fetchPokemonDetails = async (id: number): Promise<PokemonDetails> => {
  // Return cached data if available
  if (pokemonDetailsCache[id]) {
    return pokemonDetailsCache[id];
  }
  
  try {
    // Helper function to retry fetches
    const fetchWithRetry = async (url: string, retries = 2) => {
      let lastError;
      for (let i = 0; i <= retries; i++) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return await response.json();
        } catch (err) {
          lastError = err;
          // Wait before retrying (exponential backoff)
          if (i < retries) {
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
          }
        }
      }
      throw lastError;
    };
    
    // Fetch basic Pokemon data with retries
    const pokemonData = await fetchWithRetry(`${REST_ENDPOINT}/pokemon/${id}`);
    
    // Fetch species data for evolution chain and flavor text
    const speciesData = await fetchWithRetry(`${REST_ENDPOINT}/pokemon-species/${id}`);
    
    // Fetch evolution chain data
    let evolutionData = null;
    if (speciesData.evolution_chain?.url) {
      const evolutionResponse = await fetch(speciesData.evolution_chain.url);
      evolutionData = await evolutionResponse.json();
    }
    
    // Extract English flavor text
    const englishFlavorText = speciesData.flavor_text_entries
      .find((entry: any) => entry.language.name === 'en')?.flavor_text
      .replace(/\f/g, ' ')
      .replace(/\n/g, ' ') || '';
    
    // Format stats
    const stats = pokemonData.stats.reduce((acc: any, stat: any) => {
      const statName = stat.stat.name.replace('-', '_');
      acc[statName] = stat.base_stat;
      return acc;
    }, {});
    
    // Fetch abilities with descriptions
    const abilitiesPromises = pokemonData.abilities.map(async (ability: any) => {
      const abilityResponse = await fetch(`${REST_ENDPOINT}/ability/${ability.ability.name}`);
      const abilityData = await abilityResponse.json();
      
      // Find English description
      const englishEntry = abilityData.flavor_text_entries.find(
        (entry: any) => entry.language.name === 'en'
      );
      
      return {
        name: ability.ability.name.replace('-', ' '),
        is_hidden: ability.is_hidden,
        description: englishEntry ? englishEntry.flavor_text : 'No description available.'
      };
    });
    
    const abilities = await Promise.all(abilitiesPromises);
    
    // Process evolution chain with species IDs
    const evolutions = [];
    if (evolutionData) {
      const evoData = evolutionData.chain;
      
      // Fetch species data for the base form
      const baseSpeciesResponse = await fetch(`${REST_ENDPOINT}/pokemon-species/${evoData.species.name}`);
      const baseSpeciesData = await baseSpeciesResponse.json();
      
      const evoDetails = {
        species_name: evoData.species.name,
        species_id: baseSpeciesData.id,
        min_level: 1,
        trigger_name: null,
        item: null
      };
      evolutions.push(evoDetails);
      
      // Process first evolution
      if (evoData.evolves_to.length > 0) {
        // Use Promise.all to fetch all first evolution species data in parallel
        const firstEvoPromises = evoData.evolves_to.map(async (evo1: any) => {
          const speciesResponse = await fetch(`${REST_ENDPOINT}/pokemon-species/${evo1.species.name}`);
          const speciesData = await speciesResponse.json();
          
          const evoDetails = {
            species_name: evo1.species.name,
            species_id: speciesData.id,
            min_level: evo1.evolution_details[0]?.min_level || null,
            trigger_name: evo1.evolution_details[0]?.trigger?.name || null,
            item: evo1.evolution_details[0]?.item?.name || null
          };
          evolutions.push(evoDetails);
          
          // Process second evolution
          if (evo1.evolves_to.length > 0) {
            // Use Promise.all to fetch all second evolution species data in parallel
            const secondEvoPromises = evo1.evolves_to.map(async (evo2: any) => {
              const speciesResponse = await fetch(`${REST_ENDPOINT}/pokemon-species/${evo2.species.name}`);
              const speciesData = await speciesResponse.json();
              
              const evoDetails = {
                species_name: evo2.species.name,
                species_id: speciesData.id,
                min_level: evo2.evolution_details[0]?.min_level || null,
                trigger_name: evo2.evolution_details[0]?.trigger?.name || null,
                item: evo2.evolution_details[0]?.item?.name || null
              };
              evolutions.push(evoDetails);
            });
            
            await Promise.all(secondEvoPromises);
          }
        });
        
        await Promise.all(firstEvoPromises);
      }
    }
    
    const details: PokemonDetails = {
      id: pokemonData.id,
      name: pokemonData.name,
      height: pokemonData.height,
      weight: pokemonData.weight,
      types: pokemonData.types.map((t: any) => t.type.name),
      abilities,
      stats,
      sprites: {
        front_default: pokemonData.sprites.front_default,
        back_default: pokemonData.sprites.back_default,
        front_shiny: pokemonData.sprites.front_shiny,
        back_shiny: pokemonData.sprites.back_shiny,
        official_artwork: pokemonData.sprites.other['official-artwork'].front_default
      },
      moves: pokemonData.moves.map((m: any) => ({
        name: m.move.name,
        learned_at_level: m.version_group_details[0]?.level_learned_at || 0,
        learn_method: m.version_group_details[0]?.move_learn_method.name || 'unknown'
      })),
      flavor_text: englishFlavorText,
      genera: speciesData.genera.find((g: any) => g.language.name === 'en')?.genus || '',
      generation: speciesData.generation.name,
      evolution_chain: evolutions,
      base_experience: pokemonData.base_experience,
      has_evolutions: evolutions.length > 1
    };
    
    // Cache the result
    pokemonDetailsCache[id] = details;
    return details;
    
  } catch (error) {
    console.error(`Error fetching detailed Pokemon data for ID ${id}:`, error);
    
    // Create a minimal Pokemon detail object when API fails
    // This prevents the entire application from breaking
    const fallbackDetails: PokemonDetails = {
      id: id,
      name: `pokemon-${id}`,
      height: 0,
      weight: 0,
      types: [],
      moves: [],
      generation: 'unknown',
      abilities: [],
      stats: {
        hp: 0,
        attack: 0,
        defense: 0,
        special_attack: 0,
        special_defense: 0,
        speed: 0
      },
      sprites: {
        front_default: '',
        back_default: '',
        front_shiny: '',
        back_shiny: '',
        official_artwork: ''
      },
      flavor_text: 'Data unavailable',
      genera: '',
      evolution_chain: [],
      base_experience: 0,
      has_evolutions: false
    };
    
    // Cache the fallback details to prevent repeated API calls for the same failed ID
    pokemonDetailsCache[id] = fallbackDetails;
    return fallbackDetails;
  }
};

/**
 * Fetches available filter options (types, moves, generations)
 */
/**
 * Fetches multiple Pokemon details in a single GraphQL query
 * This is much more efficient than multiple REST calls
 */
export const fetchMultiplePokemonDetails = async (pokemonIds: number[]): Promise<PokemonDetails[]> => {
  if (!pokemonIds.length) return [];
  
  try {
    console.log(`Fetching ${pokemonIds.length} Pokemon with GraphQL batch query`);
    
    // Check if we already have any of these Pokemon in the cache
    const uncachedIds = [];
    const cachedPokemon: PokemonDetails[] = [];
    const standardIds: number[] = [];
    
    // Filter out special form IDs that need special handling
    for (const id of pokemonIds) {
      if (pokemonDetailsCache[id]) {
        // If it's already cached, use the cache
        cachedPokemon.push(pokemonDetailsCache[id]);
      } else if (id >= 10000) {
        // Special form Pokémon IDs (>= 10000) need special handling
        // We'll deal with these separately with the REST API
        uncachedIds.push(id);
      } else {
        // Standard Pokémon IDs can be fetched with GraphQL
        standardIds.push(id);
        uncachedIds.push(id);
      }
    }
    
    // If all Pokémon are cached, return immediately
    if (uncachedIds.length === 0) {
      console.log('All requested Pokémon were in cache');
      return cachedPokemon;
    }
    
    // Only proceed with GraphQL if we have standard IDs to fetch
    let fetchedPokemon: PokemonDetails[] = [];
    
    if (standardIds.length > 0) {
      // Format IDs for the GraphQL query
      const idList = JSON.stringify(standardIds);
      
      const query = `
        query GetMultiplePokemon {
          pokemon_v2_pokemon(where: {id: {_in: ${idList}}}) {
          id
          name
          height
          weight
          base_experience
          pokemon_v2_pokemonabilities {
            is_hidden
            pokemon_v2_ability {
              name
              pokemon_v2_abilityflavortexts(where: {language_id: {_eq: 9}}, limit: 1) {
                flavor_text
              }
            }
          }
          pokemon_v2_pokemonstats {
            base_stat
            pokemon_v2_stat {
              name
            }
          }
          pokemon_v2_pokemonsprites {
            sprites
          }
          pokemon_v2_pokemontypes {
            pokemon_v2_type {
              name
            }
          }
          pokemon_v2_pokemonmoves(limit: 20) {
            pokemon_v2_move {
              name
            }
            level
            pokemon_v2_movelearnmethod {
              name
            }
          }
          pokemon_v2_pokemonspecy {
            pokemon_v2_pokemonspeciesflavortexts(where: {language_id: {_eq: 9}}, limit: 1) {
              flavor_text
            }
            pokemon_v2_generation {
              name
            }
            pokemon_v2_evolutionchain {
              pokemon_v2_pokemonspecies {
                id
                name
                evolves_from_species_id
              }
            }
            genera: pokemon_v2_pokemonspeciesnames(where: {language_id: {_eq: 9}}) {
              genus
            }
          }
        }
      }
    `;

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        console.error('GraphQL errors for batch Pokémon query:', result.errors);
        throw new Error(result.errors[0]?.message || 'Unknown GraphQL error');
      }

      const pokemonData = result.data.pokemon_v2_pokemon;
      console.log(`Successfully fetched ${pokemonData.length} Pokémon with GraphQL`);      
      
      // Transform the GraphQL data to PokemonDetails format
      fetchedPokemon = pokemonData.map((pokemon: any) => {
      // Process abilities
      const abilities: PokemonAbility[] = pokemon.pokemon_v2_pokemonabilities.map((a: any) => ({
        name: a.pokemon_v2_ability.name,
        is_hidden: a.is_hidden,
        description: a.pokemon_v2_ability.pokemon_v2_abilityflavortexts[0]?.flavor_text || ''
      }));

      // Process stats
      const stats: PokemonStats = {
        hp: 0,
        attack: 0,
        defense: 0,
        special_attack: 0,
        special_defense: 0,
        speed: 0
      };

      pokemon.pokemon_v2_pokemonstats.forEach((s: any) => {
        const statName = s.pokemon_v2_stat.name.replace('-', '_') as keyof PokemonStats;
        if (statName in stats) {
          stats[statName] = s.base_stat;
        }
      });

      // Process sprites - Fix JSON parsing error
      let parsedSprites;
      const spritesData = pokemon.pokemon_v2_pokemonsprites[0]?.sprites;
      
      try {
        // Check if it's already an object or needs parsing
        if (typeof spritesData === 'string') {
          parsedSprites = JSON.parse(spritesData);
        } else if (typeof spritesData === 'object') {
          parsedSprites = spritesData;
        } else {
          // Default empty object if sprites data is null/undefined
          parsedSprites = {};
        }
      } catch (error) {
        console.error('Error parsing sprites data:', error, 'for Pokémon:', pokemon.id);
        parsedSprites = {};
      }
      
      const sprites: PokemonSprites = {
        front_default: parsedSprites.front_default || '',
        back_default: parsedSprites.back_default || '',
        front_shiny: parsedSprites.front_shiny || '',
        back_shiny: parsedSprites.back_shiny || '',
        official_artwork: parsedSprites.other?.['official-artwork']?.front_default || ''
      };

      // Process types
      const types = pokemon.pokemon_v2_pokemontypes.map(
        (t: any) => t.pokemon_v2_type.name
      );

      // Process moves
      const moves: PokemonMove[] = pokemon.pokemon_v2_pokemonmoves.map((m: any) => ({
        name: m.pokemon_v2_move.name,
        learned_at_level: m.level || 0,
        learn_method: m.pokemon_v2_movelearnmethod?.name || 'unknown'
      }));

      // Process evolution chain
      const speciesData = pokemon.pokemon_v2_pokemonspecy;
      const evolutionData = speciesData.pokemon_v2_evolutionchain?.pokemon_v2_pokemonspecies || [];
      
      const evolutions = evolutionData.map((evo: any) => ({
        id: evo.id,
        name: evo.name,
        evolves_from: evo.evolves_from_species_id
      }));

      // Process flavor text
      const flavorTextEntry = speciesData.pokemon_v2_pokemonspeciesflavortexts[0];
      const flavorText = flavorTextEntry ? flavorTextEntry.flavor_text : '';

      // Create the full PokemonDetails object
      const details: PokemonDetails = {
        id: pokemon.id,
        name: pokemon.name,
        height: pokemon.height,
        weight: pokemon.weight,
        types,
        abilities,
        stats,
        sprites,
        moves,
        flavor_text: flavorText,
        genera: speciesData.genera[0]?.genus || '',
        generation: speciesData.pokemon_v2_generation?.name || '',
        evolution_chain: evolutions,
        base_experience: pokemon.base_experience,
        has_evolutions: evolutions.length > 1
      };

      // Cache the result
      pokemonDetailsCache[pokemon.id] = details;
      return details;
    });

    }
    
    // For special form Pokémon IDs (>= 10000), fetch individually with REST API
    const specialFormIds = uncachedIds.filter(id => id >= 10000);
    if (specialFormIds.length > 0) {
      console.log(`Fetching ${specialFormIds.length} special form Pokémon with REST API`);
      const specialFormResults = await Promise.all(
        specialFormIds.map(id => {
          // For these special forms, convert the ID to the base ID for the species
          // For example, Alolan forms (10xxx) should use the base form species
          const baseId = Math.floor(id % 1000); // Extract the base Pokémon ID
          
          return fetchPokemonDetails(baseId)
            .then(baseData => {
              // Create a modified version with special form ID
              const formData: PokemonDetails = {...baseData, id: id};
              // Cache the special form data
              pokemonDetailsCache[id] = formData;
              return formData;
            })
            .catch(err => {
              console.error(`Failed to fetch special form Pokémon ${id}:`, err);
              return null;
            });
        })
      );
      
      // Add successfully fetched special forms to our results
      fetchedPokemon = [...fetchedPokemon, ...specialFormResults.filter(Boolean) as PokemonDetails[]];
    }
    
    // Combine cached and fetched Pokémon and sort by original ID order
    const allPokemon = [...cachedPokemon, ...fetchedPokemon];
    
    // Sort by the original order of IDs
    return pokemonIds.map(id => 
      allPokemon.find(p => p.id === id) || pokemonDetailsCache[id]
    ).filter(Boolean) as PokemonDetails[];
    
  } catch (error) {
    console.error('Error fetching multiple Pokémon details:', error);
    
    // Fall back to individual REST API calls when GraphQL fails
    console.log('Falling back to individual REST API calls...');
    const results = await Promise.all(
      pokemonIds.map(id => fetchPokemonDetails(id).catch(() => null))
    );
    
    return results.filter(Boolean) as PokemonDetails[];
  }
};

export const fetchFilterOptions = async () => {
  try {
    console.log('Fetching filter options from:', GRAPHQL_ENDPOINT);
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
