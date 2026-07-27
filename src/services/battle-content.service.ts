import catalogData from '../data/battle-pokemon-catalog.json';
import progressionData from '../data/battle-pokemon-progression.json';
import type {
  PartyDevelopmentChoice,
  PartyDevelopmentOption,
  PokemonStatSpread,
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
  item?: string;
  builds?: BattlePokemonBuild[];
  bst: number;
  isMega?: boolean;
}

interface BattlePokemonBuild {
  name: string;
  ability: string;
  moves: string[];
  item: string;
  nature: string;
  evs: PokemonStatSpread;
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

function materializePokemon(
  pokemon: BattleCatalogPokemon,
  level: number,
  baseSpecies?: string,
  random?: () => number,
): RunPokemon {
  const build = pokemon.builds?.length
    ? pokemon.builds[Math.floor((random?.() ?? 0) * pokemon.builds.length)] ?? pokemon.builds[0]
    : null;
  return {
    id: pokemon.id,
    species: pokemon.species,
    ability: build?.ability ?? pokemon.ability,
    types: [...pokemon.types],
    moves: [...(build?.moves ?? pokemon.moves)],
    bst: pokemon.bst,
    ...((build?.item ?? pokemon.item) ? { item: build?.item ?? pokemon.item } : {}),
    ...(build ? { buildName: build.name } : {}),
    ...(build?.nature ? { nature: build.nature } : {}),
    ...(build?.evs ? { evs: { ...build.evs } } : {}),
    level,
    ...(pokemon.isMega ? { isMega: true, baseSpecies } : {}),
  };
}

export function createRunPokemon(
  speciesName: string,
  stage: number,
  random?: () => number,
): RunPokemon {
  const pokemon = speciesByName.get(speciesName);
  if (!pokemon) throw new Error(`Unknown Pokémon: ${speciesName}`);
  return materializePokemon(pokemon, levelForStage(stage), undefined, random);
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
  targetAdjustment = 0,
  megaAllowed = true,
): RunPokemon[] {
  const target = starter ? 350 : targetBstForStage(stage) + targetAdjustment;
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
    const megaCandidates = megaAllowed
      ? available.filter(candidate => progressionBySpecies[candidate.species]?.megas.length > 0)
      : [];
    const megaRoll = !starter && megaCandidates.length > 0 && random() < 0.01;
    const selectionPool = megaRoll ? megaCandidates : available;
    const index = Math.floor(random() * selectionPool.length);
    const pokemon = selectionPool[index] ?? selectionPool[0];
    available.splice(available.indexOf(pokemon), 1);
    excluded.add(pokemon.species);
    const progression = progressionBySpecies[pokemon.species];
    if (megaRoll) {
      const mega = progression.megas[Math.floor(random() * progression.megas.length)] ?? progression.megas[0];
      choices.push(materializePokemon(mega, levelForStage(stage), pokemon.species, random));
      megaAllowed = false;
    } else {
      choices.push(createRunPokemon(pokemon.species, stage, random));
    }
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
  return sampleSpecies(
    stage,
    count,
    getExcludedSpecies(party),
    random,
    starter,
    0,
    !party.some(pokemon => pokemon.isMega),
  );
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
  const bossModifier = getBossModifier(stage);
  const routeScaling = bossModifier ? null : route;
  const hardRamp = routeScaling?.difficulty === 'hard'
    ? Math.min(1, Math.max(0, stage - 1) / 3)
    : 1;
  const bstAdjustment = routeScaling?.difficulty === 'hard'
    ? Math.round(20 + (routeScaling.bstBonus - 20) * hardRamp)
    : routeScaling?.bstBonus ?? 0;
  const levelAdjustment = routeScaling?.difficulty === 'hard'
    ? Math.round(routeScaling.levelBonus * hardRamp)
    : routeScaling?.levelBonus ?? 0;
  const requestedPartySize = enemyPartySize(stage) + (routeScaling?.partySizeBonus ?? 0);
  const partySize = routeScaling
    ? Math.min(3, requestedPartySize, Math.max(1, playerParty.length))
    : Math.min(3, requestedPartySize);
  const party = sampleSpecies(
    stage,
    partySize,
    getExcludedSpecies(playerParty),
    random,
    false,
    bstAdjustment,
    true,
  );

  return party.map(pokemon => ({
    ...pokemon,
    level: Math.max(1, Math.min(100, pokemon.level + (bossModifier?.levelBonus ?? levelAdjustment))),
    ...(bossModifier ? { item: bossModifier.item } : {}),
  }));
}

export function createRoutePreviews(
  stage: number,
  playerParty: RunPokemon[],
  random: () => number = Math.random,
): RunRoutePreviewMap {
  if (getBossModifier(stage)) {
    const bossParty = createEnemyParty(stage, playerParty, random, RUN_ROUTES[2]);
    return {
      trail: bossParty.map(pokemon => ({ ...pokemon })),
      rival: bossParty.map(pokemon => ({ ...pokemon })),
      apex: bossParty.map(pokemon => ({ ...pokemon })),
    };
  }
  return RUN_ROUTES.reduce<RunRoutePreviewMap>((previews, route) => {
    previews[route.id] = createEnemyParty(stage, playerParty, random, route);
    return previews;
  }, { trail: [], rival: [], apex: [] });
}
