import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

const POKEAPI_GRAPHQL_URL = 'https://beta.pokeapi.co/graphql/v1beta';

const STARTER_POKEMON = [
  'bulbasaur', 'ivysaur', 'venusaur', 'charmander', 'charmeleon', 'charizard', 'squirtle', 'wartortle', 'blastoise',
  'chikorita', 'bayleef', 'meganium', 'cyndaquil', 'quilava', 'typhlosion', 'totodile', 'croconaw', 'feraligatr',
  'treecko', 'grovyle', 'sceptile', 'torchic', 'combusken', 'blaziken', 'mudkip', 'marshtomp', 'swampert',
  'turtwig', 'grotle', 'torterra', 'chimchar', 'monferno', 'infernape', 'piplup', 'prinplup', 'empoleon',
  'snivy', 'servine', 'serperior', 'tepig', 'pignite', 'emboar', 'oshawott', 'dewott', 'samurott',
  'chespin', 'quilladin', 'chesnaught', 'fennekin', 'braixen', 'delphox', 'froakie', 'frogadier', 'greninja',
  'rowlet', 'decidueye', 'litten', 'torracat', 'incineroar', 'popplio', 'brionne', 'primarina',
  'grookey', 'thwackey', 'rillaboom', 'scorbunny', 'raboot', 'cinderace', 'sobble', 'drizzile', 'inteleon',
  'sprigatito', 'floragato', 'meowscarada', 'fuecoco', 'crocalor', 'skeledirge', 'quaxly', 'quaxwell', 'quaquaval'
];

const QUERY = `
query MyQuery {
  pokemon_v2_pokemon(where: {is_default: {_eq: true}}) {
    id
    name
    height
    weight
    pokemon_v2_pokemontypes {
      pokemon_v2_type {
        name
      }
    }
    pokemon_v2_pokemonstats {
      base_stat
      pokemon_v2_stat {
        name
      }
    }
    pokemon_v2_pokemonmoves {
      pokemon_v2_move {
        name
      }
    }
    pokemon_v2_pokemonspecy {
      generation_id
      is_legendary
      is_mythical
      evolves_from_species_id
      pokemon_v2_evolutionchain {
        pokemon_v2_pokemonspecies {
          id
          name
          evolves_from_species_id
        }
      }
    }
    base_experience
  }
}
`;

async function syncPokemonData() {
  console.log('🚀 Starting Pokemon data sync to Supabase...');
  
  try {
    console.log('📡 Fetching data from PokeAPI GraphQL...');
    const response = await fetch(POKEAPI_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const json = await response.json();
    if (json.errors) {
      console.error('GraphQL Errors:', json.errors);
      throw new Error('GraphQL query failed');
    }

    const pokemons = json.data.pokemon_v2_pokemon.map(p => {
      const species = p.pokemon_v2_pokemonspecy;
      const evoChain = species.pokemon_v2_evolutionchain.pokemon_v2_pokemonspecies;
      
      const mySpeciesInChain = evoChain.find(s => s.name === p.name);
      const mySpeciesId = mySpeciesInChain ? mySpeciesInChain.id : p.id;
      const actuallyCanEvolve = evoChain.some(s => s.evolves_from_species_id === mySpeciesId);

      return {
        id: p.id,
        name: p.name,
        types: p.pokemon_v2_pokemontypes.map(t => t.pokemon_v2_type.name),
        hp: p.pokemon_v2_pokemonstats.find(s => s.pokemon_v2_stat.name === 'hp')?.base_stat || 0,
        attack: p.pokemon_v2_pokemonstats.find(s => s.pokemon_v2_stat.name === 'attack')?.base_stat || 0,
        defense: p.pokemon_v2_pokemonstats.find(s => s.pokemon_v2_stat.name === 'defense')?.base_stat || 0,
        special_attack: p.pokemon_v2_pokemonstats.find(s => s.pokemon_v2_stat.name === 'special-attack')?.base_stat || 0,
        special_defense: p.pokemon_v2_pokemonstats.find(s => s.pokemon_v2_stat.name === 'special-defense')?.base_stat || 0,
        speed: p.pokemon_v2_pokemonstats.find(s => s.pokemon_v2_stat.name === 'speed')?.base_stat || 0,
        height: p.height,
        weight: p.weight,
        base_experience: p.base_experience,
        generation: `generation-${intToRoman(species.generation_id)}`,
        is_legendary: species.is_legendary,
        is_mythical: species.is_mythical,
        moves: [...new Set(p.pokemon_v2_pokemonmoves.map(m => m.pokemon_v2_move.name))],
        is_starter: STARTER_POKEMON.includes(p.name.toLowerCase()),
        evolves_from_id: species.evolves_from_species_id,
        can_evolve: actuallyCanEvolve
      };
    });

    console.log(`✅ Fetched ${pokemons.length} Pokemon. Starting Supabase upload...`);

    // Upsert in chunks
    const CHUNK_SIZE = 50;
    for (let i = 0; i < pokemons.length; i += CHUNK_SIZE) {
      const chunk = pokemons.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('pokemon')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        console.error(`❌ Error upserting chunk ${i / CHUNK_SIZE + 1}:`, error.message);
      } else {
        process.stdout.write(`\rProgress: ${Math.min(i + CHUNK_SIZE, pokemons.length)}/${pokemons.length} Pokemon synced...`);
      }
    }

    console.log('\n✨ Pokemon sync complete!');

    // Refresh filter options
    console.log('🔄 Refreshing filter options...');
    await refreshFilterOptions(pokemons);

  } catch (error) {
    console.error('❌ Failed to sync data:', error);
    process.exit(1);
  }
}

async function refreshFilterOptions(pokemons) {
  const types = [...new Set(pokemons.flatMap(p => p.types))];
  const generations = [...new Set(pokemons.map(p => p.generation))];

  const options = [
    ...types.map(t => ({ category: 'type', name: t })),
    ...generations.map(g => ({ category: 'generation', name: g }))
  ];

  const { error } = await supabase
    .from('filter_options')
    .upsert(options, { onConflict: 'category, name' });

  if (error) {
    console.error('❌ Error refreshing filter options:', error.message);
  } else {
    console.log('✅ Filter options refreshed.');
  }
}

function intToRoman(num) {
  const roman = {
    1: 'i', 2: 'ii', 3: 'iii', 4: 'iv', 5: 'v', 6: 'vi', 7: 'vii', 8: 'viii', 9: 'ix'
  };
  return roman[num] || 'i';
}

syncPokemonData();
