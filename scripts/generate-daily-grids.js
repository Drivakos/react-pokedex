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

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

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
];

const OTHER_CONSTRAINTS = [
  { id: 'high-hp', type: 'stat-range', value: 'hp-high', label: 'High HP (≥ 100)', description: 'HP ≥ 100', icon: 'HP+' },
  { id: 'high-attack', type: 'stat-range', value: 'attack-high', label: 'High Attack (≥ 120)', description: 'Attack ≥ 120', icon: 'ATK+' },
  { id: 'high-speed', type: 'stat-range', value: 'speed-high', label: 'High Speed (≥ 100)', description: 'Speed ≥ 100', icon: 'SPD+' },
  { id: 'final-evo', type: 'evolution-stage', value: 'final', label: 'Final Evolution', description: 'Final evolution Pokémon', icon: 'FE' },
  { id: 'dual-type', type: 'type-count', value: 'dual', label: 'Dual Type', description: 'Dual-type Pokémon', icon: '2T' },
  { id: 'single-type', type: 'type-count', value: 'single', label: 'Single Type', description: 'Single-type Pokémon', icon: '1T' },
];

// Seeded random number generator
function createSeededRandom(seed) {
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
function shuffleArray(array, random) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generate constraints for a specific date
function generateConstraintsForDate(date) {
  const dateString = date.toISOString().split('T')[0];
  const seed = `pokegrid-${dateString}`;
  const random = createSeededRandom(seed);
  
  // Always use type constraints (they're the most common)
  const shuffledTypes = shuffleArray(TYPE_CONSTRAINTS, random);
  const shuffledOther = shuffleArray([...GENERATION_CONSTRAINTS, ...OTHER_CONSTRAINTS], random);
  
  // Pick 3 random type constraints
  const rowConstraints = shuffledTypes.slice(0, 3);
  
  // Pick 3 mixed constraints (2 types + 1 other, or 1 type + 2 other)
  const useMoreTypes = random() > 0.5;
  const colConstraints = useMoreTypes
    ? [...shuffledTypes.slice(3, 5), shuffledOther[0]]
    : [shuffledTypes[3], ...shuffledOther.slice(1, 3)];
  
  return {
    rows: rowConstraints,
    cols: colConstraints,
    seed,
    difficulty: 'medium'
  };
}

// Save grid configuration to database
async function saveGridConfiguration(date, constraints) {
  const dateString = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
  try {
    const { data, error } = await supabase.rpc('save_pokegrid_configuration', {
      p_grid_date: dateString,
      p_configuration: {
        rows: constraints.rows,
        cols: constraints.cols
      },
      p_difficulty_level: constraints.difficulty,
      p_generation_seed: constraints.seed
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
  
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
    process.exit(1);
  }
  
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
    
    console.log(`\n🔧 Generating grid for ${dateString}:`);
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

