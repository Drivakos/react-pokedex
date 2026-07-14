import type { RunChallenge, RunGrade, RunPokemon, RunRewardSummary, RunRoute, RunUpgrade, RunUpgradeId } from '../types/battle-run';

export const PARTY_LIMIT = 6;
export const LEVELS_PER_STAGE = 2;
export const CHECKPOINT_INTERVAL = 5;

export const RUN_ROUTES: RunRoute[] = [
  {
    id: 'trail',
    title: 'Trail route',
    label: 'Measured risk',
    description: 'Face the stage at its normal strength.',
    levelBonus: 0,
    partySizeBonus: 0,
    scoreMultiplier: 1,
  },
  {
    id: 'rival',
    title: 'Rival route',
    label: 'High pressure',
    description: 'Opponents gain two levels. Earn 25% more score.',
    levelBonus: 2,
    partySizeBonus: 0,
    scoreMultiplier: 1.25,
  },
  {
    id: 'apex',
    title: 'Apex route',
    label: 'Maximum danger',
    description: 'Opponents gain four levels and may add one team member. Earn 60% more score.',
    levelBonus: 4,
    partySizeBonus: 1,
    scoreMultiplier: 1.6,
  },
];

export const RUN_UPGRADES: RunUpgrade[] = [
  {
    id: 'veteran-training',
    title: 'Veteran training',
    label: 'Team growth',
    description: 'Surviving Pokémon gain one additional level after every victory.',
  },
  {
    id: 'expanded-scouting',
    title: 'Expanded scouting',
    label: 'Recruitment',
    description: 'Every recruitment draft offers one additional Pokémon.',
  },
  {
    id: 'contract-ledger',
    title: 'Contract ledger',
    label: 'Objectives',
    description: 'Future stage contract bounties are increased by 30%.',
  },
  {
    id: 'route-dividend',
    title: 'Route dividend',
    label: 'Risk reward',
    description: 'Rival and Apex route bonuses are increased by 25%.',
  },
  {
    id: 'flawless-standard',
    title: 'Flawless standard',
    label: 'Precision',
    description: 'The score bonus for a victory without faints is doubled.',
  },
  {
    id: 'survivor-mark',
    title: 'Survivor mark',
    label: 'Endurance',
    description: 'Score earned from each surviving Pokémon is increased by 50%.',
  },
];

export function hasRunUpgrade(upgrades: RunUpgrade[], id: RunUpgradeId): boolean {
  return upgrades.some(upgrade => upgrade.id === id);
}

export function createRunUpgradeChoices(
  owned: RunUpgrade[],
  random: () => number = Math.random,
  count = 3,
): RunUpgrade[] {
  const available = RUN_UPGRADES.filter(upgrade => !hasRunUpgrade(owned, upgrade.id));
  const choices: RunUpgrade[] = [];
  while (choices.length < count && available.length > 0) {
    const index = Math.floor(random() * available.length);
    const [upgrade] = available.splice(index, 1);
    choices.push(upgrade);
  }
  return choices;
}

export function applyRunUpgradesToChallenge(challenge: RunChallenge, upgrades: RunUpgrade[]): RunChallenge {
  if (!hasRunUpgrade(upgrades, 'contract-ledger')) return challenge;
  return { ...challenge, bounty: Math.round(challenge.bounty * 1.3) };
}

export function recruitmentChoiceCount(upgrades: RunUpgrade[]): number {
  return hasRunUpgrade(upgrades, 'expanded-scouting') ? 4 : 3;
}

export function getRunGrade(score: number, wins: number): RunGrade {
  const averageScore = wins > 0 ? score / wins : 0;
  if (averageScore >= 5000) {
    return { rank: 'S', title: 'Master', description: 'Exceptional risk control and objective execution.' };
  }
  if (averageScore >= 3800) {
    return { rank: 'A', title: 'Elite', description: 'A high-scoring run built on difficult routes.' };
  }
  if (averageScore >= 2800) {
    return { rank: 'B', title: 'Contender', description: 'Strong decisions with room for larger bounties.' };
  }
  if (averageScore >= 1800) {
    return { rank: 'C', title: 'Challenger', description: 'A solid run with several rewards secured.' };
  }
  return { rank: 'D', title: 'Rookie', description: 'Build the team, clear contracts, and raise the stakes.' };
}

export function isCheckpointStage(stage: number): boolean {
  return Math.max(1, stage) % CHECKPOINT_INTERVAL === 0;
}

export function levelForStage(stage: number): number {
  return Math.min(100, 5 + (Math.max(1, stage) - 1) * LEVELS_PER_STAGE);
}
export function enemyPartySize(stage: number): number {
  const normalizedStage = Math.max(1, stage);
  const baseSize = 1 + Math.floor((normalizedStage - 1) / 4);
  return Math.min(3, baseSize + (isCheckpointStage(normalizedStage) ? 1 : 0));
}

export function targetBstForStage(stage: number): number {
  const normalizedStage = Math.max(1, stage);
  const checkpointBoost = isCheckpointStage(normalizedStage) ? 35 : 0;
  return Math.min(600, 330 + (normalizedStage - 1) * 24 + checkpointBoost);
}

export function levelUpSurvivors(party: RunPokemon[], levels = LEVELS_PER_STAGE): RunPokemon[] {
  return party.map(pokemon => ({
    ...pokemon,
    level: Math.min(100, pokemon.level + levels),
  }));
}

export function createStageChallenge(
  stage: number,
  partySize: number,
  random: () => number = Math.random,
): RunChallenge {
  const normalizedStage = Math.max(1, stage);
  const normalizedPartySize = Math.max(1, partySize);

  if (isCheckpointStage(normalizedStage)) {
    const maxTurns = 10 + enemyPartySize(normalizedStage);
    return {
      kind: 'checkpoint',
      title: 'Checkpoint mastery',
      description: `Win within ${maxTurns} turns with no more than one fainted Pokémon.`,
      bounty: 1500 + normalizedStage * 100,
      maxTurns,
      maxFaints: 1,
    };
  }

  const tempoTurns = 7 + enemyPartySize(normalizedStage) * 2;
  const challenges: RunChallenge[] = [
    {
      kind: 'tempo',
      title: 'Rapid clear',
      description: `Defeat the trainer within ${tempoTurns} turns.`,
      bounty: 500 + normalizedStage * 75,
      maxTurns: tempoTurns,
    },
    {
      kind: 'flawless',
      title: 'Perfect formation',
      description: 'Win without losing a Pokémon.',
      bounty: 650 + normalizedStage * 75,
      maxFaints: 0,
    },
  ];

  if (normalizedPartySize > 1) {
    const minSurvivors = Math.max(1, Math.ceil(normalizedPartySize * 0.75));
    challenges.push({
      kind: 'formation',
      title: 'Hold the line',
      description: `Finish with at least ${minSurvivors} Pokémon still standing.`,
      bounty: 450 + normalizedStage * 60,
      minSurvivors,
    });
  }

  return challenges[Math.floor(random() * challenges.length)] ?? challenges[0];
}

export function isStageChallengeComplete(
  challenge: RunChallenge,
  turns: number,
  survivors: number,
  faintedCount: number,
): boolean {
  if (challenge.maxTurns !== undefined && turns > challenge.maxTurns) return false;
  if (challenge.maxFaints !== undefined && faintedCount > challenge.maxFaints) return false;
  if (challenge.minSurvivors !== undefined && survivors < challenge.minSurvivors) return false;
  return true;
}

export function calculateBattleReward(
  stage: number,
  turns: number,
  partySize: number,
  faintedCount: number,
  challenge: RunChallenge | null = null,
  route: RunRoute | null = null,
  upgrades: RunUpgrade[] = [],
): RunRewardSummary {
  const normalizedStage = Math.max(1, stage);
  const normalizedTurns = Math.max(1, turns);
  const survivors = Math.max(0, partySize - faintedCount);
  const stageScore = normalizedStage * 400;
  const survivalBonusBase = survivors * 150;
  const survivalBonus = hasRunUpgrade(upgrades, 'survivor-mark')
    ? Math.round(survivalBonusBase * 1.5)
    : survivalBonusBase;
  const tempoBonus = Math.max(0, 12 - normalizedTurns) * 50;
  const flawlessBonus = faintedCount === 0
    ? (hasRunUpgrade(upgrades, 'flawless-standard') ? 800 : 400)
    : 0;
  const checkpointBonus = isCheckpointStage(normalizedStage) ? 1000 : 0;
  const challengeCompleted = challenge
    ? isStageChallengeComplete(challenge, normalizedTurns, survivors, faintedCount)
    : false;
  const challengeBonus = challengeCompleted && challenge ? challenge.bounty : 0;
  const scoreBeforeRoute = stageScore + survivalBonus + tempoBonus + flawlessBonus + checkpointBonus + challengeBonus;
  const routeBonusBase = route ? Math.round(scoreBeforeRoute * (route.scoreMultiplier - 1)) : 0;
  const routeBonus = hasRunUpgrade(upgrades, 'route-dividend')
    ? Math.round(routeBonusBase * 1.25)
    : routeBonusBase;
  const levelsGained = LEVELS_PER_STAGE
    + (isCheckpointStage(normalizedStage) ? 1 : 0)
    + (hasRunUpgrade(upgrades, 'veteran-training') ? 1 : 0);

  return {
    stage: normalizedStage,
    turns: normalizedTurns,
    survivors,
    stageScore,
    survivalBonus,
    tempoBonus,
    flawlessBonus,
    checkpointBonus,
    challenge,
    challengeCompleted,
    challengeBonus,
    route,
    routeBonus,
    totalScore: scoreBeforeRoute + routeBonus,
    levelsGained,
  };
}

export function addOrReplacePartyMember(
  party: RunPokemon[],
  recruit: RunPokemon,
  replaceIndex?: number,
): RunPokemon[] {
  if (party.length < PARTY_LIMIT) return [...party, recruit];
  if (replaceIndex === undefined || replaceIndex < 0 || replaceIndex >= party.length) {
    return party;
  }

  return party.map((pokemon, index) => index === replaceIndex ? recruit : pokemon);
}

export function createSeededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
