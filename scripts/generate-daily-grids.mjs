/**
 * Daily Grid Generation Script
 * 
 * This script generates Pokémon Grid Challenge configurations for multiple days.
 * It ensures all users see the same constraints for a given date.
 * 
 * Usage:
 *   node scripts/generate-daily-grids.js [days]
 * 
 * Examples:
 *   node scripts/generate-daily-grids.js        // Generate for today
 *   node scripts/generate-daily-grids.js 7      // Generate for next 7 days
 *   node scripts/generate-daily-grids.js -1     // Generate for yesterday (backfill)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Use anon key for database operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
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
    console.log(`Loaded ${POKEMON_DB.length} Pokemon for validation.`);
  } catch (error) {
    console.error('Error loading Pokemon from Supabase:', error);
    process.exit(1);
  }
}

// Type effectiveness chart for checking weaknesses and resistances
// Added immunities for better validation
const TYPE_EFFECTIVENESS = {
  fire: { weak_to: ['water', 'ground', 'rock'], resists: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], immune_to: [] },
  water: { weak_to: ['electric', 'grass'], resists: ['fire', 'water', 'ice', 'steel'], immune_to: [] },
  grass: { weak_to: ['fire', 'ice', 'poison', 'flying', 'bug'], resists: ['water', 'electric', 'grass', 'ground'], immune_to: [] },
  electric: { weak_to: ['ground'], resists: ['electric', 'flying', 'steel'], immune_to: [] },
  psychic: { weak_to: ['bug', 'ghost', 'dark'], resists: ['fighting', 'psychic'], immune_to: [] },
  ice: { weak_to: ['fire', 'fighting', 'rock', 'steel'], resists: ['ice'], immune_to: [] },
  dragon: { weak_to: ['ice', 'dragon', 'fairy'], resists: ['fire', 'water', 'electric', 'grass'], immune_to: [] },
  flying: { weak_to: ['electric', 'ice', 'rock'], resists: ['grass', 'fighting', 'bug'], immune_to: ['ground'] },
  normal: { weak_to: ['fighting'], resists: [], immune_to: ['ghost'] },
  fighting: { weak_to: ['flying', 'psychic', 'fairy'], resists: ['rock', 'bug', 'dark'], immune_to: [] },
  poison: { weak_to: ['ground', 'psychic'], resists: ['grass', 'fighting', 'poison', 'bug', 'fairy'], immune_to: [] },
  ground: { weak_to: ['water', 'grass', 'ice'], resists: ['poison', 'rock'], immune_to: ['electric'] },
  rock: { weak_to: ['water', 'grass', 'fighting', 'ground', 'steel'], resists: ['normal', 'fire', 'poison', 'flying'], immune_to: [] },
  bug: { weak_to: ['fire', 'flying', 'rock'], resists: ['grass', 'fighting', 'ground'], immune_to: [] },
  ghost: { weak_to: ['ghost', 'dark'], resists: ['poison', 'bug'], immune_to: ['normal', 'fighting'] },
  steel: { weak_to: ['fire', 'fighting', 'ground'], resists: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], immune_to: ['poison'] },
  dark: { weak_to: ['fighting', 'bug', 'fairy'], resists: ['ghost', 'dark'], immune_to: ['psychic'] },
  fairy: { weak_to: ['poison', 'steel'], resists: ['fighting', 'bug', 'dark'], immune_to: ['dragon'] },
};

const STARTER_POKEMON = [
  // Gen 1
  'bulbasaur', 'ivysaur', 'venusaur',
  'charmander', 'charmeleon', 'charizard',
  'squirtle', 'wartortle', 'blastoise',
  // Gen 2
  'chikorita', 'bayleef', 'meganium',
  'cyndaquil', 'quilava', 'typhlosion',
  'totodile', 'croconaw', 'feraligatr',
  // Gen 3
  'treecko', 'grovyle', 'sceptile',
  'torchic', 'combusken', 'blaziken',
  'mudkip', 'marshtomp', 'swampert',
  // Gen 4
  'turtwig', 'grotle', 'torterra',
  'chimchar', 'monferno', 'infernape',
  'piplup', 'prinplup', 'empoleon',
  // Gen 5
  'snivy', 'servine', 'serperior',
  'tepig', 'pignite', 'emboar',
  'oshawott', 'dewott', 'samurott',
  // Gen 6
  'chespin', 'quilladin', 'chesnaught',
  'fennekin', 'braixen', 'delphox',
  'froakie', 'frogadier', 'greninja',
  // Gen 7
  'rowlet', 'decidueye',
  'litten', 'torracat', 'incineroar',
  'popplio', 'brionne', 'primarina',
  // Gen 8
  'grookey', 'thwackey', 'rillaboom',
  'scorbunny', 'raboot', 'cinderace',
  'sobble', 'drizzile', 'inteleon',
  // Gen 9
  'sprigatito', 'floragato', 'meowscarada',
  'fuecoco', 'crocalor', 'skeledirge',
  'quaxly', 'quaxwell', 'quaquaval'
];

// Import constraint definitions
const TYPE_CONSTRAINTS = [
  { id: 'fire-type', type: 'type', value: 'fire', label: 'Fire', description: 'Fire-type Pokémon', svgIcon: '/icons/types/fire.svg' },
  { id: 'water-type', type: 'type', value: 'water', label: 'Water', description: 'Water-type Pokémon', svgIcon: '/icons/types/water.svg' },
  { id: 'grass-type', type: 'type', value: 'grass', label: 'Grass', description: 'Grass-type Pokémon', svgIcon: '/icons/types/grass.svg' },
  { id: 'electric-type', type: 'type', value: 'electric', label: 'Electric', description: 'Electric-type Pokémon', svgIcon: '/icons/types/electric.svg' },
  { id: 'psychic-type', type: 'type', value: 'psychic', label: 'Psychic', description: 'Psychic-type Pokémon', svgIcon: '/icons/types/psychic.svg' },
  { id: 'ice-type', type: 'type', value: 'ice', label: 'Ice', description: 'Ice-type Pokémon', svgIcon: '/icons/types/ice.svg' },
  { id: 'dragon-type', type: 'type', value: 'dragon', label: 'Dragon', description: 'Dragon-type Pokémon', svgIcon: '/icons/types/dragon.svg' },
  { id: 'flying-type', type: 'type', value: 'flying', label: 'Flying', description: 'Flying-type Pokémon', svgIcon: '/icons/types/flying.svg' },
  { id: 'normal-type', type: 'type', value: 'normal', label: 'Normal', description: 'Normal-type Pokémon', svgIcon: '/icons/types/normal.svg' },
  { id: 'fighting-type', type: 'type', value: 'fighting', label: 'Fighting', description: 'Fighting-type Pokémon', svgIcon: '/icons/types/fighting.svg' },
  { id: 'poison-type', type: 'type', value: 'poison', label: 'Poison', description: 'Poison-type Pokémon', svgIcon: '/icons/types/poison.svg' },
  { id: 'ground-type', type: 'type', value: 'ground', label: 'Ground', description: 'Ground-type Pokémon', svgIcon: '/icons/types/ground.svg' },
  { id: 'rock-type', type: 'type', value: 'rock', label: 'Rock', description: 'Rock-type Pokémon', svgIcon: '/icons/types/rock.svg' },
  { id: 'bug-type', type: 'type', value: 'bug', label: 'Bug', description: 'Bug-type Pokémon', svgIcon: '/icons/types/bug.svg' },
  { id: 'ghost-type', type: 'type', value: 'ghost', label: 'Ghost', description: 'Ghost-type Pokémon', svgIcon: '/icons/types/ghost.svg' },
  { id: 'steel-type', type: 'type', value: 'steel', label: 'Steel', description: 'Steel-type Pokémon', svgIcon: '/icons/types/steel.svg' },
  { id: 'dark-type', type: 'type', value: 'dark', label: 'Dark', description: 'Dark-type Pokémon', svgIcon: '/icons/types/dark.svg' },
  { id: 'fairy-type', type: 'type', value: 'fairy', label: 'Fairy', description: 'Fairy-type Pokémon', svgIcon: '/icons/types/fairy.svg' },
];

const GENERATION_CONSTRAINTS = [
  { id: 'gen-1', type: 'generation', value: 'generation-i', label: 'Generation I', description: 'Kanto region Pokémon', icon: 'I' },
  { id: 'gen-2', type: 'generation', value: 'generation-ii', label: 'Generation II', description: 'Johto region Pokémon', icon: 'II' },
  { id: 'gen-3', type: 'generation', value: 'generation-iii', label: 'Generation III', description: 'Hoenn region Pokémon', icon: 'III' },
  { id: 'gen-4', type: 'generation', value: 'generation-iv', label: 'Generation IV', description: 'Sinnoh region Pokémon', icon: 'IV' },
  { id: 'gen-5', type: 'generation', value: 'generation-v', label: 'Generation V', description: 'Unova region Pokémon', icon: 'V' },
  { id: 'gen-6', type: 'generation', value: 'generation-vi', label: 'Generation VI', description: 'Kalos region Pokémon', icon: 'VI' },
  { id: 'gen-7', type: 'generation', value: 'generation-vii', label: 'Generation VII', description: 'Alola region Pokémon', icon: 'VII' },
  { id: 'gen-8', type: 'generation', value: 'generation-viii', label: 'Generation VIII', description: 'Galar region Pokémon', icon: 'VIII' },
  { id: 'gen-9', type: 'generation', value: 'generation-ix', label: 'Generation IX', description: 'Paldea region Pokémon', icon: 'IX' },
];

const EVOLUTION_CONSTRAINTS = [
  { id: 'starter', type: 'evolution-stage', value: 'starter', label: 'Starter', description: 'Starter Pokémon', icon: 'S' },
  { id: 'first-evo', type: 'evolution-stage', value: 'first', label: 'First Evolution', description: 'First evolution stage', icon: '1E' },
  { id: 'final-evo', type: 'evolution-stage', value: 'final', label: 'Final Evolution', description: 'Final evolution Pokémon', icon: 'FE' },
  { id: 'no-evolution', type: 'evolution-stage', value: 'none', label: 'No Evolution', description: 'Does not evolve', icon: 'NE' },
  { id: 'legendary', type: 'evolution-stage', value: 'legendary', label: 'Legendary', description: 'Legendary Pokémon', icon: 'L' },
  { id: 'mythical', type: 'evolution-stage', value: 'mythical', label: 'Mythical', description: 'Mythical Pokémon', icon: 'M' },
];

const STAT_CONSTRAINTS = [
  { id: 'high-hp', type: 'stat-range', value: 'hp-high', label: 'High HP (≥ 100)', description: 'HP ≥ 100', icon: 'HP+' },
  { id: 'low-hp', type: 'stat-range', value: 'hp-low', label: 'Low HP (≤ 50)', description: 'HP ≤ 50', icon: 'HP-' },
  { id: 'high-attack', type: 'stat-range', value: 'attack-high', label: 'High Attack (≥ 120)', description: 'Attack ≥ 120', icon: 'ATK+' },
  { id: 'low-attack', type: 'stat-range', value: 'attack-low', label: 'Low Attack (≤ 60)', description: 'Attack ≤ 60', icon: 'ATK-' },
  { id: 'high-defense', type: 'stat-range', value: 'defense-high', label: 'High Defense (≥ 100)', description: 'Defense ≥ 100', icon: 'DEF+' },
  { id: 'low-defense', type: 'stat-range', value: 'defense-low', label: 'Low Defense (≤ 60)', description: 'Defense ≤ 60', icon: 'DEF-' },
  { id: 'high-speed', type: 'stat-range', value: 'speed-high', label: 'High Speed (≥ 100)', description: 'Speed ≥ 100', icon: 'SPD+' },
  { id: 'low-speed', type: 'stat-range', value: 'speed-low', label: 'Low Speed (≤ 50)', description: 'Speed ≤ 50', icon: 'SPD-' },
];

const SIZE_CONSTRAINTS = [
  { id: 'small-size', type: 'height-weight', value: 'small', label: 'Small (< 1m & < 30kg)', description: 'Height < 1.0m AND Weight < 30kg', icon: 'SM' },
  { id: 'medium-size', type: 'height-weight', value: 'medium', label: 'Medium (1-2m)', description: 'Height 1.0m - 2.0m', icon: 'MD' },
  { id: 'large-size', type: 'height-weight', value: 'large', label: 'Large (> 2m or > 100kg)', description: 'Height > 2.0m OR Weight > 100kg', icon: 'LG' },
  { id: 'light-weight', type: 'height-weight', value: 'light', label: 'Light (< 10kg)', description: 'Weight < 10kg', icon: 'LT' },
  { id: 'heavy-weight', type: 'height-weight', value: 'heavy', label: 'Heavy (> 200kg)', description: 'Weight > 200kg', icon: 'HV' },
];

const TYPE_COUNT_CONSTRAINTS = [
  { id: 'single-type', type: 'type-count', value: 'single', label: 'Single Type', description: 'Single-type Pokémon', icon: '1T' },
  { id: 'dual-type', type: 'type-count', value: 'dual', label: 'Dual Type', description: 'Dual-type Pokémon', icon: '2T' },
];

const MOVE_CONSTRAINTS = [
  { id: 'learns-earthquake', type: 'move-category', value: 'earthquake', label: 'Learns Earthquake', description: 'Can learn Earthquake', icon: 'EQ' },
  { id: 'learns-surf', type: 'move-category', value: 'surf', label: 'Learns Surf', description: 'Can learn Surf', icon: 'SF' },
  { id: 'learns-fly', type: 'move-category', value: 'fly', label: 'Learns Fly', description: 'Can learn Fly', icon: 'FLY' },
  { id: 'learns-thunder-wave', type: 'move-category', value: 'thunder-wave', label: 'Learns Thunder Wave', description: 'Can learn Thunder Wave', icon: 'TW' },
  { id: 'learns-toxic', type: 'move-category', value: 'toxic', label: 'Learns Toxic', description: 'Can learn Toxic', icon: 'TOX' },
  { id: 'learns-ice-beam', type: 'move-category', value: 'ice-beam', label: 'Learns Ice Beam', description: 'Can learn Ice Beam', icon: 'IB' },
];

const TYPE_EFFECTIVENESS_CONSTRAINTS = [
  { id: 'weak-to-fire', type: 'type-effectiveness', value: 'weak-fire', label: 'Weak to Fire', description: 'Takes super effective damage from Fire', icon: 'W', svgIcon: '/icons/types/fire.svg' },
  { id: 'weak-to-water', type: 'type-effectiveness', value: 'weak-water', label: 'Weak to Water', description: 'Takes super effective damage from Water', icon: 'W', svgIcon: '/icons/types/water.svg' },
  { id: 'weak-to-electric', type: 'type-effectiveness', value: 'weak-electric', label: 'Weak to Electric', description: 'Takes super effective damage from Electric', icon: 'W', svgIcon: '/icons/types/electric.svg' },
  { id: 'weak-to-grass', type: 'type-effectiveness', value: 'weak-grass', label: 'Weak to Grass', description: 'Takes super effective damage from Grass', icon: 'W', svgIcon: '/icons/types/grass.svg' },
  { id: 'weak-to-ice', type: 'type-effectiveness', value: 'weak-ice', label: 'Weak to Ice', description: 'Takes super effective damage from Ice', icon: 'W', svgIcon: '/icons/types/ice.svg' },
  { id: 'weak-to-fighting', type: 'type-effectiveness', value: 'weak-fighting', label: 'Weak to Fighting', description: 'Takes super effective damage from Fighting', icon: 'W', svgIcon: '/icons/types/fighting.svg' },
  { id: 'resists-fire', type: 'type-effectiveness', value: 'resist-fire', label: 'Resists Fire', description: 'Takes reduced damage from Fire', icon: 'R', svgIcon: '/icons/types/fire.svg' },
  { id: 'resists-water', type: 'type-effectiveness', value: 'resist-water', label: 'Resists Water', description: 'Takes reduced damage from Water', icon: 'R', svgIcon: '/icons/types/water.svg' },
  { id: 'resists-grass', type: 'type-effectiveness', value: 'resist-grass', label: 'Resists Grass', description: 'Takes reduced damage from Grass', icon: 'R', svgIcon: '/icons/types/grass.svg' },
  { id: 'resists-steel', type: 'type-effectiveness', value: 'resist-steel', label: 'Resists Steel', description: 'Takes reduced damage from Steel', icon: 'R', svgIcon: '/icons/types/steel.svg' },
];

const OTHER_CONSTRAINTS = [
  ...GENERATION_CONSTRAINTS,
  ...EVOLUTION_CONSTRAINTS,
  ...STAT_CONSTRAINTS,
  ...SIZE_CONSTRAINTS,
  ...TYPE_COUNT_CONSTRAINTS,
  ...MOVE_CONSTRAINTS,
  ...TYPE_EFFECTIVENESS_CONSTRAINTS,
];

// Seeded random number generator
export function createSeededRandom(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return function() {
    hash = ((hash * 9301) + 49297) % 233280;
    return hash / 233280;
  };
}

// Shuffle array using seeded random
export function shuffleArray(array, random) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Check if a pokemon satisfies a constraint
function checkConstraint(pokemon, constraint) {
  switch (constraint.type) {
    case 'type':
      return pokemon.types.includes(constraint.value);
    
    case 'generation':
      return pokemon.generation === constraint.value;
    
    case 'evolution-stage': {
      if (constraint.value === 'starter') {
        return STARTER_POKEMON.includes(pokemon.name.toLowerCase());
      }
      if (constraint.value === 'first') {
        // First evolution - has evolved from something but can still evolve
        return pokemon.evolution.evolves_from && pokemon.evolution.can_evolve;
      }
      if (constraint.value === 'final') {
        // Final evolution - cannot evolve further
        return !pokemon.evolution.can_evolve;
      }
      if (constraint.value === 'none') {
        // No evolution - cannot evolve and has not evolved
        return !pokemon.evolution.evolves_from && !pokemon.evolution.can_evolve;
      }
      if (constraint.value === 'legendary') {
        return pokemon.is_legendary;
      }
      if (constraint.value === 'mythical') {
        return pokemon.is_mythical;
      }
      return false;
    }
    
    case 'type-count':
      if (constraint.value === 'single') return pokemon.types.length === 1;
      if (constraint.value === 'dual') return pokemon.types.length === 2;
      return false;
    
    case 'stat-range': {
      const statValue = constraint.value;
      const stats = pokemon.stats;
      
      if (statValue === 'hp-high') return stats.hp >= 100;
      if (statValue === 'hp-low') return stats.hp <= 50;
      if (statValue === 'attack-high') return stats.attack >= 120;
      if (statValue === 'attack-low') return stats.attack <= 60;
      if (statValue === 'defense-high') return stats.defense >= 100;
      if (statValue === 'defense-low') return stats.defense <= 60;
      if (statValue === 'speed-high') return stats.speed >= 100;
      if (statValue === 'speed-low') return stats.speed <= 50;
      return false;
    }

    case 'height-weight': {
      const sizeValue = constraint.value;
      // Height in dm, weight in hg
      if (sizeValue === 'small') return pokemon.height < 10 && pokemon.weight < 300;
      if (sizeValue === 'medium') return pokemon.height >= 10 && pokemon.height <= 20;
      if (sizeValue === 'large') return pokemon.height > 20 || pokemon.weight > 1000;
      if (sizeValue === 'light') return pokemon.weight < 100;
      if (sizeValue === 'heavy') return pokemon.weight > 2000;
      return false;
    }

    case 'move-category': {
      // Moves are already filtered strings in our DB
      return pokemon.moves.includes(constraint.value);
    }

    case 'type-effectiveness': {
      const effectValue = constraint.value;
      if (effectValue.startsWith('weak-')) {
        const attackingType = effectValue.replace('weak-', '');
        return pokemon.types.some(type => {
          const eff = TYPE_EFFECTIVENESS[type];
          if (!eff) return false;
          // Must be weak to the attacking type
          return eff.weak_to.includes(attackingType);
        }) && !pokemon.types.some(type => {
          const eff = TYPE_EFFECTIVENESS[type];
          if (!eff) return false;
          // But not if the other type resists or is immune to it (neutralizing the weakness)
          return eff.resists.includes(attackingType) || eff.immune_to.includes(attackingType);
        });
      }
      if (effectValue.startsWith('resist-')) {
        const attackingType = effectValue.replace('resist-', '');
        return pokemon.types.some(type => {
          const eff = TYPE_EFFECTIVENESS[type];
          if (!eff) return false;
          return eff.resists.includes(attackingType) || eff.immune_to.includes(attackingType);
        }) && !pokemon.types.some(type => {
          const eff = TYPE_EFFECTIVENESS[type];
          if (!eff) return false;
          // But not if the other type is weak to it (neutralizing the resistance)
          return eff.weak_to.includes(attackingType);
        });
      }
      return false;
    }

    default:
      return true;
  }
}

// Check if a constraint combination is solvable
export function isConstraintCombinationSolvable(rowConstraint, colConstraint) {
  // Handle undefined constraints
  if (!rowConstraint || !colConstraint) {
    return false;
  }

  // 1. Basic Heuristics (Fast fail & Common Sense)
  
  // Type vs Type-Effectiveness (The "Psychic and Weak to Fighting" case)
  // We want constraints to "make sense" even if technically solvable by a dual type.
  if ((rowConstraint.type === 'type' && colConstraint.type === 'type-effectiveness') ||
      (rowConstraint.type === 'type-effectiveness' && colConstraint.type === 'type')) {
    
    const typeConstraint = rowConstraint.type === 'type' ? rowConstraint : colConstraint;
    const effectConstraint = rowConstraint.type === 'type-effectiveness' ? rowConstraint : colConstraint;
    
    const type = typeConstraint.value;
    const effect = effectConstraint.value;
    const effectivenessData = TYPE_EFFECTIVENESS[type];

    if (effectivenessData) {
      const attackingType = effect.replace('weak-', '').replace('resist-', '');
      
      if (effect.startsWith('weak-')) {
        // A type shouldn't be paired with a weakness it resists or is immune to.
        // E.g., Psychic and Weak to Fighting.
        if (effectivenessData.resists.includes(attackingType) || 
            effectivenessData.immune_to.includes(attackingType)) {
          return false;
        }
      }
      
      if (effect.startsWith('resist-')) {
        // A type shouldn't be paired with a resistance it is weak to.
        // E.g., Fire and Resists Water.
        if (effectivenessData.weak_to.includes(attackingType)) {
          return false;
        }
      }
    }
  }

  // Type vs Type
  if (rowConstraint.type === 'type' && colConstraint.type === 'type') {
    // We'll keep the conflicting types check but keep it focused on 
    // combinations that are confusing or extremely rare.
    const conflictingTypes = [
      ['normal', 'ghost'],   // Immune to each other
      ['fire', 'water'],     // Opposite
      ['water', 'grass'],    // Opposite
      ['grass', 'fire'],     // Opposite
      ['electric', 'ground'],// Opposite (Ground immune)
      ['psychic', 'dark'],   // Opposite (Dark immune)
      ['dragon', 'fairy'],   // Opposite (Fairy immune)
      ['ghost', 'normal'],   // Duplicate of above
      ['poison', 'steel'],   // Steel immune to poison
    ];

    const isConflicting = conflictingTypes.some(([type1, type2]) =>
      (rowConstraint.value === type1 && colConstraint.value === type2) ||
      (rowConstraint.value === type2 && colConstraint.value === type1)
    );

    if (isConflicting) return false;
  }

  // 2. Data-driven Validation (if DB is loaded)
  if (POKEMON_DB.length > 0) {
    // Find at least ONE pokemon that satisfies both
    const hasMatch = POKEMON_DB.some(pokemon => 
      checkConstraint(pokemon, rowConstraint) && 
      checkConstraint(pokemon, colConstraint)
    );
    
    // For a better user experience, we might want at least 2-3 solutions 
    // to avoid "guess the only one" situations, but 1 is strictly solvable.
    return hasMatch;
  }

  // Fallback if no DB
  return true;
}

// Generate solvable constraints for a specific date
export function generateSolvableConstraintsForDate(date) {
  const dateString = date.toISOString().split('T')[0];
  const seed = `pokegrid-${dateString}`;
  const random = createSeededRandom(seed);

  let attempts = 0;
  const maxAttempts = 500; // Increased attempts because strict validation might reject more

  while (attempts < maxAttempts) {
    attempts++;

    // Always use type constraints (they're the most common)
    const shuffledTypes = shuffleArray(TYPE_CONSTRAINTS, random);
    const shuffledOther = shuffleArray(OTHER_CONSTRAINTS, random);

    // Pick 3 random type constraints for rows
    const rowConstraints = shuffledTypes.slice(0, 3);

    // Pick 3 mixed constraints for columns - ensure all are defined
    const useMoreTypes = random() > 0.5;
    let colConstraints;

    if (useMoreTypes) {
      // 2 types + 1 other constraint
      colConstraints = [
        shuffledTypes[3] || shuffledTypes[0],  // fallback to first if undefined
        shuffledTypes[4] || shuffledTypes[1],  // fallback to second if undefined
        shuffledOther[0] || shuffledOther[Math.floor(random() * shuffledOther.length)]  // random fallback
      ];
    } else {
      // 1 type + 2 other constraints
      colConstraints = [
        shuffledTypes[3] || shuffledTypes[0],  // fallback to first if undefined
        shuffledOther[1] || shuffledOther[0],  // fallback to first if undefined
        shuffledOther[2] || shuffledOther[Math.floor(random() * shuffledOther.length)]  // random fallback
      ];
    }

    // Final safety check - replace any remaining undefined constraints
    colConstraints = colConstraints.map(constraint =>
      constraint || shuffledTypes[Math.floor(random() * shuffledTypes.length)]
    );

    // Check if all combinations are solvable
    let allSolvable = true;
    const cellStats = [];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (!isConstraintCombinationSolvable(rowConstraints[row], colConstraints[col])) {
          allSolvable = false;
          break;
        }

        // Calculate solution count if DB is available
        if (POKEMON_DB.length > 0) {
          const count = POKEMON_DB.filter(pokemon => 
            checkConstraint(pokemon, rowConstraints[row]) && 
            checkConstraint(pokemon, colConstraints[col])
          ).length;
          cellStats.push({ row, col, count });
        }
      }
      if (!allSolvable) break;
    }

    if (allSolvable) {
      // Store cell stats in the first row constraint as metadata since we can't add columns easily
      if (cellStats.length === 9) {
        rowConstraints[0].meta = { cellStats };
      }

      return {
        rows: rowConstraints,
        cols: colConstraints,
        seed: `solvable-${seed}`,
        difficulty: 'medium'
      };
    }
  }

  // Fallback - use simple type-only constraints if we can't find solvable mixed constraints
  console.warn(`Could not find solvable constraints after ${maxAttempts} attempts, using fallback`);
  const shuffledTypes = shuffleArray(TYPE_CONSTRAINTS, random);
  
  const fallbackRows = shuffledTypes.slice(0, 3);
  const fallbackCols = shuffledTypes.slice(3, 6);
  
  if (POKEMON_DB.length > 0) {
    const fallbackStats = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const count = POKEMON_DB.filter(p => 
          checkConstraint(p, fallbackRows[r]) && 
          checkConstraint(p, fallbackCols[c])
        ).length;
        fallbackStats.push({ row: r, col: c, count });
      }
    }
    if (fallbackStats.length === 9) {
      fallbackRows[0].meta = { cellStats: fallbackStats };
    }
  }

  return {
    rows: fallbackRows,
    cols: fallbackCols,
    seed: `fallback-${seed}`,
    difficulty: 'easy'
  };
}

// Generate constraints for a specific date (legacy function for backwards compatibility)
function generateConstraintsForDate(date) {
  return generateSolvableConstraintsForDate(date);
}

// Save grid configuration to database
export async function saveGridConfiguration(date, constraints) {
  const dateString = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
  // Extract cell stats from metadata
  const cellStats = constraints.rows[0]?.meta?.cellStats || null;
  
  try {
    // Use the daily configs table which may have fewer RLS restrictions
    const { error } = await supabase
      .from('pokegrid_daily_configs')
      .upsert({
        grid_date: dateString,
        row_constraints: constraints.rows,
        col_constraints: constraints.cols,
        difficulty_level: constraints.difficulty || 'medium',
        generation_seed: constraints.seed || null,
        cell_stats: cellStats
      }, {
        onConflict: 'grid_date'
      });

    if (error) {
      console.error(`❌ Failed to save configuration for ${dateString}:`, error.message);
      return false;
    }
    
    console.log(`✅ Saved configuration for ${dateString}`);
    return true;
  } catch (error) {
    console.error(`❌ Error saving configuration for ${dateString}:`, error);
    return false;
  }
}

// Main function
async function generateDailyGrids(days = 0) {
  console.log('🎮 Pokémon Grid Challenge - Daily Grid Generator\n');
  
  if (!process.env.VITE_SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.VITE_SUPABASE_ANON_KEY)) {
    console.error('❌ Error: VITE_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY must be set in .env');
    process.exit(1);
  }

  await loadPokemonFromSupabase();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let startDate, endDate, totalDays;
  
  if (days === 0) {
    // Generate for today only
    startDate = new Date(today);
    endDate = new Date(today);
    totalDays = 1;
  } else if (days > 0) {
    // Generate for future days
    startDate = new Date(today);
    endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days - 1);
    totalDays = days;
  } else {
    // Generate for past days (backfill)
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() + days); // days is negative
    endDate = new Date(today);
    totalDays = Math.abs(days) + 1;
  }
  
  console.log(`📅 Generating grids from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  console.log(`📊 Total grids to generate: ${totalDays}\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0];
    const constraints = generateConstraintsForDate(currentDate);
    
    console.log(`\n🔧 Generating grid for ${dateString}:
`);
    console.log(`   Rows: ${constraints.rows.map(c => c.label).join(', ')}`);
    console.log(`   Cols: ${constraints.cols.map(c => c.label).join(', ')}`);
    
    const success = await saveGridConfiguration(currentDate, constraints);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Successfully generated: ${successCount}/${totalDays}`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount}/${totalDays}`);
  }
  console.log('\n🎉 Grid generation complete!\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const days = args.length > 0 ? parseInt(args[0], 10) : 0;

if (isNaN(days)) {
  console.error('❌ Invalid argument. Usage: node generate-daily-grids.js [days]');
  console.error('   Examples:');
  console.error('     node generate-daily-grids.js        // Generate for today');
  console.error('     node generate-daily-grids.js 7      // Generate for next 7 days');
  console.error('     node generate-daily-grids.js -1     // Generate for yesterday');
  process.exit(1);
}

// Run the script
generateDailyGrids(days)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });