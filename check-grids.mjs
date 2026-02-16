import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// --- POKEMON DATA LOADING ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let POKEMON_DB = [];

async function loadPokemonFromSupabase() {
  console.log('Loading Pokemon data from Supabase...');
  try {
    const { data, error } = await supabase
      .from('pokemon')
      .select('*');

    if (error) throw error;

    POKEMON_DB = data.map(p => ({
      id: p.id,
      name: p.name,
      types: p.types,
      stats: {
        hp: p.hp,
        attack: p.attack,
        defense: p.defense,
        'special-attack': p.special_attack,
        'special-defense': p.special_defense,
        speed: p.speed
      },
      height: p.height,
      weight: p.weight,
      base_experience: p.base_experience,
      generation: p.generation,
      is_legendary: p.is_legendary,
      is_mythical: p.is_mythical,
      moves: p.moves || [],
      evolution: {
        is_starter: p.is_starter,
        evolves_from: p.evolves_from_id,
        can_evolve: p.can_evolve
      }
    }));
    console.log(`Loaded ${POKEMON_DB.length} Pokemon for verification.`);
  } catch (error) {
    console.error('Error loading Pokemon from Supabase:', error);
    process.exit(1);
  }
}

// Type effectiveness chart
const TYPE_EFFECTIVENESS = {
  fire: { weak_to: ['water', 'ground', 'rock'], resists: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'] },
  water: { weak_to: ['electric', 'grass'], resists: ['fire', 'water', 'ice', 'steel'] },
  grass: { weak_to: ['fire', 'ice', 'poison', 'flying', 'bug'], resists: ['water', 'electric', 'grass', 'ground'] },
  electric: { weak_to: ['ground'], resists: ['electric', 'flying', 'steel'] },
  psychic: { weak_to: ['bug', 'ghost', 'dark'], resists: ['fighting', 'psychic'] },
  ice: { weak_to: ['fire', 'fighting', 'rock', 'steel'], resists: ['ice'] },
  dragon: { weak_to: ['ice', 'dragon', 'fairy'], resists: ['fire', 'water', 'electric', 'grass'] },
  flying: { weak_to: ['electric', 'ice', 'rock'], resists: ['grass', 'fighting', 'bug'] },
  normal: { weak_to: ['fighting'], resists: [] },
  fighting: { weak_to: ['flying', 'psychic', 'fairy'], resists: ['rock', 'bug', 'dark'] },
  poison: { weak_to: ['ground', 'psychic'], resists: ['grass', 'fighting', 'poison', 'bug', 'fairy'] },
  ground: { weak_to: ['water', 'grass', 'ice'], resists: ['poison', 'rock'] },
  rock: { weak_to: ['water', 'grass', 'fighting', 'ground', 'steel'], resists: ['normal', 'fire', 'poison', 'flying'] },
  bug: { weak_to: ['fire', 'flying', 'rock'], resists: ['grass', 'fighting', 'ground'] },
  ghost: { weak_to: ['ghost', 'dark'], resists: ['poison', 'bug'] },
  steel: { weak_to: ['fire', 'fighting', 'ground'], resists: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'] },
  dark: { weak_to: ['fighting', 'bug', 'fairy'], resists: ['ghost', 'dark'] },
  fairy: { weak_to: ['poison', 'steel'], resists: ['fighting', 'bug', 'dark'] },
};

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

function checkConstraint(pokemon, constraint) {
  if (!pokemon) return false;
  
  switch (constraint.type) {
    case 'type': return pokemon.types.includes(constraint.value);
    case 'generation': return pokemon.generation === constraint.value;
    case 'evolution-stage': {
      if (constraint.value === 'starter') return STARTER_POKEMON.includes(pokemon.name.toLowerCase());
      if (constraint.value === 'first') return pokemon.evolution.evolves_from && pokemon.evolution.can_evolve;
      if (constraint.value === 'final') return !pokemon.evolution.can_evolve;
      if (constraint.value === 'none') return !pokemon.evolution.evolves_from && !pokemon.evolution.can_evolve;
      if (constraint.value === 'legendary') return pokemon.is_legendary;
      if (constraint.value === 'mythical') return pokemon.is_mythical;
      return false;
    }
    case 'type-count':
      if (constraint.value === 'single') return pokemon.types.length === 1;
      if (constraint.value === 'dual') return pokemon.types.length === 2;
      return false;
    case 'stat-range': {
      const {hp, attack, defense, speed} = pokemon.stats;
      if (constraint.value === 'hp-high') return hp >= 100;
      if (constraint.value === 'hp-low') return hp <= 50;
      if (constraint.value === 'attack-high') return attack >= 120;
      if (constraint.value === 'attack-low') return attack <= 60;
      if (constraint.value === 'defense-high') return defense >= 100;
      if (constraint.value === 'defense-low') return defense <= 60;
      if (constraint.value === 'speed-high') return speed >= 100;
      if (constraint.value === 'speed-low') return speed <= 50;
      return false;
    }
    case 'height-weight': {
      if (constraint.value === 'small') return pokemon.height < 10 && pokemon.weight < 300;
      if (constraint.value === 'medium') return pokemon.height >= 10 && pokemon.height <= 20;
      if (constraint.value === 'large') return pokemon.height > 20 || pokemon.weight > 1000;
      if (constraint.value === 'light') return pokemon.weight < 100;
      if (constraint.value === 'heavy') return pokemon.weight > 2000;
      return false;
    }
    case 'move-category': return pokemon.moves.includes(constraint.value);
    case 'type-effectiveness': {
      if (constraint.value.startsWith('weak-')) {
        const type = constraint.value.replace('weak-', '');
        return pokemon.types.some(t => TYPE_EFFECTIVENESS[t]?.weak_to.includes(type));
      }
      if (constraint.value.startsWith('resist-')) {
        const type = constraint.value.replace('resist-', '');
        return pokemon.types.some(t => TYPE_EFFECTIVENESS[t]?.resists.includes(type));
      }
      return false;
    }
    default: return true;
  }
}

async function verifyGrids() {
  await loadPokemonFromSupabase();
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: grids, error } = await supabase
      .from('pokegrid_daily_configs')
      .select('grid_date, difficulty_level, row_constraints, col_constraints')
      .gte('grid_date', today)
      .order('grid_date', {ascending: true})
      .limit(10);

    if (error) throw error;

    console.log(`\nVerifying ${grids.length} upcoming grids against Pokemon Database...`);
    
    let totalIssues = 0;

    for (const grid of grids) {
      console.log(`\n📅 ${grid.grid_date} (${grid.difficulty_level})`);
      const rows = grid.row_constraints;
      const cols = grid.col_constraints;
      
      let gridIssues = 0;
      
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const rowC = rows[r];
          const colC = cols[c];
          
          const solutions = POKEMON_DB.filter(p => 
            checkConstraint(p, rowC) && checkConstraint(p, colC)
          );
          
          const count = solutions.length;
          const status = count > 0 ? '✅' : '❌';
          const countStr = count > 0 ? `(${count} solutions)` : '(IMPOSSIBLE)';
          
          if (count === 0) {
            console.log(`   ${status} [${r},${c}] ${rowC.label} + ${colC.label} => ${countStr}`);
            gridIssues++;
          } else if (count < 3) {
             console.log(`   ⚠️ [${r},${c}] ${rowC.label} + ${colC.label} => Very hard! ${countStr}: ${solutions.map(p => p.name).join(', ')}`);
          }
        }
      }
      
      if (gridIssues === 0) {
        console.log('   ✨ All cells solvable!');
      } else {
        console.log(`   🚫 Found ${gridIssues} impossible cells.`);
        totalIssues += gridIssues;
      }
    }
    
    console.log(`\nVerification complete. Total impossible cells found: ${totalIssues}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

verifyGrids();