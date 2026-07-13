import { Dex } from '@pkmn/sim';
import type { RunPokemon } from '../types/battle-run';
import { enemyPartySize, levelForStage, targetBstForStage } from '../utils/battle-run-rules';

const dex = Dex.forGen(9);

const allSpecies = dex.species.all().filter(species => (
  species.exists &&
  species.num > 0 &&
  species.num <= 1025 &&
  !species.isNonstandard &&
  !species.battleOnly &&
  !species.forme
));

function bst(species: (typeof allSpecies)[number]): number {
  return Object.values(species.baseStats).reduce((total, stat) => total + stat, 0);
}

function pickMoves(species: (typeof allSpecies)[number]): string[] {
  const movePool = [...dex.species.getMovePool(species.id)]
    .map(moveId => dex.moves.get(moveId))
    .filter(move => (
      move.exists &&
      move.category !== 'Status' &&
      move.basePower >= 35 &&
      move.basePower <= 120 &&
      (move.accuracy === true || move.accuracy >= 75) &&
      !move.selfdestruct &&
      !move.flags.charge &&
      !move.hasCrashDamage
    ))
    .sort((a, b) => {
      const aStab = species.types.includes(a.type) ? 1 : 0;
      const bStab = species.types.includes(b.type) ? 1 : 0;
      return (bStab - aStab) || (b.basePower - a.basePower);
    });

  const selected: string[] = [];
  const selectedTypes = new Set<string>();

  for (const move of movePool) {
    if (selected.length >= 4) break;
    if (!selectedTypes.has(move.type) || selected.length < 2) {
      selected.push(move.name);
      selectedTypes.add(move.type);
    }
  }

  for (const move of movePool) {
    if (selected.length >= 4) break;
    if (!selected.includes(move.name)) selected.push(move.name);
  }

  return selected.length > 0 ? selected : ['Tackle'];
}

export function createRunPokemon(speciesName: string, stage: number): RunPokemon {
  const species = dex.species.get(speciesName);
  if (!species.exists) throw new Error(`Unknown Pokémon: ${speciesName}`);

  return {
    id: species.num,
    species: species.name,
    level: levelForStage(stage),
    types: [...species.types],
    ability: species.abilities[0],
    moves: pickMoves(species),
    bst: Object.values(species.baseStats).reduce((total, stat) => total + stat, 0),
  };
}

function sampleSpecies(
  stage: number,
  count: number,
  excluded: Set<string>,
  random: () => number,
  starter: boolean,
): RunPokemon[] {
  const target = starter ? 350 : targetBstForStage(stage);
  const tolerance = starter ? 70 : Math.min(120, 70 + stage * 3);
  let pool = allSpecies.filter(species => {
    const total = bst(species);
    return !excluded.has(species.name) && Math.abs(total - target) <= tolerance;
  });

  if (pool.length < count) {
    pool = allSpecies.filter(species => !excluded.has(species.name));
  }

  const choices: RunPokemon[] = [];
  const available = [...pool];
  while (choices.length < count && available.length > 0) {
    const index = Math.floor(random() * available.length);
    const [species] = available.splice(index, 1);
    excluded.add(species.name);
    choices.push(createRunPokemon(species.name, stage));
  }

  return choices;
}

export function createDraftChoices(
  stage: number,
  party: RunPokemon[],
  random: () => number = Math.random,
  starter = false,
): RunPokemon[] {
  return sampleSpecies(stage, 3, new Set(party.map(pokemon => pokemon.species)), random, starter);
}

export function createEnemyParty(
  stage: number,
  playerParty: RunPokemon[],
  random: () => number = Math.random,
): RunPokemon[] {
  return sampleSpecies(
    stage,
    enemyPartySize(stage),
    new Set(playerParty.map(pokemon => pokemon.species)),
    random,
    false,
  );
}
