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

// Use anon key for database operations
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

// Basic constraint checking logic (simplified for validation)
function checkBasicConstraints(pokemonTypes, constraint) {
  switch (constraint.type) {
    case 'type':
      return pokemonTypes.includes(constraint.value);
    case 'generation':
      // Assume we can check generation - simplified for now
      return true;
    case 'evolution-stage':
      // Simplified - assume most combinations work
      return constraint.value !== 'mythical' || constraint.value !== 'legendary';
    case 'type-count':
      return constraint.value === 'single' ? pokemonTypes.length === 1 : pokemonTypes.length === 2;
    case 'stat-range':
      // Simplified stat checking
      return true;
    case 'height-weight':
      // Simplified size checking
      return true;
    case 'move-category':
      // Simplified move checking
      return true;
    case 'type-effectiveness':
      // Simplified effectiveness checking
      return true;
    default:
      return true;
  }
}

// Check if a constraint combination is solvable
function isConstraintCombinationSolvable(rowConstraint, colConstraint) {
  // Handle undefined constraints
  if (!rowConstraint || !colConstraint) {
    return false;
  }

  // Quick checks for obviously impossible combinations
  if (rowConstraint.type === 'type' && colConstraint.type === 'type') {
    // Can't be both fire and water type, etc.
    const conflictingTypes = [
      ['fire', 'water'], ['fire', 'rock'], ['water', 'grass'], ['water', 'electric'],
      ['grass', 'fire'], ['grass', 'flying'], ['electric', 'ground'], ['ice', 'fire'],
      ['ice', 'steel'], ['fighting', 'ghost'], ['poison', 'ground'], ['ground', 'flying'],
      ['psychic', 'bug'], ['psychic', 'dark'], ['bug', 'flying'], ['ghost', 'normal'],
      ['dragon', 'fairy'], ['dark', 'fighting'], ['steel', 'fire'], ['fairy', 'steel']
    ];

    const isConflicting = conflictingTypes.some(([type1, type2]) =>
      (rowConstraint.value === type1 && colConstraint.value === type2) ||
      (rowConstraint.value === type2 && colConstraint.value === type1)
    );

    if (isConflicting) return false;
  }

  // Check for contradictory type effectiveness
  if (rowConstraint.type === 'type-effectiveness' && colConstraint.type === 'type-effectiveness') {
    const rowEffect = rowConstraint.value;
    const colEffect = colConstraint.value;

    // Can't be weak to fire and resist fire at the same time
    if (rowEffect.startsWith('weak-') && colEffect.startsWith('resist-')) {
      const rowType = rowEffect.replace('weak-', '');
      const colType = colEffect.replace('resist-', '');
      if (rowType === colType) return false;
    }
    if (rowEffect.startsWith('resist-') && colEffect.startsWith('weak-')) {
      const rowType = rowEffect.replace('resist-', '');
      const colType = colEffect.replace('weak-', '');
      if (rowType === colType) return false;
    }
  }

  // Check for contradictory stat ranges
  if (rowConstraint.type === 'stat-range' && colConstraint.type === 'stat-range') {
    const rowStat = rowConstraint.value;
    const colStat = colConstraint.value;

    // Can't have both high and low HP, etc.
    const statTypes = ['hp', 'attack', 'defense', 'speed'];
    for (const stat of statTypes) {
      if ((rowStat === `${stat}-high` && colStat === `${stat}-low`) ||
          (rowStat === `${stat}-low` && colStat === `${stat}-high`)) {
        return false;
      }
    }
  }

  // Most other combinations should be solvable
  return true;
}

// Generate solvable constraints for a specific date
function generateSolvableConstraintsForDate(date) {
  const dateString = date.toISOString().split('T')[0];
  const seed = `pokegrid-${dateString}`;
  const random = createSeededRandom(seed);

  let attempts = 0;
  const maxAttempts = 100;

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
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (!isConstraintCombinationSolvable(rowConstraints[row], colConstraints[col])) {
          allSolvable = false;
          break;
        }
      }
      if (!allSolvable) break;
    }

    if (allSolvable) {
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
  return {
    rows: shuffledTypes.slice(0, 3),
    cols: shuffledTypes.slice(3, 6),
    seed: `fallback-${seed}`,
    difficulty: 'easy'
  };
}

// Generate constraints for a specific date (legacy function for backwards compatibility)
function generateConstraintsForDate(date) {
  return generateSolvableConstraintsForDate(date);
}

// Save grid configuration to database
async function saveGridConfiguration(date, constraints) {
  const dateString = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
  try {
    // Use the daily configs table which may have fewer RLS restrictions
    const { data, error } = await supabase
      .from('pokegrid_daily_configs')
      .upsert({
        grid_date: dateString,
        row_constraints: constraints.rows,
        col_constraints: constraints.cols,
        difficulty_level: constraints.difficulty || 'medium',
        generation_seed: constraints.seed || null
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

