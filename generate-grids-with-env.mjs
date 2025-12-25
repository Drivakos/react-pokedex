import { createClient } from '@supabase/supabase-js';

// Use local development credentials
const supabase = createClient(
  'http://127.0.0.1:54321',
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
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
  { id: 'gen1-pokemon', type: 'generation', value: '1', label: 'Gen I', description: 'Generation I Pokémon (1-151)', svgIcon: '' },
  { id: 'gen2-pokemon', type: 'generation', value: '2', label: 'Gen II', description: 'Generation II Pokémon (152-251)', svgIcon: '' },
  { id: 'gen3-pokemon', type: 'generation', value: '3', label: 'Gen III', description: 'Generation III Pokémon (252-386)', svgIcon: '' },
  { id: 'gen4-pokemon', type: 'generation', value: '4', label: 'Gen IV', description: 'Generation IV Pokémon (387-493)', svgIcon: '' },
  { id: 'gen5-pokemon', type: 'generation', value: '5', label: 'Gen V', description: 'Generation V Pokémon (494-649)', svgIcon: '' },
  { id: 'gen6-pokemon', type: 'generation', value: '6', label: 'Gen VI', description: 'Generation VI Pokémon (650-721)', svgIcon: '' },
  { id: 'gen7-pokemon', type: 'generation', value: '7', label: 'Gen VII', description: 'Generation VII Pokémon (722-809)', svgIcon: '' },
  { id: 'gen8-pokemon', type: 'generation', value: '8', label: 'Gen VIII', description: 'Generation VIII Pokémon (810-905)', svgIcon: '' },
  { id: 'gen9-pokemon', type: 'generation', value: '9', label: 'Gen IX', description: 'Generation IX Pokémon (906+)', svgIcon: '' },
];

const EVOLUTION_STAGE_CONSTRAINTS = [
  { id: 'baby-pokemon', type: 'evolution-stage', value: 'baby', label: 'Baby', description: 'Baby Pokémon (pre-evolution)', svgIcon: '' },
  { id: 'basic-pokemon', type: 'evolution-stage', value: 'basic', label: 'Basic', description: 'Basic Pokémon (first stage)', svgIcon: '' },
  { id: 'stage1-pokemon', type: 'evolution-stage', value: 'stage1', label: 'Stage 1', description: 'First evolution Pokémon', svgIcon: '' },
  { id: 'stage2-pokemon', type: 'evolution-stage', value: 'stage2', label: 'Stage 2', description: 'Final evolution Pokémon', svgIcon: '' },
  { id: 'legendary-pokemon', type: 'evolution-stage', value: 'legendary', label: 'Legendary', description: 'Legendary Pokémon', svgIcon: '' },
  { id: 'mythical-pokemon', type: 'evolution-stage', value: 'mythical', label: 'Mythical', description: 'Mythical Pokémon', svgIcon: '' },
];

const STAT_RANGE_CONSTRAINTS = [
  { id: 'high-hp', type: 'stat-range', value: 'hp-high', label: 'High HP', description: 'Pokémon with HP ≥ 100', svgIcon: '' },
  { id: 'low-hp', type: 'stat-range', value: 'hp-low', label: 'Low HP', description: 'Pokémon with HP ≤ 50', svgIcon: '' },
  { id: 'high-attack', type: 'stat-range', value: 'attack-high', label: 'High Attack', description: 'Pokémon with Attack ≥ 100', svgIcon: '' },
  { id: 'high-defense', type: 'stat-range', value: 'defense-high', label: 'High Defense', description: 'Pokémon with Defense ≥ 100', svgIcon: '' },
  { id: 'high-speed', type: 'stat-range', value: 'speed-high', label: 'High Speed', description: 'Pokémon with Speed ≥ 100', svgIcon: '' },
  { id: 'low-speed', type: 'stat-range', value: 'speed-low', label: 'Low Speed', description: 'Pokémon with Speed ≤ 50', svgIcon: '' },
];

const SIZE_CONSTRAINTS = [
  { id: 'small-pokemon', type: 'height-weight', value: 'small', label: 'Small', description: 'Pokémon under 1m tall and 20kg', svgIcon: '' },
  { id: 'large-pokemon', type: 'height-weight', value: 'large', label: 'Large', description: 'Pokémon over 2m tall or 100kg', svgIcon: '' },
  { id: 'light-pokemon', type: 'height-weight', value: 'light', label: 'Light', description: 'Pokémon under 10kg', svgIcon: '' },
  { id: 'heavy-pokemon', type: 'height-weight', value: 'heavy', label: 'Heavy', description: 'Pokémon over 200kg', svgIcon: '' },
];

const TYPE_COUNT_CONSTRAINTS = [
  { id: 'single-type', type: 'type-count', value: 'single', label: 'Single Type', description: 'Pokémon with only one type', svgIcon: '' },
  { id: 'dual-type', type: 'type-count', value: 'dual', label: 'Dual Type', description: 'Pokémon with two types', svgIcon: '' },
];

const MOVE_CONSTRAINTS = [
  { id: 'earthquake-users', type: 'move-category', value: 'earthquake', label: 'Earthquake', description: 'Can learn Earthquake', svgIcon: '' },
  { id: 'surf-users', type: 'move-category', value: 'surf', label: 'Surf', description: 'Can learn Surf', svgIcon: '' },
  { id: 'thunder-users', type: 'move-category', value: 'thunder', label: 'Thunder', description: 'Can learn Thunder', svgIcon: '' },
  { id: 'psychic-users', type: 'move-category', value: 'psychic', label: 'Psychic', description: 'Can learn Psychic', svgIcon: '' },
  { id: 'fire-blast-users', type: 'move-category', value: 'fire-blast', label: 'Fire Blast', description: 'Can learn Fire Blast', svgIcon: '' },
  { id: 'ice-beam-users', type: 'move-category', value: 'ice-beam', label: 'Ice Beam', description: 'Can learn Ice Beam', svgIcon: '' },
];

const TYPE_EFFECTIVENESS_CONSTRAINTS = [
  { id: 'weak-to-fire', type: 'type-effectiveness', value: 'weak-fire', label: 'Weak to Fire', description: 'Takes super effective damage from Fire moves', svgIcon: '' },
  { id: 'weak-to-water', type: 'type-effectiveness', value: 'weak-water', label: 'Weak to Water', description: 'Takes super effective damage from Water moves', svgIcon: '' },
  { id: 'weak-to-electric', type: 'type-effectiveness', value: 'weak-electric', label: 'Weak to Electric', description: 'Takes super effective damage from Electric moves', svgIcon: '' },
  { id: 'resists-fire', type: 'type-effectiveness', value: 'resist-fire', label: 'Resists Fire', description: 'Takes reduced damage from Fire moves', svgIcon: '' },
  { id: 'resists-water', type: 'type-effectiveness', value: 'resist-water', label: 'Resists Water', description: 'Takes reduced damage from Water moves', svgIcon: '' },
  { id: 'resists-grass', type: 'type-effectiveness', value: 'resist-grass', label: 'Resists Grass', description: 'Takes reduced damage from Grass moves', svgIcon: '' },
];

const ALL_CONSTRAINTS = [
  ...TYPE_CONSTRAINTS,
  ...GENERATION_CONSTRAINTS,
  ...EVOLUTION_STAGE_CONSTRAINTS,
  ...STAT_RANGE_CONSTRAINTS,
  ...SIZE_CONSTRAINTS,
  ...TYPE_COUNT_CONSTRAINTS,
  ...MOVE_CONSTRAINTS,
  ...TYPE_EFFECTIVENESS_CONSTRAINTS,
];

// Simple seeded random number generator
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  random() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
}

// Generate seeded random number between 0 and 1
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Shuffle array using Fisher-Yates algorithm with seeded randomness
function shuffleArray(array, seed) {
  const rng = new SeededRandom(seed);
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Check if a constraint combination is solvable
function isSolvableCombination(constraints, pokemonData) {
  if (!constraints || constraints.length !== 6) return false;

  // Count how many Pokemon satisfy each constraint
  const constraintCounts = constraints.map(constraint => {
    return pokemonData.filter(pokemon => checkConstraint(pokemon, constraint)).length;
  });

  // All constraints must have at least 3 Pokemon
  return constraintCounts.every(count => count >= 3);
}

// Simplified constraint checking (without full Pokemon data)
function checkConstraint(pokemon, constraint) {
  // This is a simplified version - in production you'd have full Pokemon data
  return true; // Assume all constraints are valid for now
}

// Generate a solvable constraint combination
function generateSolvableConstraints(seed, difficulty = 'medium') {
  const rng = new SeededRandom(seed);

  // Select constraint types based on difficulty
  const constraintPool = shuffleArray([...ALL_CONSTRAINTS], seed);

  // Try up to 50 times to find a solvable combination
  for (let attempt = 0; attempt < 50; attempt++) {
    const constraints = constraintPool.slice(0, 6);

    // For now, assume all combinations are solvable
    // In production, you'd validate against actual Pokemon data
    if (constraints.length === 6) {
      return constraints;
    }
  }

  // Fallback: use first 6 constraints
  return ALL_CONSTRAINTS.slice(0, 6);
}

// Generate grid configuration for a specific date
function generateGridForDate(date, difficulty = 'medium') {
  const dateSeed = date.getTime();
  const constraints = generateSolvableConstraints(dateSeed, difficulty);

  // Create row and column assignments
  const shuffledConstraints = shuffleArray(constraints, dateSeed + 1);
  const rows = shuffledConstraints.slice(0, 3);
  const cols = shuffledConstraints.slice(3, 6);

  return {
    date: date.toISOString().split('T')[0],
    size: 3,
    constraints: { rows, cols },
    seed: dateSeed.toString(),
    difficulty,
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      algorithm: 'seeded-random-v1'
    }
  };
}

// Main function to generate daily grids
async function generateDailyGrids(days = 1) {
  console.log(`🎯 Generating ${days} day${days > 1 ? 's' : ''} of PokéGrid configurations...`);

  const startDate = new Date();
  const grids = [];

  for (let i = 0; i < days; i++) {
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + i);

    console.log(`📅 Generating grid for ${targetDate.toISOString().split('T')[0]}...`);

    const gridConfig = generateGridForDate(targetDate);

    // Save to database
    const { data, error } = await supabase
      .from('pokegrid_daily_configs')
      .upsert({
        grid_date: gridConfig.date,
        row_constraints: gridConfig.constraints.rows,
        col_constraints: gridConfig.constraints.cols,
        difficulty_level: gridConfig.difficulty,
        generation_seed: gridConfig.seed
      }, {
        onConflict: 'grid_date'
      });

    if (error) {
      console.error(`❌ Error saving grid for ${gridConfig.date}:`, error);
    } else {
      console.log(`✅ Saved configuration for ${gridConfig.date}`);
      grids.push(gridConfig);
    }
  }

  console.log(`🎉 Successfully generated ${grids.length} grid configuration${grids.length > 1 ? 's' : ''}!`);
  return grids;
}

// CLI argument parsing
const args = process.argv.slice(2);
let days = 1;

if (args.length > 0) {
  const arg = args[0];
  if (!isNaN(arg)) {
    days = parseInt(arg);
  } else if (arg === '-1') {
    days = -1; // Yesterday
  } else {
    console.error('❌ Invalid argument. Usage: node generate-daily-grids.mjs [days]');
    console.error('     node generate-daily-grids.mjs        // Generate for today');
    console.error('     node generate-daily-grids.mjs 7      // Generate for next 7 days');
    console.error('     node generate-daily-grids.mjs -1     // Generate for yesterday');
    process.exit(1);
  }
}

// Adjust for negative days (backfill)
if (days < 0) {
  days = Math.abs(days);
  // This would need adjustment in the main function
}

generateDailyGrids(days)
  .then(() => {
    console.log('✅ Grid generation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error during grid generation:', error);
    process.exit(1);
  });
