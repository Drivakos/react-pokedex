export interface BattleAiProfile {
  tier: 1 | 2 | 3;
  title: 'Learner' | 'Tactician' | 'Mastermind';
  label: string;
  description: string;
  smartChance: number;
  moveChance: number;
}

export function getBattleAiProfile(stage: number): BattleAiProfile {
  const normalizedStage = Math.max(1, Math.floor(stage));
  if (normalizedStage >= 11) {
    return {
      tier: 3,
      title: 'Mastermind',
      label: 'Consistent counterplay',
      description: 'Prioritizes type advantage, expected damage, and safer defensive switches.',
      smartChance: 1,
      moveChance: 0.85,
    };
  }
  if (normalizedStage >= 6) {
    return {
      tier: 2,
      title: 'Tactician',
      label: 'Type-aware pressure',
      description: 'Usually prioritizes expected damage and switches toward stronger defensive matchups.',
      smartChance: 0.7,
      moveChance: 0.9,
    };
  }
  return {
    tier: 1,
    title: 'Learner',
    label: 'Forgiving decisions',
    description: 'Mixes attacks and occasional switches while the run is still taking shape.',
    smartChance: 0.2,
    moveChance: 0.95,
  };
}
