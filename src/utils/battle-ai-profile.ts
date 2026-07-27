import type { RunDifficulty } from '../types/battle-run';
import { isCheckpointStage } from './battle-run-rules';

export interface BattleAiProfile {
  tier: 1 | 2 | 3;
  title: 'Learner' | 'Tactician' | 'Mastermind' | 'Boss';
  label: string;
  description: string;
  smartChance: number;
  moveChance: number;
}

const SMART_CHANCE_BY_TIER: Record<1 | 2 | 3, Record<RunDifficulty, number>> = {
  1: { easy: 0.05, medium: 0.1, hard: 0.25 },
  2: { easy: 0.25, medium: 0.45, hard: 0.7 },
  3: { easy: 0.45, medium: 0.7, hard: 0.9 },
};

export function getBattleAiProfile(stage: number, difficulty: RunDifficulty = 'medium'): BattleAiProfile {
  const normalizedStage = Math.max(1, Math.floor(stage));
  if (isCheckpointStage(normalizedStage)) {
    return {
      tier: 3,
      title: 'Boss',
      label: 'Relentless counterplay',
      description: 'Uses recovery, setup, disruption, coverage, and defensive switches without scaling down.',
      smartChance: 1,
      moveChance: 0.85,
    };
  }

  if (normalizedStage >= 11) {
    return {
      tier: 3,
      title: 'Mastermind',
      label: 'Consistent counterplay',
      description: 'Reads the battle state and combines damage, setup, recovery, disruption, and safer switches.',
      smartChance: SMART_CHANCE_BY_TIER[3][difficulty],
      moveChance: 0.85,
    };
  }
  if (normalizedStage >= 6) {
    return {
      tier: 2,
      title: 'Tactician',
      label: 'Type-aware pressure',
      description: 'Usually recognizes recovery, setup, status pressure, expected damage, and defensive matchups.',
      smartChance: SMART_CHANCE_BY_TIER[2][difficulty],
      moveChance: 0.9,
    };
  }
  return {
    tier: 1,
    title: 'Learner',
    label: 'Forgiving decisions',
    description: 'Mixes attacks and occasional switches while the run is still taking shape.',
    smartChance: SMART_CHANCE_BY_TIER[1][difficulty],
    moveChance: 0.95,
  };
}
