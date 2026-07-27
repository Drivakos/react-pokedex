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

export function getBattleAiProfile(stage: number, difficulty: RunDifficulty = 'medium'): BattleAiProfile {
  const normalizedStage = Math.max(1, Math.floor(stage));
  if (isCheckpointStage(normalizedStage)) {
    return {
      tier: 3,
      title: 'Boss',
      label: 'Relentless counterplay',
      description: 'Always prioritizes strong damage and defensive switches; checkpoint bosses never scale down.',
      smartChance: 1,
      moveChance: 0.85,
    };
  }

  const difficultyAdjustment = difficulty === 'easy' ? -0.25 : difficulty === 'hard' ? 0.25 : 0;
  if (normalizedStage >= 11) {
    return {
      tier: 3,
      title: 'Mastermind',
      label: 'Consistent counterplay',
      description: 'Prioritizes type advantage, expected damage, and safer defensive switches.',
      smartChance: Math.min(1, 1 + difficultyAdjustment),
      moveChance: 0.85,
    };
  }
  if (normalizedStage >= 6) {
    return {
      tier: 2,
      title: 'Tactician',
      label: 'Type-aware pressure',
      description: 'Usually prioritizes expected damage and switches toward stronger defensive matchups.',
      smartChance: Math.max(0.15, Math.min(1, 0.7 + difficultyAdjustment)),
      moveChance: 0.9,
    };
  }
  return {
    tier: 1,
    title: 'Learner',
    label: 'Forgiving decisions',
    description: 'Mixes attacks and occasional switches while the run is still taking shape.',
    smartChance: Math.max(0.05, 0.2 + difficultyAdjustment),
    moveChance: 0.95,
  };
}
