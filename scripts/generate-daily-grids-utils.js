/**
 * Utility functions for the generate-daily-grids script
 * Extracted for testing purposes
 */

// Import constraint definitions (simplified for testing)
const TYPE_CONSTRAINTS = [
  { id: 'fire-type', type: 'type', value: 'fire', label: 'Fire', description: 'Fire-type Pokémon', svgIcon: '/icons/types/fire.svg' },
  { id: 'water-type', type: 'type', value: 'water', label: 'Water', description: 'Water-type Pokémon', svgIcon: '/icons/types/water.svg' },
  { id: 'grass-type', type: 'type', value: 'grass', label: 'Grass', description: 'Grass-type Pokémon', svgIcon: '/icons/types/grass.svg' },
  { id: 'electric-type', type: 'type', value: 'electric', label: 'Electric', description: 'Electric-type Pokémon', svgIcon: '/icons/types/electric.svg' },
  { id: 'psychic-type', type: 'type', value: 'psychic', label: 'Psychic', description: 'Psychic-type Pokémon', svgIcon: '/icons/types/psychic.svg' },
  { id: 'ice-type', type: 'type', value: 'ice', label: 'Ice', description: 'Ice-type Pokémon', svgIcon: '/icons/types/ice.svg' },
];

const GENERATION_CONSTRAINTS = [
  { id: 'gen-1', type: 'generation', value: 'generation-i', label: 'Generation I', description: 'Kanto region Pokémon', icon: 'I' },
  { id: 'gen-2', type: 'generation', value: 'generation-ii', label: 'Generation II', description: 'Johto region Pokémon', icon: 'II' },
  { id: 'gen-3', type: 'generation', value: 'generation-iii', label: 'Generation III', description: 'Hoenn region Pokémon', icon: 'III' },
];

const OTHER_CONSTRAINTS = [
  ...GENERATION_CONSTRAINTS,
  { id: 'starter', type: 'evolution-stage', value: 'starter', label: 'Starter', description: 'Starter Pokémon', icon: 'S' },
  { id: 'high-hp', type: 'stat-range', value: 'hp-high', label: 'High HP (≥ 100)', description: 'HP ≥ 100', icon: 'HP+' },
  { id: 'single-type', type: 'type-count', value: 'single', label: 'Single Type', description: 'Single-type Pokémon', icon: '1T' },
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
    hash = Math.abs(((hash * 9301) + 49297) % 233280);
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

// Basic constraint checking logic (simplified for validation)
export function checkBasicConstraints(pokemonTypes, constraint) {
  switch (constraint.type) {
    case 'type':
      return pokemonTypes.includes(constraint.value);
    case 'generation':
      // Assume we can check generation - simplified for now
      return true;
    case 'evolution-stage':
      // Simplified - mythical and legendary are more restrictive
      return constraint.value !== 'mythical' && constraint.value !== 'legendary';
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
export function isConstraintCombinationSolvable(rowConstraint, colConstraint) {
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
export function generateSolvableConstraintsForDate(date) {
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
    cols: [
      shuffledTypes[3] || shuffledTypes[0],
      shuffledTypes[4] || shuffledTypes[1],
      shuffledTypes[5] || shuffledTypes[2]
    ],
    seed: `fallback-${seed}`,
    difficulty: 'easy'
  };
}
