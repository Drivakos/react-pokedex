import { Dex, type PRNGSeed } from '@pkmn/sim';
import type {
  BattleDecision,
  BattleResult,
  BattleSnapshot,
  RunMilestoneId,
  RunDifficulty,
  RunPokemon,
  RunRoute,
  RunStats,
  RunUpgrade,
} from '../types/battle-run';
import {
  PARTY_LIMIT,
  RUN_ROUTES,
  advanceRunStats,
  calculateBattleReward,
  calculateRunMilestoneReward,
  createEmptyRunStats,
  createRunUpgradeChoices,
  createSeededRandom,
  createStageChallenge,
  getRecruitmentRewardProfile,
  isCheckpointStage,
  levelUpSurvivors,
  rotatePartyToLead,
} from '../utils/battle-run-rules';
import {
  createDraftChoices,
  createEnemyParty,
  developPartyPokemon,
  getPartyDevelopmentChoices,
} from './battle-content.service';
import {
  type BattleSimulationSeeds,
  ShowdownBattleSession,
} from './showdown-battle.service';

export interface BattleBalanceScenario {
  stage: number;
  route: RunRoute;
  runs: number;
}

export interface BattleBalanceResult {
  stage: number;
  route: RunRoute['id'];
  difficulty: RunDifficulty | 'boss';
  runs: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  averageTurns: number;
  averageSurvivors: number;
}

export interface BattleBalanceOptions {
  stages?: number[];
  runsPerScenario?: number;
  seed?: string;
  playerPolicy?: FullRunPlayerPolicy;
  onProgress?: (completed: number, total: number) => void;
}

export type FullRunRoutePolicy = RunDifficulty | 'adaptive';
export type FullRunPlayerPolicy = 'casual' | 'competent' | 'advanced';

export interface FullRunStageResult {
  stage: number;
  reached: number;
  cleared: number;
  clearRate: number;
  averageTurns: number;
  averageSurvivors: number;
}

export interface FullRunCheckpointResult {
  stage: 5 | 10 | 15;
  reached: number;
  cleared: number;
  clearRate: number;
}

export interface FullRunBalanceResult {
  policy: FullRunRoutePolicy;
  playerPolicy: FullRunPlayerPolicy;
  runs: number;
  completions: number;
  completionRate: number;
  averageStagesCleared: number;
  averageScore: number;
  averageFinalPartySize: number;
  deathStages: Record<string, number>;
  checkpoints: FullRunCheckpointResult[];
  stages: FullRunStageResult[];
}

export interface FullRunBalanceOptions {
  runsPerPolicy?: number;
  policies?: FullRunRoutePolicy[];
  playerPolicies?: FullRunPlayerPolicy[];
  seed?: string;
  onProgress?: (completed: number, total: number) => void;
  battleRunner?: HeadlessBattleRunner;
}

interface HeadlessBattleOutcome {
  result: BattleResult;
  turns: number;
  survivors: number;
}

function createPrngSeed(seed: string): PRNGSeed {
  const random = createSeededRandom(seed);
  return Array.from({ length: 4 }, () => Math.floor(random() * 0x10000)).join(',') as PRNGSeed;
}

export function createBattleSimulationSeeds(
  playerParty: RunPokemon[],
  enemyParty: RunPokemon[],
  stage: number,
  difficulty: RunDifficulty,
): BattleSimulationSeeds {
  const battleKey = [
    stage,
    difficulty,
    ...playerParty.flatMap(pokemon => [
      pokemon.species,
      pokemon.level,
      pokemon.item ?? '',
      ...pokemon.moves,
    ]),
    'versus',
    ...enemyParty.flatMap(pokemon => [
      pokemon.species,
      pokemon.level,
      pokemon.item ?? '',
      ...pokemon.moves,
    ]),
  ].join(':');

  return {
    battle: createPrngSeed(`${battleKey}:battle`),
    opponentAi: createPrngSeed(`${battleKey}:opponent-ai`),
  };
}

export type HeadlessBattleRunner = (
  playerParty: RunPokemon[],
  enemyParty: RunPokemon[],
  stage: number,
  difficulty: RunDifficulty,
  playerPolicy?: FullRunPlayerPolicy,
) => Promise<HeadlessBattleOutcome>;

interface SimulatedRunResult {
  completed: boolean;
  stagesCleared: number;
  score: number;
  finalPartySize: number;
  deathStage: number | null;
  stages: Array<{
    stage: number;
    cleared: boolean;
    turns: number;
    survivors: number;
  }>;
}

function scoreImmediateDamage(
  move: BattleDecision['moves'][number],
  activeTypes: string[] = [],
): number {
  const accuracy = move.accuracy === true ? 1 : move.accuracy / 100;
  const effectiveness = move.effectiveness ?? 1;
  const priorityBonus = move.priority > 0 ? 1.05 : 1;
  const stab = activeTypes.includes(move.type) ? 1.5 : 1;
  return move.category === 'Status'
    ? 0
    : move.power * accuracy * effectiveness * priorityBonus * stab;
}

function chooseBaselineMove(decision: BattleDecision, activeTypes: string[] = []): number {
  const legalMoves = decision.moves.filter(move => !move.disabled);
  const scored = legalMoves.map(move => {
    return { slot: move.slot, score: scoreImmediateDamage(move, activeTypes) };
  });
  scored.sort((left, right) => right.score - left.score);
  return scored[0]?.slot ?? legalMoves[0]?.slot ?? 1;
}

function chooseBaselineSwitch(decision: BattleDecision): number {
  const available = decision.switches.filter(choice => !choice.active && !choice.fainted);
  return available[0]?.slot ?? decision.switches[0]?.slot ?? 1;
}

function scoreAdvancedMove(
  move: BattleDecision['moves'][number],
  snapshot: BattleSnapshot | null,
): number {
  const damage = scoreImmediateDamage(move, snapshot?.player?.types);
  if (move.category !== 'Status') return damage;

  const data = Dex.moves.get(move.name);
  const hpRatio = snapshot?.player?.maxhp
    ? snapshot.player.hp / snapshot.player.maxhp
    : 1;
  if ((data.heal || data.drain) && hpRatio <= 0.55) return 115;
  const hasReserves = (snapshot?.playerRemaining ?? 1) > 1 || (snapshot?.opponentRemaining ?? 1) > 1;
  if (data.status && !snapshot?.opponent?.status) return hasReserves ? 55 : 15;
  if (data.boosts || data.self?.boosts) {
    return hasReserves && (snapshot?.turn ?? 1) <= 1 ? 60 : 10;
  }
  if (data.sideCondition || data.weather || data.terrain) {
    return hasReserves && (snapshot?.turn ?? 1) <= 1 ? 55 : 10;
  }
  if (data.volatileStatus) return hasReserves ? 35 : 10;
  return 10;
}

function typeThreat(attackerTypes: string[], defenderTypes: string[]): number {
  return attackerTypes.reduce((maximum, type) => {
    if (!Dex.getImmunity(type, defenderTypes)) return maximum;
    return Math.max(maximum, 2 ** Dex.getEffectiveness(type, defenderTypes));
  }, 0);
}

function matchupScore(pokemon: RunPokemon, opponentTypes: string[]): number {
  const bestAttack = pokemon.moves.reduce((maximum, moveName) => {
    const move = Dex.moves.get(moveName);
    if (!move.exists || move.category === 'Status') return maximum;
    if (!Dex.getImmunity(move.type, opponentTypes)) return maximum;
    const effectiveness = 2 ** Dex.getEffectiveness(move.type, opponentTypes);
    const stab = pokemon.types.includes(move.type) ? 1.5 : 1;
    return Math.max(maximum, move.basePower * effectiveness * stab);
  }, 0);
  const threat = typeThreat(opponentTypes, pokemon.types);
  return bestAttack - threat * 45;
}

export interface SimulatedPlayerAction {
  kind: 'move' | 'switch';
  slot: number;
}

export function chooseSimulatedPlayerAction(
  policy: FullRunPlayerPolicy,
  decision: BattleDecision,
  snapshot: BattleSnapshot | null,
  playerParty: RunPokemon[],
  random: () => number,
  allowVoluntarySwitch = true,
): SimulatedPlayerAction {
  if (decision.kind === 'switch') {
    if (policy !== 'advanced') return { kind: 'switch', slot: chooseBaselineSwitch(decision) };
    const opponentTypes = snapshot?.opponent?.types ?? [];
    const available = decision.switches
      .filter(choice => !choice.active && !choice.fainted)
      .map(choice => ({
        choice,
        pokemon: playerParty.find(pokemon => pokemon.species === choice.species),
      }))
      .filter((entry): entry is typeof entry & { pokemon: RunPokemon } => Boolean(entry.pokemon))
      .sort((left, right) => (
        matchupScore(right.pokemon, opponentTypes) - matchupScore(left.pokemon, opponentTypes)
      ));
    return { kind: 'switch', slot: available[0]?.choice.slot ?? chooseBaselineSwitch(decision) };
  }

  const legalMoves = decision.moves.filter(move => !move.disabled);
  if (policy === 'casual') {
    const move = legalMoves[Math.floor(random() * legalMoves.length)] ?? legalMoves[0];
    return { kind: 'move', slot: move?.slot ?? 1 };
  }
  if (policy === 'competent') {
    return {
      kind: 'move',
      slot: chooseBaselineMove(decision, snapshot?.player?.types),
    };
  }

  const moves = legalMoves
    .map(move => ({ move, score: scoreAdvancedMove(move, snapshot) }))
    .sort((left, right) => right.score - left.score);
  if (allowVoluntarySwitch && !decision.switchingBlocked && snapshot?.player && snapshot.opponent) {
    const active = playerParty.find(pokemon => pokemon.species === snapshot.player?.species);
    const opponentTypes = snapshot.opponent.types;
    const activeScore = active ? matchupScore(active, opponentTypes) : 0;
    const bestSwitch = decision.switches
      .filter(choice => !choice.active && !choice.fainted)
      .map(choice => ({
        choice,
        pokemon: playerParty.find(pokemon => pokemon.species === choice.species),
      }))
      .filter((entry): entry is typeof entry & { pokemon: RunPokemon } => Boolean(entry.pokemon))
      .map(entry => ({ ...entry, score: matchupScore(entry.pokemon, opponentTypes) }))
      .sort((left, right) => right.score - left.score)[0];
    const incomingThreat = typeThreat(snapshot.opponent.types, snapshot.player.types);
    if (
      bestSwitch
      && incomingThreat >= 4
      && bestSwitch.score > activeScore + 60
      && (moves[0]?.score ?? 0) < 140
    ) {
      return { kind: 'switch', slot: bestSwitch.choice.slot };
    }
  }
  return { kind: 'move', slot: moves[0]?.move.slot ?? legalMoves[0]?.slot ?? 1 };
}

function runHeadlessBattle(
  playerParty: RunPokemon[],
  enemyParty: RunPokemon[],
  stage: number,
  difficulty: RunDifficulty,
  playerPolicy: FullRunPlayerPolicy = 'competent',
): Promise<HeadlessBattleOutcome> {
  return new Promise((resolve, reject) => {
    let turns = 0;
    let snapshot: BattleSnapshot | null = null;
    let lastVoluntarySwitchTurn = -2;
    let settled = false;
    const decisionRandom = createSeededRandom([
      playerPolicy,
      stage,
      ...playerParty.map(pokemon => pokemon.species),
      ...enemyParty.map(pokemon => pokemon.species),
    ].join(':'));
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Balance simulation timed out at stage ${stage} (${difficulty}).`));
    }, 15_000);

    const session = new ShowdownBattleSession(
      playerParty,
      enemyParty,
      {
        onSnapshot: nextSnapshot => {
          turns = Math.max(turns, nextSnapshot.turn);
          snapshot = nextSnapshot;
        },
        onDecision: decision => {
          if (decision.kind === 'wait') return;
          const action = chooseSimulatedPlayerAction(
            playerPolicy,
            decision,
            snapshot,
            playerParty,
            decisionRandom,
            turns > lastVoluntarySwitchTurn + 1,
          );
          if (action.kind === 'switch') {
            if (decision.kind === 'move') lastVoluntarySwitchTurn = turns;
            session.chooseSwitch(action.slot);
          } else {
            session.chooseMove(action.slot);
          }
        },
        onLog: () => undefined,
        onVisual: () => undefined,
        onEnd: result => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          resolve({
            result,
            turns: Math.max(1, turns),
            survivors: Math.max(0, playerParty.length - result.faintedPlayerSpecies.length),
          });
        },
        onError: (message, fatal, cause) => {
          if (!fatal || settled) return;
          settled = true;
          clearTimeout(timeout);
          reject(cause instanceof Error ? cause : new Error(message));
        },
      },
      stage,
      difficulty,
      createBattleSimulationSeeds(playerParty, enemyParty, stage, difficulty),
    );
    session.start();
  });
}

function routeForPolicy(
  policy: FullRunRoutePolicy,
  stage: number,
  partySize: number,
): RunRoute {
  if (isCheckpointStage(stage)) return RUN_ROUTES[2];
  if (policy === 'adaptive') {
    if (partySize <= 2) return RUN_ROUTES[0];
    if (partySize >= 5 && stage < 11) return RUN_ROUTES[2];
    return RUN_ROUTES[1];
  }
  return RUN_ROUTES.find(route => route.difficulty === policy) ?? RUN_ROUTES[1];
}

function pokemonPower(pokemon: RunPokemon): number {
  return pokemon.bst + pokemon.level * 3 + (pokemon.isMega ? 80 : 0);
}

function chooseStrongestPokemon(choices: RunPokemon[]): RunPokemon | null {
  return [...choices].sort((left, right) => pokemonPower(right) - pokemonPower(left))[0] ?? null;
}

function chooseUpgrade(
  choices: RunUpgrade[],
  stage: number,
  partySize: number,
): RunUpgrade | null {
  const score = (upgrade: RunUpgrade): number => {
    if (upgrade.id === 'full-roster') return (PARTY_LIMIT - partySize) * 500;
    if (upgrade.id === 'evolution-catalyst') return 900;
    if (upgrade.id === 'veteran-training') return stage <= 5 ? 850 : 450;
    if (upgrade.id === 'expanded-scouting') return stage <= 5 ? 700 : 350;
    if (upgrade.id === 'survivor-mark') return 500;
    if (upgrade.id === 'flawless-standard') return 400;
    if (upgrade.id === 'contract-ledger') return 350;
    return 300;
  };
  return [...choices].sort((left, right) => score(right) - score(left))[0] ?? null;
}

function applySimulatedUpgrade(
  upgrade: RunUpgrade | null,
  party: RunPokemon[],
  stage: number,
  random: () => number,
): { party: RunPokemon[]; upgrades: RunUpgrade[] } {
  if (!upgrade) return { party, upgrades: [] };
  if (upgrade.effect === 'fill-roster') {
    const recruits = createDraftChoices(
      stage + 1,
      party,
      random,
      false,
      Math.max(0, PARTY_LIMIT - party.length),
    );
    return { party: [...party, ...recruits].slice(0, PARTY_LIMIT), upgrades: [upgrade] };
  }
  if (upgrade.effect === 'develop-pokemon') {
    const options = getPartyDevelopmentChoices(party)
      .flatMap(choice => choice.options.map(option => ({
        partyIndex: choice.partyIndex,
        pokemon: option.pokemon,
      })))
      .sort((left, right) => pokemonPower(right.pokemon) - pokemonPower(left.pokemon));
    const best = options[0];
    const developed = best
      ? developPartyPokemon(party, best.partyIndex, best.pokemon.species)
      : null;
    return { party: developed ?? party, upgrades: [upgrade] };
  }
  return { party, upgrades: [upgrade] };
}

function recruitForNextStage(
  party: RunPokemon[],
  stage: number,
  route: RunRoute,
  upgrades: RunUpgrade[],
  random: () => number,
): RunPokemon[] {
  const profile = getRecruitmentRewardProfile(stage + 1, route, upgrades);
  const recruit = chooseStrongestPokemon(createDraftChoices(
    profile.stage,
    party,
    random,
    false,
    profile.choiceCount,
  ));
  if (!recruit) return party;
  if (party.length < PARTY_LIMIT) return [...party, recruit];

  const weakestIndex = party.reduce((candidate, pokemon, index) => (
    pokemonPower(pokemon) < pokemonPower(party[candidate]) ? index : candidate
  ), 0);
  if (pokemonPower(recruit) <= pokemonPower(party[weakestIndex])) return party;
  return party.map((pokemon, index) => index === weakestIndex ? recruit : pokemon);
}

async function simulateOneFullRun(
  policy: FullRunRoutePolicy,
  playerPolicy: FullRunPlayerPolicy,
  seed: string,
  battleRunner: HeadlessBattleRunner,
): Promise<SimulatedRunResult> {
  const random = createSeededRandom(seed);
  const starter = chooseStrongestPokemon(createDraftChoices(1, [], random, true));
  if (!starter) throw new Error('Full-run simulation could not create a starter.');

  let party = [starter];
  let score = 0;
  let contractStreak = 0;
  let runStats: RunStats = createEmptyRunStats();
  let unlockedMilestoneIds: RunMilestoneId[] = [];
  let upgrades: RunUpgrade[] = [];
  const stages: SimulatedRunResult['stages'] = [];

  for (let stage = 1; stage <= 15; stage += 1) {
    const route = routeForPolicy(policy, stage, party.length);
    party = rotatePartyToLead(
      party,
      party.reduce((candidate, pokemon, index) => (
        pokemonPower(pokemon) > pokemonPower(party[candidate]) ? index : candidate
      ), 0),
    );
    const challenge = createStageChallenge(stage, party.length, random);
    const enemyParty = createEnemyParty(stage, party, random, route);
    const partySize = party.length;
    const outcome = await battleRunner(party, enemyParty, stage, route.difficulty, playerPolicy);
    const fainted = new Set(outcome.result.faintedPlayerSpecies);
    const survivors = party.filter(pokemon => !fainted.has(pokemon.species));
    const cleared = outcome.result.winner === 'player' && survivors.length > 0;

    stages.push({
      stage,
      cleared,
      turns: outcome.turns,
      survivors: survivors.length,
    });
    if (!cleared) {
      return {
        completed: false,
        stagesCleared: stage - 1,
        score,
        finalPartySize: survivors.length,
        deathStage: stage,
        stages,
      };
    }

    const faintedCount = partySize - survivors.length;
    const reward = calculateBattleReward(
      stage,
      outcome.turns,
      partySize,
      faintedCount,
      challenge,
      route,
      upgrades,
      contractStreak,
    );
    contractStreak = reward.contractStreak;
    runStats = advanceRunStats(runStats, stage, faintedCount, route, reward.challengeCompleted);
    const milestoneReward = calculateRunMilestoneReward(runStats, unlockedMilestoneIds);
    unlockedMilestoneIds = [
      ...unlockedMilestoneIds,
      ...milestoneReward.milestonesUnlocked.map(milestone => milestone.id),
    ];
    score += reward.totalScore + milestoneReward.milestoneBonus;
    party = levelUpSurvivors(survivors, reward.levelsGained);

    if (stage === 15) {
      return {
        completed: true,
        stagesCleared: 15,
        score,
        finalPartySize: party.length,
        deathStage: null,
        stages,
      };
    }

    if (isCheckpointStage(stage)) {
      const choices = createRunUpgradeChoices(upgrades, random, 3, {
        emptyPartySlots: PARTY_LIMIT - party.length,
        canDevelop: getPartyDevelopmentChoices(party).length > 0,
      });
      const selected = chooseUpgrade(choices, stage, party.length);
      const applied = applySimulatedUpgrade(selected, party, stage, random);
      party = applied.party;
      upgrades = [...upgrades, ...applied.upgrades];
    }

    party = recruitForNextStage(party, stage, route, upgrades, random);
  }

  throw new Error('Full-run simulation exited without a final result.');
}

export function createBalanceScenarios(
  stages: number[],
  runs: number,
): BattleBalanceScenario[] {
  return stages.flatMap(stage => {
    const routes = isCheckpointStage(stage)
      ? [RUN_ROUTES.find(route => route.id === 'apex') ?? RUN_ROUTES[2]]
      : RUN_ROUTES;
    return routes.map(route => ({ stage, route, runs }));
  });
}

export async function simulateBattleBalance(
  options: BattleBalanceOptions = {},
): Promise<BattleBalanceResult[]> {
  const stages = options.stages?.length
    ? [...new Set(options.stages.map(stage => Math.max(1, Math.min(15, Math.floor(stage)))))]
    : [1, 3, 5, 7, 10, 12, 15];
  const runs = Math.max(1, Math.floor(options.runsPerScenario ?? 25));
  const scenarios = createBalanceScenarios(stages, runs);
  const total = scenarios.reduce((sum, scenario) => sum + scenario.runs, 0);
  const seed = options.seed ?? 'battle-balance';
  let completed = 0;
  const results: BattleBalanceResult[] = [];

  for (const scenario of scenarios) {
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let totalTurns = 0;
    let totalSurvivors = 0;

    for (let run = 0; run < scenario.runs; run += 1) {
      const random = createSeededRandom(`${seed}:${scenario.stage}:${scenario.route.id}:${run}`);
      const partySize = Math.min(6, scenario.stage);
      const playerParty = createDraftChoices(
        scenario.stage,
        [],
        random,
        scenario.stage === 1,
        partySize,
      );
      const enemyParty = createEnemyParty(scenario.stage, playerParty, random, scenario.route);
      let outcome;
      try {
        outcome = await runHeadlessBattle(
          playerParty,
          enemyParty,
          scenario.stage,
          scenario.route.difficulty,
          options.playerPolicy,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error && error.stack ? `\n${error.stack}` : '';
        const player = playerParty.map(pokemon => pokemon.species).join(', ');
        const enemy = enemyParty.map(pokemon => pokemon.species).join(', ');
        throw new Error(
          `Scenario ${scenario.stage}:${scenario.route.id}:${run} failed (${player} vs ${enemy}): ${message}${stack}`,
        );
      }

      if (outcome.result.winner === 'player') wins += 1;
      else if (outcome.result.winner === 'opponent') losses += 1;
      else ties += 1;
      totalTurns += outcome.turns;
      totalSurvivors += outcome.survivors;
      completed += 1;
      options.onProgress?.(completed, total);
    }

    results.push({
      stage: scenario.stage,
      route: scenario.route.id,
      difficulty: isCheckpointStage(scenario.stage) ? 'boss' : scenario.route.difficulty,
      runs: scenario.runs,
      wins,
      losses,
      ties,
      winRate: wins / scenario.runs,
      averageTurns: totalTurns / scenario.runs,
      averageSurvivors: totalSurvivors / scenario.runs,
    });
  }

  return results;
}

export async function simulateFullBattleRuns(
  options: FullRunBalanceOptions = {},
): Promise<FullRunBalanceResult[]> {
  const runs = Math.max(1, Math.floor(options.runsPerPolicy ?? 10));
  const policies = options.policies?.length
    ? [...new Set(options.policies)]
    : ['easy', 'medium', 'hard', 'adaptive'] satisfies FullRunRoutePolicy[];
  const playerPolicies = options.playerPolicies?.length
    ? [...new Set(options.playerPolicies)]
    : ['competent'] satisfies FullRunPlayerPolicy[];
  const seed = options.seed ?? 'full-run-balance';
  const battleRunner = options.battleRunner ?? runHeadlessBattle;
  const total = policies.length * playerPolicies.length * runs;
  let completed = 0;
  const results: FullRunBalanceResult[] = [];

  for (const policy of policies) {
    for (const playerPolicy of playerPolicies) {
      const runResults: SimulatedRunResult[] = [];
      for (let run = 0; run < runs; run += 1) {
        runResults.push(await simulateOneFullRun(
          policy,
          playerPolicy,
          `${seed}:${policy}:${run}`,
          battleRunner,
        ));
        completed += 1;
        options.onProgress?.(completed, total);
      }

      const completions = runResults.filter(result => result.completed).length;
      const deathStages = runResults.reduce<Record<string, number>>((counts, result) => {
        const key = result.deathStage === null ? 'complete' : String(result.deathStage);
        counts[key] = (counts[key] ?? 0) + 1;
        return counts;
      }, {});
      const stages = Array.from({ length: 15 }, (_, index): FullRunStageResult => {
        const stage = index + 1;
        const attempts = runResults.flatMap(result => result.stages.filter(entry => entry.stage === stage));
        const cleared = attempts.filter(attempt => attempt.cleared).length;
        return {
          stage,
          reached: attempts.length,
          cleared,
          clearRate: attempts.length > 0 ? cleared / attempts.length : 0,
          averageTurns: attempts.length > 0
            ? attempts.reduce((sum, attempt) => sum + attempt.turns, 0) / attempts.length
            : 0,
          averageSurvivors: attempts.length > 0
            ? attempts.reduce((sum, attempt) => sum + attempt.survivors, 0) / attempts.length
            : 0,
        };
      });
      const checkpoints = ([5, 10, 15] as const).map(stage => {
        const stageResult = stages[stage - 1];
        return {
          stage,
          reached: stageResult.reached,
          cleared: stageResult.cleared,
          clearRate: stageResult.clearRate,
        };
      });

      results.push({
        policy,
        playerPolicy,
        runs,
        completions,
        completionRate: completions / runs,
        averageStagesCleared: runResults.reduce((sum, result) => sum + result.stagesCleared, 0) / runs,
        averageScore: runResults.reduce((sum, result) => sum + result.score, 0) / runs,
        averageFinalPartySize: runResults.reduce((sum, result) => sum + result.finalPartySize, 0) / runs,
        deathStages,
        checkpoints,
        stages,
      });
    }
  }

  return results;
}
