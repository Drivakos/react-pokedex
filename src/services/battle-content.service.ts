import catalogData from '../data/battle-pokemon-catalog.json';
import type { RunPokemon, RunRoute, RunRoutePreviewMap } from '../types/battle-run';
import { RUN_ROUTES, enemyPartySize, levelForStage, targetBstForStage } from '../utils/battle-run-rules';

interface BattleCatalogPokemon {
  id: number;
  species: string;
  types: string[];
  ability: string;
  moves: string[];
  bst: number;
}

const allSpecies = catalogData as BattleCatalogPokemon[];
const speciesByName = new Map(allSpecies.map(pokemon => [pokemon.species, pokemon]));

export function createRunPokemon(speciesName: string, stage: number): RunPokemon {
  const pokemon = speciesByName.get(speciesName);
  if (!pokemon) throw new Error(`Unknown Pokémon: ${speciesName}`);

  return {
    ...pokemon,
    types: [...pokemon.types],
    moves: [...pokemon.moves],
    level: levelForStage(stage),
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
  let pool = allSpecies.filter(pokemon => (
    !excluded.has(pokemon.species) && Math.abs(pokemon.bst - target) <= tolerance
  ));

  if (pool.length < count) {
    pool = allSpecies.filter(pokemon => !excluded.has(pokemon.species));
  }

  const choices: RunPokemon[] = [];
  const available = [...pool];
  while (choices.length < count && available.length > 0) {
    const index = Math.floor(random() * available.length);
    const [pokemon] = available.splice(index, 1);
    excluded.add(pokemon.species);
    choices.push(createRunPokemon(pokemon.species, stage));
  }

  return choices;
}

export function createDraftChoices(
  stage: number,
  party: RunPokemon[],
  random: () => number = Math.random,
  starter = false,
  count = 3,
): RunPokemon[] {
  return sampleSpecies(stage, count, new Set(party.map(pokemon => pokemon.species)), random, starter);
}

export function createRerolledDraftChoices(
  stage: number,
  party: RunPokemon[],
  currentChoices: RunPokemon[],
  random: () => number = Math.random,
  count = 3,
): RunPokemon[] {
  return createDraftChoices(stage, [...party, ...currentChoices], random, false, count);
}

export function createEnemyParty(
  stage: number,
  playerParty: RunPokemon[],
  random: () => number = Math.random,
  route: RunRoute | null = null,
): RunPokemon[] {
  const party = sampleSpecies(
    stage,
    Math.min(3, enemyPartySize(stage) + (route?.partySizeBonus ?? 0)),
    new Set(playerParty.map(pokemon => pokemon.species)),
    random,
    false,
  );

  if (!route?.levelBonus) return party;
  return party.map(pokemon => ({
    ...pokemon,
    level: Math.min(100, pokemon.level + route.levelBonus),
  }));
}

export function createRoutePreviews(
  stage: number,
  playerParty: RunPokemon[],
  random: () => number = Math.random,
): RunRoutePreviewMap {
  return RUN_ROUTES.reduce<RunRoutePreviewMap>((previews, route) => {
    previews[route.id] = createEnemyParty(stage, playerParty, random, route);
    return previews;
  }, { trail: [], rival: [], apex: [] });
}
