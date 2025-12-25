import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, 'data', 'pokemon-db.json');

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
  }
}
`;

async function fetchPokemonData() {
  console.log('Fetching ALL Pokemon data (including all moves) from PokeAPI GraphQL...');
  
  try {
    const response = await fetch(POKEAPI_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: QUERY }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

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
        stats: {
          hp: p.pokemon_v2_pokemonstats.find(s => s.pokemon_v2_stat.name === 'hp')?.base_stat || 0,
          attack: p.pokemon_v2_pokemonstats.find(s => s.pokemon_v2_stat.name === 'attack')?.base_stat || 0,
          defense: p.pokemon_v2_pokemonstats.find(s => s.pokemon_v2_stat.name === 'defense')?.base_stat || 0,
          speed: p.pokemon_v2_pokemonstats.find(s => s.pokemon_v2_stat.name === 'speed')?.base_stat || 0,
        },
        height: p.height,
        weight: p.weight,
        generation: `generation-${intToRoman(species.generation_id)}`,
        is_legendary: species.is_legendary,
        is_mythical: species.is_mythical,
        moves: [...new Set(p.pokemon_v2_pokemonmoves.map(m => m.pokemon_v2_move.name))],
        evolution: {
          is_starter: STARTER_POKEMON.includes(p.name.toLowerCase()),
          evolves_from: species.evolves_from_species_id,
          can_evolve: actuallyCanEvolve
        }
      };
    });

    console.log(`Fetched ${pokemons.length} Pokemon.`);
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(pokemons, null, 2));
    console.log(`Saved complete data to ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('Failed to fetch data:', error);
    process.exit(1);
  }
}

function intToRoman(num) {
  const roman = {
    1: 'i', 2: 'ii', 3: 'iii', 4: 'iv', 5: 'v', 6: 'vi', 7: 'vii', 8: 'viii', 9: 'ix'
  };
  return roman[num] || 'i';
}

fetchPokemonData();