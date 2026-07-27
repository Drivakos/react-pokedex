import type {
  BattleDecision,
  BattleResult,
  RunDifficulty,
  RunPokemon,
  RunRoute,
} from '../types/battle-run';
import { RUN_ROUTES, createSeededRandom, isCheckpointStage } from '../utils/battle-run-rules';
import { createDraftChoices, createEnemyParty } from './battle-content.service';
import { ShowdownBattleSession } from './showdown-battle.service';

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
  onProgress?: (completed: number, total: number) => void;
}

function chooseBaselineMove(decision: BattleDecision): number {
  const legalMoves = decision.moves.filter(move => !move.disabled);
  const scored = legalMoves.map(move => {
    const accuracy = move.accuracy === true ? 1 : move.accuracy / 100;
    const effectiveness = move.effectiveness ?? 1;
    const priorityBonus = move.priority > 0 ? 1.05 : 1;
    const score = move.category === 'Status'
      ? 1
      : move.power * accuracy * effectiveness * priorityBonus;
    return { slot: move.slot, score };
  });
  scored.sort((left, right) => right.score - left.score);
  return scored[0]?.slot ?? legalMoves[0]?.slot ?? 1;
}

function chooseBaselineSwitch(decision: BattleDecision): number {
  const available = decision.switches.filter(choice => !choice.active && !choice.fainted);
  return available[0]?.slot ?? decision.switches[0]?.slot ?? 1;
}

function runHeadlessBattle(
  playerParty: RunPokemon[],
  enemyParty: RunPokemon[],
  stage: number,
  difficulty: RunDifficulty,
): Promise<{ result: BattleResult; turns: number; survivors: number }> {
  return new Promise((resolve, reject) => {
    let turns = 0;
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Balance simulation timed out at stage ${stage} (${difficulty}).`));
    }, 15_000);

    const session = new ShowdownBattleSession(
      playerParty,
      enemyParty,
      {
        onSnapshot: snapshot => {
          turns = Math.max(turns, snapshot.turn);
        },
        onDecision: decision => {
          if (decision.kind === 'move') session.chooseMove(chooseBaselineMove(decision));
          if (decision.kind === 'switch') session.chooseSwitch(chooseBaselineSwitch(decision));
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
    );
    session.start();
  });
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
