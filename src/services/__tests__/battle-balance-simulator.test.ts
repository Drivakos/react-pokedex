import { createBalanceScenarios } from '../battle-balance-simulator';

describe('battle balance simulator scenarios', () => {
  it('benchmarks every route normally and one fixed route for bosses', () => {
    const scenarios = createBalanceScenarios([1, 5, 10], 20);

    expect(scenarios.map(({ stage, route }) => `${stage}:${route.id}`)).toEqual([
      '1:trail',
      '1:rival',
      '1:apex',
      '5:apex',
      '10:apex',
    ]);
    expect(scenarios.every(scenario => scenario.runs === 20)).toBe(true);
  });
});
