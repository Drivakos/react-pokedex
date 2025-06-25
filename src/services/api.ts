import { Pokemon, RawPokemonData, Filters, PokemonDetails } from '../types/pokemon';

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
 * Fetches detailed Pokemon data from the REST API
 */
export const fetchPokemonDetails = async (id: number): Promise<PokemonDetails> => {
  try {
    // Fetch basic Pokemon data
    const pokemonResponse = await fetch(`${REST_ENDPOINT}/pokemon/${id}`);
    const pokemonData = await pokemonResponse.json();
    
    // Fetch species data for evolution chain and flavor text
    const speciesResponse = await fetch(`${REST_ENDPOINT}/pokemon-species/${id}`);
    const speciesData = await speciesResponse.json();
    
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
    
    return {
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
  } catch (error) {
    console.error(`Error fetching detailed Pokemon data for ID ${id}:`, error);
    throw error;
  }
};

/**
 * Fetches available filter options (types, moves, generations)
 */
export const fetchFilterOptions = async () => {
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
