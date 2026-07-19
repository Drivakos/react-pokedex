import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Dex } from '@pkmn/sim';

const dex = Dex.forGen(9);
const output = fileURLToPath(new URL('../src/data/battle-pokemon-catalog.json', import.meta.url));
const progressionOutput = fileURLToPath(new URL('../src/data/battle-pokemon-progression.json', import.meta.url));

const species = dex.species.all().filter(entry => (
  entry.exists &&
  entry.num > 0 &&
  entry.num <= 1025 &&
  !entry.isNonstandard &&
  !entry.battleOnly &&
  !entry.forme
));

// Curated utility move pools (Showdown move ids), ordered by competitive preference.
// Reliable recovery is what defines a true wall; Rest is a fallback that should not.
const RELIABLE_RECOVERY = ['recover', 'roost', 'slackoff', 'softboiled', 'milkdrink', 'synthesis', 'moonlight', 'morningsun', 'shoreup', 'strengthsap', 'junglehealing', 'lifedew'];
const RECOVERY = [...RELIABLE_RECOVERY, 'rest'];
const HAZARDS = ['stealthrock', 'spikes', 'toxicspikes', 'stickyweb'];
const STATUS_UTILITY = ['willowisp', 'thunderwave', 'toxic', 'spore', 'sleeppowder', 'nuzzle', 'glare', 'leechseed', 'taunt', 'defog', 'knockoff'];
const PIVOT = ['uturn', 'voltswitch', 'flipturn', 'partingshot', 'chillyreception', 'teleport'];
const SETUP_PHYSICAL = ['swordsdance', 'dragondance', 'shiftgear', 'victorydance', 'bulkup', 'coil', 'tidyup', 'clangoroussoul', 'bellydrum', 'filletaway', 'noretreat'];
const SETUP_SPECIAL = ['nastyplot', 'tailglow', 'quiverdance', 'calmmind', 'geomancy', 'clangoroussoul', 'filletaway', 'noretreat'];
const SETUP_EITHER = ['shellsmash', 'growth', 'workup', 'rockpolish', 'agility', 'autotomize'];
// Damaging moves that behave badly for a turn-by-turn AI: delayed, self-KO, heavy
// self-damage, or non-competitive lock moves that are strictly outclassed by STAB.
const BANNED_MOVES = new Set([
  'futuresight', 'doomdesire', 'explosion', 'selfdestruct', 'mistyexplosion',
  'finalgambit', 'memento', 'lastresort', 'steelbeam', 'mindblown', 'chloroblast',
  'thrash', 'petaldance', 'ragingfury', 'bide', 'dreameater',
]);

function buildMovePool(entry) {
  return [...dex.species.getMovePool(entry.id)]
    .map(moveId => dex.moves.get(moveId))
    .filter(move => move.exists);
}

function scoreAttack(move, entry) {
  const { atk, spa } = entry.baseStats;
  const accuracy = move.accuracy === true ? 1 : move.accuracy / 100;
  const stab = entry.types.includes(move.type) ? 1.5 : 1;
  let power = move.basePower;
  if (move.multihit) {
    const hits = Array.isArray(move.multihit) ? 3 : move.multihit;
    power *= hits;
  }
  // Weight by the relevant attacking stat so special mons favour special moves
  // (and mixed attackers value both), keeping sets type- and category-coherent.
  const attackStat = move.category === 'Physical' ? atk : spa;
  let score = power * accuracy * stab * (attackStat / 100);
  if (move.recoil) score *= 0.82;
  if (move.self?.boosts) score *= 0.92; // Draco Meteor / Overheat style drops — strong but one-off.
  if (move.self?.volatileStatus === 'lockedmove') score *= 0.9;
  // Non-STAB Normal moves are terrible coverage (resisted by Rock/Steel, void vs Ghost),
  // so demote them unless they're priority (Extreme Speed). This kills Double-Edge filler.
  if (move.type === 'Normal' && stab === 1 && !(move.priority > 0)) score *= 0.5;
  if (move.priority > 0) score *= 1.05;
  if (move.id === 'knockoff') score *= 1.2;
  // Foul Play scales off the target's Attack, so it's a defensive pick — let a real
  // STAB (Crunch / Knock Off) win on offensive mons while it still fills a bare pool.
  if (move.id === 'foulplay') score *= 0.8;
  return score;
}

function rankedAttacks(pool, entry) {
  return pool
    .filter(move => (
      move.category !== 'Status' &&
      move.basePower >= 35 &&
      move.basePower <= 140 &&
      (move.accuracy === true || move.accuracy >= 70) &&
      !move.selfdestruct &&
      !move.flags.charge &&
      !move.flags.recharge &&
      !move.hasCrashDamage &&
      !BANNED_MOVES.has(move.id)
    ))
    .map(move => ({ move, score: scoreAttack(move, entry) }))
    .sort((a, b) => b.score - a.score);
}

// Fill `selected` with attacks, preferring type diversity for coverage.
// Only damaging moves count toward coverage so a same-type setup/utility move
// (e.g. Roost, Nasty Plot) never blocks the matching STAB attack.
function addAttacks(selected, attacks, target) {
  const usedTypes = new Set(
    selected.filter(move => move.category !== 'Status').map(move => move.type),
  );
  for (const { move } of attacks) {
    if (selected.length >= target) break;
    if (selected.includes(move)) continue;
    if (!usedTypes.has(move.type)) {
      selected.push(move);
      usedTypes.add(move.type);
    }
  }
  for (const { move } of attacks) {
    if (selected.length >= target) break;
    if (!selected.includes(move)) selected.push(move);
  }
}

function pickMoves(entry) {
  const pool = buildMovePool(entry);
  const has = id => pool.some(move => move.id === id);
  const find = id => pool.find(move => move.id === id);
  const firstAvailable = ids => ids.map(find).find(Boolean) ?? null;

  const attacks = rankedAttacks(pool, entry);
  const { hp, atk, def, spa, spd, spe } = entry.baseStats;
  const offense = Math.max(atk, spa);
  const bulk = hp + def + spd;
  const physical = atk >= spa;

  const reliableRecovery = firstAvailable(RELIABLE_RECOVERY);
  const hazard = firstAvailable(HAZARDS);
  const status = firstAvailable(STATUS_UTILITY);
  const pivot = firstAvailable(PIVOT);
  const setup = firstAvailable(physical
    ? [...SETUP_PHYSICAL, ...SETUP_EITHER]
    : [...SETUP_SPECIAL, ...SETUP_EITHER]);

  const selected = [];

  if (bulk >= 270 && reliableRecovery && offense <= 110) {
    // Tank / wall: two non-recoil threats so battles still progress, heal + utility.
    const safeAttacks = attacks.filter(({ move }) => !move.recoil);
    addAttacks(selected, safeAttacks.length >= 2 ? safeAttacks : attacks, 2);
    selected.push(reliableRecovery);
    const utility = status ?? hazard ?? pivot ?? setup;
    if (utility) selected.push(utility);
  } else if (pivot && (hazard || status) && offense <= 125) {
    // Utility / pivot: pressure + momentum + a support move.
    addAttacks(selected, attacks, 2);
    selected.push(pivot);
    selected.push(hazard ?? status);
  } else if (setup && (offense >= 100 || spe >= 95)) {
    // Setup sweeper: boosting move backed by three attacks.
    selected.push(setup);
    addAttacks(selected, attacks, 4);
  } else {
    // Wallbreaker / all-out attacker.
    addAttacks(selected, attacks, 4);
  }

  // Guarantee four legal, unique moves.
  addAttacks(selected, attacks, 4);
  const names = [...new Set(selected.filter(Boolean).map(move => move.name))].slice(0, 4);
  return names.length > 0 ? names : ['Tackle'];
}

function toCatalogPokemon(entry) {
  return {
    id: entry.num,
    species: entry.name,
    types: [...entry.types],
    ability: entry.abilities[0],
    moves: pickMoves(entry),
    bst: Object.values(entry.baseStats).reduce((total, stat) => total + stat, 0),
  };
}

const catalog = species.map(toCatalogPokemon);
const catalogSpecies = new Set(catalog.map(entry => entry.species));
const progression = Object.fromEntries(species.flatMap(entry => {
  const evolutions = entry.evos.filter(evolution => catalogSpecies.has(evolution));
  const megas = (entry.otherFormes ?? [])
    .map(form => dex.species.get(form))
    .filter(form => form.exists && form.forme.startsWith('Mega'))
    .map(form => ({ ...toCatalogPokemon(form), isMega: true }));

  return evolutions.length > 0 || megas.length > 0
    ? [[entry.name, { evolutions, megas }]]
    : [];
}));

async function main() {
  await mkdir(fileURLToPath(new URL('../src/data', import.meta.url)), { recursive: true });
  await writeFile(output, `${JSON.stringify(catalog)}\n`);
  await writeFile(progressionOutput, `${JSON.stringify(progression)}\n`);
  console.log(`Generated ${catalog.length} Battle Run Pokémon at ${output}`);
  console.log(`Generated ${Object.keys(progression).length} progression entries at ${progressionOutput}`);
}

void main();
