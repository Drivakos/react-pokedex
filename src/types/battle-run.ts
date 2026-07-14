export type BattleRunPhase =
  | 'starter-draft'
  | 'route-select'
  | 'preparing-battle'
  | 'battle'
  | 'upgrade-draft'
  | 'reward-draft'
  | 'replacement'
  | 'game-over';

export interface RunPokemon {
  id: number;
  species: string;
  level: number;
  types: string[];
  ability: string;
  moves: string[];
  bst: number;
}

export interface BattleMoveChoice {
  slot: number;
  name: string;
  type: string;
  category: string;
  power: number;
  accuracy: number | true;
  pp: number;
  maxpp: number;
  disabled: boolean;
}

export interface BattleSwitchChoice {
  slot: number;
  id: number;
  species: string;
  condition: string;
  active: boolean;
  fainted: boolean;
}

export interface BattleDecision {
  kind: 'move' | 'switch' | 'wait';
  moves: BattleMoveChoice[];
  switches: BattleSwitchChoice[];
  switchingBlocked: boolean;
}

export interface ActiveBattlePokemon {
  id: number;
  species: string;
  level: number;
  hp: number;
  maxhp: number;
  status?: string;
  fainted: boolean;
}

export interface OpponentTrainer {
  id: string;
  name: string;
  title: string;
  intro: string;
  image: string;
  credit: string;
}

export interface BattleSnapshot {
  turn: number;
  player: ActiveBattlePokemon | null;
  opponent: ActiveBattlePokemon | null;
  playerRemaining: number;
  opponentRemaining: number;
}

export type BattleSide = 'player' | 'opponent';

export interface BattleVisualEvent {
  id: number;
  kind: 'move' | 'damage' | 'heal' | 'miss' | 'faint' | 'switch' | 'status' | 'effectiveness';
  actor?: BattleSide;
  target?: BattleSide;
  label?: string;
  moveType?: string;
  moveCategory?: 'Physical' | 'Special' | 'Status';
  tone?: 'positive' | 'negative' | 'neutral';
  snapshot: BattleSnapshot;
}

export interface BattleResult {
  winner: 'player' | 'opponent' | 'tie';
  faintedPlayerSpecies: string[];
}

export type RunChallengeKind = 'tempo' | 'flawless' | 'formation' | 'checkpoint';

export interface RunChallenge {
  kind: RunChallengeKind;
  title: string;
  description: string;
  bounty: number;
  maxTurns?: number;
  maxFaints?: number;
  minSurvivors?: number;
}

export type RunRouteId = 'trail' | 'rival' | 'apex';

export interface RunRoute {
  id: RunRouteId;
  title: string;
  label: string;
  description: string;
  levelBonus: number;
  partySizeBonus: number;
  scoreMultiplier: number;
}

export type RunUpgradeId =
  | 'veteran-training'
  | 'expanded-scouting'
  | 'contract-ledger'
  | 'route-dividend'
  | 'flawless-standard'
  | 'survivor-mark';

export interface RunUpgrade {
  id: RunUpgradeId;
  title: string;
  label: string;
  description: string;
}

export type RunGradeRank = 'S' | 'A' | 'B' | 'C' | 'D';

export interface RunGrade {
  rank: RunGradeRank;
  title: string;
  description: string;
}

export interface RunRewardSummary {
  stage: number;
  turns: number;
  survivors: number;
  stageScore: number;
  survivalBonus: number;
  tempoBonus: number;
  flawlessBonus: number;
  checkpointBonus: number;
  challenge: RunChallenge | null;
  challengeCompleted: boolean;
  challengeBonus: number;
  route: RunRoute | null;
  routeBonus: number;
  totalScore: number;
  levelsGained: number;
}
