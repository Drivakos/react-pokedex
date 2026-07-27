import {
  type FullRunPlayerPolicy,
  type FullRunRoutePolicy,
  simulateBattleBalance,
  simulateFullBattleRuns,
} from '../src/services/battle-balance-simulator';

function numberArgument(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const raw = process.argv.find(argument => argument.startsWith(prefix))?.slice(prefix.length);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function stagesArgument(): number[] | undefined {
  const raw = process.argv.find(argument => argument.startsWith('--stages='))?.slice('--stages='.length);
  if (!raw) return undefined;
  const stages = raw
    .split(',')
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value >= 1 && value <= 15);
  return stages.length > 0 ? stages : undefined;
}

function policiesArgument(): FullRunRoutePolicy[] | undefined {
  const raw = process.argv.find(argument => argument.startsWith('--policies='))?.slice('--policies='.length);
  if (!raw) return undefined;
  const valid = new Set<FullRunRoutePolicy>(['easy', 'medium', 'hard', 'adaptive']);
  const policies = raw
    .split(',')
    .filter((policy): policy is FullRunRoutePolicy => valid.has(policy as FullRunRoutePolicy));
  return policies.length > 0 ? policies : undefined;
}

function playerPoliciesArgument(): FullRunPlayerPolicy[] | undefined {
  const raw = process.argv.find(argument => argument.startsWith('--players='))?.slice('--players='.length);
  if (!raw) return undefined;
  const valid = new Set<FullRunPlayerPolicy>(['casual', 'competent', 'advanced']);
  const policies = raw
    .split(',')
    .filter((policy): policy is FullRunPlayerPolicy => valid.has(policy as FullRunPlayerPolicy));
  return policies.length > 0 ? policies : undefined;
}

const runsPerScenario = numberArgument('runs', 25);
const stages = stagesArgument();
const seed = process.argv.find(argument => argument.startsWith('--seed='))?.slice('--seed='.length);
const json = process.argv.includes('--json');
const fullRun = process.argv.includes('--full');
let lastProgress = 0;

const reportProgress = (completed: number, total: number) => {
  if (json) return;
  const percent = Math.floor((completed / total) * 100);
  if (percent < lastProgress + 10 && completed !== total) return;
  lastProgress = percent;
  process.stderr.write(`Simulating ${fullRun ? 'runs' : 'battles'}… ${completed}/${total} (${percent}%)\n`);
};

if (fullRun) {
  const results = await simulateFullBattleRuns({
    runsPerPolicy: numberArgument('runs', 10),
    policies: policiesArgument(),
    playerPolicies: playerPoliciesArgument(),
    seed,
    onProgress: reportProgress,
  });
  if (json) {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  } else {
    console.table(results.map(result => ({
      Policy: result.policy,
      Player: result.playerPolicy,
      Runs: result.runs,
      'Completion rate': `${Math.round(result.completionRate * 100)}%`,
      'Avg stages': result.averageStagesCleared.toFixed(1),
      'Avg score': Math.round(result.averageScore).toLocaleString(),
      'Final party': result.averageFinalPartySize.toFixed(1),
      'Death stages': Object.entries(result.deathStages)
        .map(([stage, count]) => `${stage}:${count}`)
        .join(' '),
    })));
    console.table(results.flatMap(result => result.checkpoints.map(checkpoint => ({
      Policy: result.policy,
      Player: result.playerPolicy,
      Boss: checkpoint.stage,
      Reached: checkpoint.reached,
      Cleared: checkpoint.cleared,
      'Clear rate': `${Math.round(checkpoint.clearRate * 100)}%`,
    }))));
  }
} else {
  const results = await simulateBattleBalance({
    runsPerScenario,
    stages,
    seed,
    onProgress: reportProgress,
  });
  if (json) {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  } else {
    console.table(results.map(result => ({
      Stage: result.stage,
      Route: result.difficulty,
      Runs: result.runs,
      'Win rate': `${Math.round(result.winRate * 100)}%`,
      'Avg turns': result.averageTurns.toFixed(1),
      'Avg survivors': result.averageSurvivors.toFixed(1),
    })));
  }
}
