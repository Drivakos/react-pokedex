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
const HAZARDS = ['stealthrock', 'spikes', 'toxicspikes', 'stickyweb'];
const STATUS_UTILITY = ['willowisp', 'thunderwave', 'toxic', 'spore', 'sleeppowder', 'nuzzle', 'glare', 'leechseed', 'taunt', 'defog', 'knockoff'];
const PIVOT = ['uturn', 'voltswitch', 'flipturn', 'partingshot', 'chillyreception', 'teleport'];
const SCREENS = ['reflect', 'lightscreen', 'auroraveil'];
const WEATHER = ['raindance', 'sunnyday', 'sandstorm', 'snowscape'];
const TERRAIN = ['electricterrain', 'grassyterrain', 'psychicterrain', 'mistyterrain'];
const WALL_ATTACKS = [
  'bodypress', 'foulplay', 'saltcure', 'scald', 'chillingwater', 'snarl',
  'knockoff', 'uturn', 'voltswitch', 'flipturn', 'drainingkiss', 'gigadrain',
];
const SETUP_PHYSICAL = ['swordsdance', 'dragondance', 'shiftgear', 'victorydance', 'bulkup', 'coil', 'tidyup', 'clangoroussoul', 'bellydrum', 'filletaway', 'noretreat'];
const SETUP_SPECIAL = ['nastyplot', 'tailglow', 'quiverdance', 'calmmind', 'geomancy', 'clangoroussoul', 'filletaway', 'noretreat'];
const SETUP_EITHER = ['shellsmash', 'growth', 'workup', 'rockpolish', 'agility', 'autotomize'];
const SETUP_MOVES = [...SETUP_PHYSICAL, ...SETUP_SPECIAL, ...SETUP_EITHER];
const WEATHER_ITEMS = {
  raindance: 'Damp Rock',
  sunnyday: 'Heat Rock',
  sandstorm: 'Smooth Rock',
  snowscape: 'Icy Rock',
};
const WEATHER_ABILITY_ITEMS = {
  drizzle: 'Damp Rock',
  drought: 'Heat Rock',
  sandstream: 'Smooth Rock',
  snowwarning: 'Icy Rock',
};
const TERRAIN_ABILITY_IDS = new Set([
  'electricsurge', 'grassysurge', 'psychicsurge', 'mistysurge',
]);
const SPECIES_ITEMS = {
  pikachu: 'Light Ball',
  cubone: 'Thick Club',
  marowak: 'Thick Club',
  marowakalola: 'Thick Club',
  clamperl: 'Deep Sea Tooth',
  farfetchd: 'Leek',
  farfetchdgalar: 'Leek',
  sirfetchd: 'Leek',
  ditto: 'Choice Scarf',
};
const TYPE_ITEMS = {
  Bug: 'Silver Powder',
  Dark: 'Black Glasses',
  Dragon: 'Dragon Fang',
  Electric: 'Magnet',
  Fairy: 'Fairy Feather',
  Fighting: 'Black Belt',
  Fire: 'Charcoal',
  Flying: 'Sharp Beak',
  Ghost: 'Spell Tag',
  Grass: 'Miracle Seed',
  Ground: 'Soft Sand',
  Ice: 'Never-Melt Ice',
  Normal: 'Silk Scarf',
  Poison: 'Poison Barb',
  Psychic: 'Twisted Spoon',
  Rock: 'Hard Stone',
  Steel: 'Metal Coat',
  Water: 'Mystic Water',
};
const GENERALLY_STRONG_ABILITIES = {
  adaptability: 30,
  aerilate: 25,
  analytic: 18,
  beastboost: 18,
  contrary: 20,
  drizzle: 28,
  drought: 28,
  electricsurge: 24,
  filter: 16,
  fluffy: 16,
  furcoat: 30,
  goodasgold: 30,
  grassysurge: 24,
  mistysurge: 24,
  hugepower: 40,
  intimidate: 28,
  ironbarbs: 22,
  levitate: 22,
  lightningrod: 20,
  magicbounce: 28,
  magicguard: 32,
  moldbreaker: 18,
  multiscale: 24,
  naturalcure: 20,
  poisonheal: 35,
  prankster: 22,
  psychicsurge: 24,
  protean: 22,
  purepower: 40,
  regenerator: 32,
  roughskin: 22,
  sandstream: 24,
  shadowshield: 24,
  sheerforce: 25,
  shielddust: 12,
  snowwarning: 24,
  speedboost: 32,
  sturdy: 20,
  stormdrain: 20,
  unburden: 24,
  unaware: 30,
  waterabsorb: 20,
  waterbubble: 35,
};
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
      (move.basePower >= 35 || Boolean(move.multihit)) &&
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

function addWallAttacks(selected, pool, attacks, target) {
  for (const id of WALL_ATTACKS) {
    if (selected.length >= target) break;
    const move = pool.find(candidate => candidate.id === id);
    if (move && !selected.includes(move)) selected.push(move);
  }
  const reliableAttacks = attacks.filter(({ move }) => (
    !move.recoil &&
    move.basePower <= 100 &&
    (move.accuracy === true || move.accuracy >= 90)
  ));
  addAttacks(selected, reliableAttacks, target);
  addAttacks(selected, attacks.filter(({ move }) => !move.recoil), target);
}

function pickMoves(entry) {
  const pool = buildMovePool(entry);
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
  const screen = firstAvailable(SCREENS);
  const field = firstAvailable([...WEATHER, ...TERRAIN]);
  const setup = firstAvailable(physical
    ? [...SETUP_PHYSICAL, ...SETUP_EITHER]
    : [...SETUP_SPECIAL, ...SETUP_EITHER]);

  const selected = [];

  if (bulk >= 270 && reliableRecovery && offense <= 110) {
    // Tank / wall: prefer progress-making attacks (Scald, Body Press, Knock Off,
    // pivots) over four-attack-style nukes that have no defensive purpose.
    addWallAttacks(selected, pool, attacks, 2);
    selected.push(reliableRecovery);
    const utility = [status, hazard, screen, field, pivot, setup]
      .find(move => move && !selected.includes(move));
    if (utility) selected.push(utility);
  } else if (pivot && (hazard || status || screen || field) && offense <= 125) {
    // Utility / pivot: pressure + momentum + a support move.
    addAttacks(selected, attacks, 2);
    selected.push(pivot);
    selected.push(hazard ?? status ?? screen ?? field);
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

function movesFromRankedAttacks(attacks, offset = 0) {
  const selected = [];
  const rotated = [...attacks.slice(offset), ...attacks.slice(0, offset)];
  addAttacks(selected, rotated, 4);
  return [...new Set(selected.map(move => move.name))].slice(0, 4);
}

function toId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function stablePick(options, entry, salt) {
  if (options.length <= 1) return options[0];
  const hash = [...`${entry.id}:${salt}`]
    .reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
  return options[hash % options.length];
}

function chooseAbility(entry, moves) {
  const moveData = moves.map(move => dex.moves.get(move));
  const statusCount = moveData.filter(move => move.category === 'Status').length;
  const abilities = [...new Set(Object.values(entry.abilities).filter(Boolean))];

  const scoreAbility = ability => {
    const id = toId(ability);
    let score = GENERALLY_STRONG_ABILITIES[id] ?? 0;
    if (id === 'prankster') score += statusCount * 12;
    if (id === 'technician') {
      score += moveData.filter(move => move.category !== 'Status' && move.basePower <= 60).length * 12;
    }
    if (id === 'skilllink') score += moveData.filter(move => move.multihit).length * 24;
    if (id === 'ironfist') score += moveData.filter(move => move.flags.punch).length * 12;
    if (id === 'strongjaw') score += moveData.filter(move => move.flags.bite).length * 12;
    if (id === 'punkrock') score += moveData.filter(move => move.flags.sound).length * 14;
    if (id === 'sharpness') score += moveData.filter(move => move.flags.slicing).length * 14;
    if (id === 'rockhead' || id === 'reckless') score += moveData.filter(move => move.recoil).length * 12;
    if (id === 'serenegrace') {
      score += moveData.filter(move => move.secondaries?.some(effect => effect.chance >= 20)).length * 6;
    }
    if (id === 'contrary') {
      score += moveData.filter(move => (
        move.self?.boosts && Object.values(move.self.boosts).some(boost => boost < 0)
      )).length * 18;
    }
    if (id === 'guts' || id === 'quickfeet' || id === 'marvelscale') {
      score += moveData.some(move => move.id === 'facade') ? 25 : 5;
    }
    if (id === 'triage') {
      score += moveData.filter(move => move.flags.heal || move.drain).length * 14;
    }
    return score;
  };

  return abilities
    .map((ability, index) => ({ ability, index, score: scoreAbility(ability) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.ability ?? entry.abilities[0];
}

function dominantAttackCategory(moveData, entry) {
  const physical = moveData.filter(move => move.category === 'Physical').length;
  const special = moveData.filter(move => move.category === 'Special').length;
  if (physical === special) return entry.baseStats.atk >= entry.baseStats.spa ? 'Physical' : 'Special';
  return physical > special ? 'Physical' : 'Special';
}

function dominantAttackType(moveData, entry) {
  const counts = new Map();
  for (const move of moveData.filter(move => move.category !== 'Status')) {
    const stabWeight = entry.types.includes(move.type) ? 2 : 1;
    counts.set(move.type, (counts.get(move.type) ?? 0) + stabWeight);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? entry.types[0];
}

function itemForBuild(name, moves, entry, ability) {
  const moveData = moves.map(move => dex.moves.get(move));
  const statusMoves = moveData.filter(move => move.category === 'Status');
  const damaging = moveData.filter(move => move.category !== 'Status');
  const moveIds = new Set(moveData.map(move => move.id));
  const abilityId = toId(ability);
  const speciesId = toId(entry.name);
  const bulk = entry.baseStats.hp + entry.baseStats.def + entry.baseStats.spd;
  const isSetup = moveData.some(move => SETUP_MOVES.includes(move.id));
  const hasRecovery = moveData.some(move => RELIABLE_RECOVERY.includes(move.id));
  const hasPivot = moveData.some(move => PIVOT.includes(move.id));
  const hasHazards = moveData.some(move => HAZARDS.includes(move.id));
  const category = dominantAttackCategory(moveData, entry);

  // Form-defining and species-defining items are part of the build, rather than
  // interchangeable power boosts. This also makes Mega sets resemble real sets.
  if (entry.requiredItems?.length) return entry.requiredItems[0];
  if (SPECIES_ITEMS[speciesId]) return SPECIES_ITEMS[speciesId];

  if (abilityId === 'poisonheal') return 'Toxic Orb';
  if (abilityId === 'guts' || abilityId === 'quickfeet' || abilityId === 'marvelscale') {
    return abilityId === 'quickfeet' && !entry.types.includes('Poison') ? 'Toxic Orb' : 'Flame Orb';
  }
  if (abilityId === 'protosynthesis' || abilityId === 'quarkdrive') return 'Booster Energy';
  if (WEATHER_ABILITY_ITEMS[abilityId]) return WEATHER_ABILITY_ITEMS[abilityId];
  if (TERRAIN_ABILITY_IDS.has(abilityId)) {
    return 'Terrain Extender';
  }
  if (abilityId === 'unburden') return 'Sitrus Berry';

  const weatherMove = moveData.find(move => WEATHER.includes(move.id));
  if (weatherMove) return WEATHER_ITEMS[weatherMove.id];
  if (moveData.some(move => TERRAIN.includes(move.id))) return 'Terrain Extender';
  if (moveData.some(move => SCREENS.includes(move.id))) return 'Light Clay';
  if (moveIds.has('rest')) return 'Chesto Berry';

  if (entry.evos.length > 0 && (hasRecovery || name.includes('Wall') || name.includes('Utility'))) {
    return 'Eviolite';
  }

  if (moveIds.has('shellsmash')) return 'White Herb';
  if (moveIds.has('geomancy') || moveIds.has('meteorbeam')) return 'Power Herb';
  if (moveIds.has('bellydrum')) return 'Sitrus Berry';

  if (isSetup) {
    if (abilityId === 'magicguard' || abilityId === 'sheerforce') return 'Life Orb';
    if (entry.baseStats.hp + entry.baseStats.def < 125) return 'Focus Sash';
    if (bulk >= 290) return stablePick(['Weakness Policy', 'Leftovers'], entry, name);
    return stablePick(['Lum Berry', 'Life Orb', 'Sitrus Berry', 'Focus Sash'], entry, name);
  }

  if (hasRecovery) {
    const rockWeakness = dex.getEffectiveness('Rock', entry);
    if (rockWeakness >= 1) return 'Heavy-Duty Boots';
    if (entry.types.includes('Poison') && abilityId !== 'magicguard') return 'Black Sludge';
    if (entry.baseStats.def >= entry.baseStats.spd + 15) return 'Rocky Helmet';
    return 'Leftovers';
  }

  if (hasHazards && statusMoves.length > 0) {
    return entry.baseStats.hp + entry.baseStats.def < 155 ? 'Focus Sash' : 'Rocky Helmet';
  }
  if (hasPivot || statusMoves.length > 0) return 'Heavy-Duty Boots';

  const multihitCount = damaging.filter(move => move.multihit).length;
  if (multihitCount >= 2 && abilityId !== 'skilllink') return 'Loaded Dice';
  if (damaging.filter(move => move.flags.sound).length >= 2) return 'Throat Spray';
  if (damaging.filter(move => move.flags.punch).length >= 2) return 'Punching Glove';
  if (abilityId === 'magicguard' || abilityId === 'sheerforce') return 'Life Orb';

  if (name.includes('Choice wallbreaker')) {
    return category === 'Physical' ? 'Choice Band' : 'Choice Specs';
  }
  if (name.includes('Choice cleaner')) return 'Choice Scarf';
  if (bulk >= 285 && entry.baseStats.spe < 80) return 'Assault Vest';

  if (damaging.length === moves.length) {
    const typeItem = TYPE_ITEMS[dominantAttackType(moveData, entry)];
    return stablePick(
      entry.baseStats.spe >= 105
        ? ['Life Orb', 'Expert Belt', typeItem]
        : ['Life Orb', 'Expert Belt', typeItem, 'Assault Vest'],
      entry,
      name,
    );
  }
  return 'Leftovers';
}

function inferBuildName(moves, entry) {
  const moveData = moves.map(move => dex.moves.get(move));
  const hasRecovery = moveData.some(move => RELIABLE_RECOVERY.includes(move.id));
  const hasPivot = moveData.some(move => PIVOT.includes(move.id));
  const hasHazards = moveData.some(move => HAZARDS.includes(move.id));
  const hasSetup = moveData.some(move => SETUP_MOVES.includes(move.id));
  if (moveData.some(move => SCREENS.includes(move.id))) return 'Screens support';
  if (moveData.some(move => [...WEATHER, ...TERRAIN].includes(move.id))) return 'Field setter';
  if (hasRecovery && moveData.filter(move => move.category === 'Status').length >= 2) {
    return entry.baseStats.def >= entry.baseStats.spd ? 'Physical wall' : 'Special wall';
  }
  if (hasHazards && hasPivot) return 'Hazard pivot';
  if (hasHazards) return 'Hazard lead';
  if (hasPivot) return 'Offensive pivot';
  if (hasSetup) return 'Setup sweeper';
  if (moveData.every(move => move.category !== 'Status')) return 'All-out attacker';
  return 'Utility attacker';
}

function trainingForBuild(name, moves, entry) {
  const moveData = moves.map(move => dex.moves.get(move));
  const physicalCount = moveData.filter(move => move.category === 'Physical').length;
  const specialCount = moveData.filter(move => move.category === 'Special').length;
  const statusCount = moveData.filter(move => move.category === 'Status').length;
  const hasRecovery = moveData.some(move => RELIABLE_RECOVERY.includes(move.id));
  const role = name.toLowerCase();
  const bulky = role.endsWith(' wall') || role.includes('utility') || role.includes('support')
    || (hasRecovery && statusCount >= 2);
  const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

  if (bulky) {
    evs.hp = 252;
    if (role.includes('physical wall')) {
      evs.def = 252;
      evs.spd = 4;
      return { nature: 'Bold', evs };
    }
    if (role.includes('special wall')) {
      evs.spd = 252;
      evs.def = 4;
      return { nature: 'Calm', evs };
    }
    if (entry.baseStats.def <= entry.baseStats.spd) {
      evs.def = 252;
      evs.spd = 4;
      return { nature: 'Bold', evs };
    }
    evs.spd = 252;
    evs.def = 4;
    return { nature: 'Calm', evs };
  }

  if (physicalCount > 0 && specialCount > 0) {
    const physicalScore = physicalCount * entry.baseStats.atk;
    const specialScore = specialCount * entry.baseStats.spa;
    const primary = physicalScore >= specialScore ? 'atk' : 'spa';
    const secondary = primary === 'atk' ? 'spa' : 'atk';
    evs[primary] = 252;
    evs[secondary] = 4;
    evs.spe = 252;
    return { nature: 'Naive', evs };
  }

  const fast = entry.baseStats.spe >= 90 || role.includes('sweeper');
  const investSpeed = fast || entry.baseStats.spe >= 60;
  if (physicalCount >= specialCount) {
    evs.atk = 252;
    evs[investSpeed ? 'spe' : 'hp'] = 252;
    evs[investSpeed ? 'hp' : 'spd'] = 4;
    return { nature: fast ? 'Jolly' : 'Adamant', evs };
  }

  evs.spa = 252;
  evs[investSpeed ? 'spe' : 'hp'] = 252;
  evs[investSpeed ? 'hp' : 'spd'] = 4;
  return { nature: fast ? 'Timid' : 'Modest', evs };
}

function pickBuilds(entry) {
  const pool = buildMovePool(entry);
  const find = id => pool.find(move => move.id === id);
  const firstAvailable = ids => ids.map(find).find(Boolean) ?? null;
  const attacks = rankedAttacks(pool, entry);
  const physicalAttacks = attacks.filter(({ move }) => move.category === 'Physical');
  const specialAttacks = attacks.filter(({ move }) => move.category === 'Special');
  const physical = entry.baseStats.atk >= entry.baseStats.spa;
  const setup = firstAvailable(physical
    ? [...SETUP_PHYSICAL, ...SETUP_EITHER]
    : [...SETUP_SPECIAL, ...SETUP_EITHER]);
  const recovery = firstAvailable(RELIABLE_RECOVERY);
  const utilityIds = [
    ...STATUS_UTILITY,
    ...HAZARDS,
    ...PIVOT,
    ...SCREENS,
    ...WEATHER,
    ...TERRAIN,
  ];
  const abilityIds = new Set(Object.values(entry.abilities).map(toId));
  const redundantWeatherMoves = new Set([
    ...(abilityIds.has('drizzle') ? ['raindance'] : []),
    ...(abilityIds.has('drought') ? ['sunnyday'] : []),
    ...(abilityIds.has('sandstream') ? ['sandstorm'] : []),
    ...(abilityIds.has('snowwarning') ? ['snowscape'] : []),
  ]);
  const utilityPool = utilityIds
    .map(find)
    .filter(move => move && !redundantWeatherMoves.has(move.id));
  const utility = utilityPool[0] ?? null;
  const builds = [];

  const addBuild = (name, moves) => {
    if (moves.length === 0) return;
    const key = moves.join('|');
    if (builds.some(build => build.moves.join('|') === key)) return;
    const ability = chooseAbility(entry, moves);
    const item = itemForBuild(name, moves, entry, ability);
    const effectiveName = name.startsWith('Choice ') && !item.startsWith('Choice ')
      ? (name === 'Choice cleaner' ? 'Offensive cleaner' : 'Wallbreaker')
      : name;
    builds.push({
      name: effectiveName,
      ability,
      moves,
      item,
      ...trainingForBuild(effectiveName, moves, entry),
    });
  };

  const primaryMoves = pickMoves(entry);
  addBuild(inferBuildName(primaryMoves, entry), primaryMoves);

  const preferredAttacks = physical ? physicalAttacks : specialAttacks;
  const screens = SCREENS.map(find).filter(Boolean);
  const hasForcedItem = Boolean(entry.requiredItems?.length || SPECIES_ITEMS[toId(entry.name)]);
  const hasPrankster = Object.values(entry.abilities).includes('Prankster');
  const screenSuitable = hasPrankster || entry.baseStats.spe >= 90
    || entry.baseStats.hp + entry.baseStats.def + entry.baseStats.spd >= 285;
  if (screens.length >= 2 && screenSuitable && !hasForcedItem) {
    const selected = screens.slice(0, 2);
    const extraUtility = firstAvailable(['thunderwave', 'willowisp', 'taunt', ...PIVOT]);
    if (extraUtility) selected.push(extraUtility);
    addAttacks(selected, attacks, 4);
    addBuild('Screens support', selected.map(move => move.name).slice(0, 4));
  }

  const hasSkillLink = Object.values(entry.abilities).includes('Skill Link');
  const multihitAttacks = attacks.filter(({ move }) => move.multihit);
  if (hasSkillLink && multihitAttacks.length >= 2) {
    const selected = [];
    if (setup) selected.push(setup);
    addAttacks(selected, multihitAttacks, Math.min(4, selected.length + 3));
    addAttacks(selected, preferredAttacks.length ? preferredAttacks : attacks, 4);
    addBuild(setup ? 'Multi-hit sweeper' : 'Multi-hit attacker', selected.map(move => move.name).slice(0, 4));
  }

  if (setup) {
    const selected = [setup];
    addAttacks(selected, preferredAttacks.length >= 3 ? preferredAttacks : attacks, 4);
    addBuild('Setup sweeper', selected.map(move => move.name).slice(0, 4));
  }

  if (recovery && utility) {
    const selected = [];
    addWallAttacks(selected, pool, attacks, 2);
    selected.push(recovery);
    const support = utilityPool.find(move => !selected.includes(move));
    if (support) selected.push(support);
    addAttacks(selected, attacks, 4);
    const wallName = entry.baseStats.def >= entry.baseStats.spd ? 'Physical wall' : 'Special wall';
    addBuild(wallName, [...new Set(selected.map(move => move.name))].slice(0, 4));
  }

  const preferredMoves = movesFromRankedAttacks(preferredAttacks);
  if (preferredMoves.length >= 4) {
    const choiceRole = entry.baseStats.spe >= 60 && entry.baseStats.spe < 100
      ? 'Choice cleaner'
      : 'Choice wallbreaker';
    addBuild(choiceRole, preferredMoves);
  }

  const alternateMoves = movesFromRankedAttacks(attacks, Math.min(2, Math.max(0, attacks.length - 1)));
  if (alternateMoves.length >= 4) addBuild('Coverage attacker', alternateMoves);

  return builds.slice(0, 4);
}

function toCatalogPokemon(entry) {
  const builds = pickBuilds(entry);
  const primary = builds[0];
  return {
    id: entry.num,
    species: entry.name,
    types: [...entry.types],
    ability: primary.ability,
    moves: primary.moves,
    item: primary.item,
    builds,
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
