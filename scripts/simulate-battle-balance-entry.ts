import { simulateBattleBalance } from '../src/services/battle-balance-simulator';

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

const runsPerScenario = numberArgument('runs', 25);
const stages = stagesArgument();
const seed = process.argv.find(argument => argument.startsWith('--seed='))?.slice('--seed='.length);
const json = process.argv.includes('--json');
let lastProgress = 0;

const results = await simulateBattleBalance({
  runsPerScenario,
  stages,
  seed,
  onProgress: (completed, total) => {
    if (json) return;
    const percent = Math.floor((completed / total) * 100);
    if (percent < lastProgress + 10 && completed !== total) return;
    lastProgress = percent;
    process.stderr.write(`Simulating battles… ${completed}/${total} (${percent}%)\n`);
  },
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
