import catalogData from '../data/battle-pokemon-catalog.json';
import progressionData from '../data/battle-pokemon-progression.json';
import type {
  PartyDevelopmentChoice,
  PartyDevelopmentOption,
  RunPokemon,
  RunRoute,
  RunRoutePreviewMap,
} from '../types/battle-run';
import { RUN_ROUTES, enemyPartySize, getBossModifier, levelForStage, targetBstForStage } from '../utils/battle-run-rules';

interface BattleCatalogPokemon {
  id: number;
  species: string;
  types: string[];
  ability: string;
  moves: string[];
  bst: number;
  isMega?: boolean;
}

interface BattleProgressionEntry {
  evolutions: string[];
  megas: BattleCatalogPokemon[];
}

const allSpecies = catalogData as BattleCatalogPokemon[];
const speciesByName = new Map(allSpecies.map(pokemon => [pokemon.species, pokemon]));
const progressionBySpecies = progressionData as Record<string, BattleProgressionEntry>;

function getExcludedSpecies(party: RunPokemon[]): Set<string> {
  return new Set(party.flatMap(pokemon => (
    pokemon.baseSpecies ? [pokemon.species, pokemon.baseSpecies] : [pokemon.species]
  )));
}

function materializePokemon(pokemon: BattleCatalogPokemon, level: number, baseSpecies?: string): RunPokemon {
  return {
    ...pokemon,
    types: [...pokemon.types],
    moves: [...pokemon.moves],
    level,
    ...(pokemon.isMega ? { isMega: true, baseSpecies } : {}),
  };
}

export function createRunPokemon(speciesName: string, stage: number): RunPokemon {
  const pokemon = speciesByName.get(speciesName);
  if (!pokemon) throw new Error(`Unknown Pokémon: ${speciesName}`);
  return materializePokemon(pokemon, levelForStage(stage));
}

export function getPokemonDevelopmentOptions(pokemon: RunPokemon): PartyDevelopmentOption[] {
  if (pokemon.isMega) return [];
  const progression = progressionBySpecies[pokemon.species];
  if (!progression) return [];

  const evolutions = progression.evolutions.flatMap(species => {
    const evolution = speciesByName.get(species);
    return evolution
      ? [{ kind: 'evolution' as const, pokemon: materializePokemon(evolution, pokemon.level) }]
      : [];
  });
  const megas = progression.megas.map(mega => ({
    kind: 'mega' as const,
    pokemon: materializePokemon(mega, pokemon.level, pokemon.species),
  }));

  return [...evolutions, ...megas];
}

export function getPartyDevelopmentChoices(party: RunPokemon[]): PartyDevelopmentChoice[] {
  const alreadyHasMega = party.some(pokemon => pokemon.isMega);

  return party.flatMap((current, partyIndex) => {
    const options = getPokemonDevelopmentOptions(current)
      .filter(option => option.kind !== 'mega' || !alreadyHasMega);
    return options.length > 0 ? [{ partyIndex, current, options }] : [];
  });
}

export function developPartyPokemon(
  party: RunPokemon[],
  partyIndex: number,
  targetSpecies: string,
): RunPokemon[] | null {
  const current = party[partyIndex];
  if (!current) return null;
  const option = getPartyDevelopmentChoices(party)
    .find(choice => choice.partyIndex === partyIndex)
    ?.options.find(candidate => candidate.pokemon.species === targetSpecies);
  if (!option) return null;

  return party.map((pokemon, index) => index === partyIndex ? option.pokemon : pokemon);
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
  return sampleSpecies(stage, count, getExcludedSpecies(party), random, starter);
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
    getExcludedSpecies(playerParty),
    random,
    false,
  );

  const bossModifier = getBossModifier(stage);
  if (!route?.levelBonus && !bossModifier) return party;
  return party.map(pokemon => ({
    ...pokemon,
    level: Math.min(100, pokemon.level + (route?.levelBonus ?? 0)),
    ...(bossModifier ? { item: bossModifier.item } : {}),
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
