// Simple test script to check constraint generation
const TYPE_CONSTRAINTS = [
  { id: 'fire-type', type: 'type', value: 'fire', label: 'Fire', description: 'Fire-type Pokémon' },
  { id: 'water-type', type: 'type', value: 'water', label: 'Water', description: 'Water-type Pokémon' },
  { id: 'grass-type', type: 'type', value: 'grass', label: 'Grass', description: 'Grass-type Pokémon' },
  { id: 'electric-type', type: 'type', value: 'electric', label: 'Electric', description: 'Electric-type Pokémon' },
  { id: 'psychic-type', type: 'type', value: 'psychic', label: 'Psychic', description: 'Psychic-type Pokémon' },
  { id: 'ice-type', type: 'type', value: 'ice', label: 'Ice', description: 'Ice-type Pokémon' },
  { id: 'dragon-type', type: 'type', value: 'dragon', label: 'Dragon', description: 'Dragon-type Pokémon' },
  { id: 'flying-type', type: 'type', value: 'flying', label: 'Flying', description: 'Flying-type Pokémon' },
  { id: 'normal-type', type: 'type', value: 'normal', label: 'Normal', description: 'Normal-type Pokémon' },
  { id: 'fighting-type', type: 'type', value: 'fighting', label: 'Fighting', description: 'Fighting-type Pokémon' },
  { id: 'poison-type', type: 'type', value: 'poison', label: 'Poison', description: 'Poison-type Pokémon' },
  { id: 'ground-type', type: 'type', value: 'ground', label: 'Ground', description: 'Ground-type Pokémon' },
  { id: 'rock-type', type: 'type', value: 'rock', label: 'Rock', description: 'Rock-type Pokémon' },
  { id: 'bug-type', type: 'type', value: 'bug', label: 'Bug', description: 'Bug-type Pokémon' },
  { id: 'ghost-type', type: 'type', value: 'ghost', label: 'Ghost', description: 'Ghost-type Pokémon' },
  { id: 'steel-type', type: 'type', value: 'steel', label: 'Steel', description: 'Steel-type Pokémon' },
  { id: 'dark-type', type: 'type', value: 'dark', label: 'Dark', description: 'Dark-type Pokémon' },
  { id: 'fairy-type', type: 'type', value: 'fairy', label: 'Fairy', description: 'Fairy-type Pokémon' },
];

const GENERATION_CONSTRAINTS = [
  { id: 'gen-1', type: 'generation', value: 'generation-i', label: 'Generation I' },
  { id: 'gen-2', type: 'generation', value: 'generation-ii', label: 'Generation II' },
  { id: 'gen-3', type: 'generation', value: 'generation-iii', label: 'Generation III' },
  { id: 'gen-4', type: 'generation', value: 'generation-iv', label: 'Generation IV' },
  { id: 'gen-5', type: 'generation', value: 'generation-v', label: 'Generation V' },
  { id: 'gen-6', type: 'generation', value: 'generation-vi', label: 'Generation VI' },
  { id: 'gen-7', type: 'generation', value: 'generation-vii', label: 'Generation VII' },
  { id: 'gen-8', type: 'generation', value: 'generation-viii', label: 'Generation VIII' },
];

const OTHER_CONSTRAINTS = [
  { id: 'high-hp', type: 'stat-range', value: 'hp-high', label: 'High HP (≥ 100)' },
  { id: 'high-attack', type: 'stat-range', value: 'attack-high', label: 'High Attack (≥ 120)' },
  { id: 'high-speed', type: 'stat-range', value: 'speed-high', label: 'High Speed (≥ 100)' },
  { id: 'final-evo', type: 'evolution-stage', value: 'final', label: 'Final Evolution' },
  { id: 'dual-type', type: 'type-count', value: 'dual', label: 'Dual Type' },
  { id: 'single-type', type: 'type-count', value: 'single', label: 'Single Type' },
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

// Test for today
const today = new Date();
const constraints = generateConstraintsForDate(today);

console.log('Generated constraints for today:');
console.log('Rows:', constraints.rows.map(c => c.label));
console.log('Cols:', constraints.cols.map(c => c.label));
console.log('Seed:', constraints.seed);
