export type BattleRunPhase =
  | 'starter-draft'
  | 'lead-select'
  | 'route-select'
  | 'preparing-battle'
  | 'battle'
  | 'upgrade-draft'
  | 'reward-draft'
  | 'party-development'
  | 'replacement'
  | 'run-complete'
  | 'game-over';

export interface RunPokemon {
  id: number;
  species: string;
  level: number;
  types: string[];
  ability: string;
  moves: string[];
  bst: number;
  item?: string;
  isMega?: boolean;
  baseSpecies?: string;
}

export type PartyDevelopmentKind = 'evolution' | 'mega';

export interface PartyDevelopmentOption {
  kind: PartyDevelopmentKind;
  pokemon: RunPokemon;
}

export interface PartyDevelopmentChoice {
  partyIndex: number;
  current: RunPokemon;
  options: PartyDevelopmentOption[];
}

export interface BattleMoveChoice {
  slot: number;
  name: string;
  type: string;
  category: string;
  description: string;
  power: number;
  accuracy: number | true;
  priority: number;
  pp: number;
  maxpp: number;
  disabled: boolean;
  effectiveness: number | null;
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
  types: string[];
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

export interface RunChallengeProgressMetric {
  label: string;
  value: string;
}

export interface RunChallengeProgress {
  status: 'on-track' | 'at-risk' | 'failed';
  label: string;
  metrics: RunChallengeProgressMetric[];
}

export type RunRouteId = 'trail' | 'rival' | 'apex';

export type RunRoutePreviewMap = Record<RunRouteId, RunPokemon[]>;

export interface RunRoute {
  id: RunRouteId;
  title: string;
  label: string;
  description: string;
  levelBonus: number;
  partySizeBonus: number;
  scoreMultiplier: number;
  recruitmentStageBonus: number;
  recruitmentChoiceBonus: number;
}

export type RunMilestoneId =
  | 'iron-formation'
  | 'apex-hunter'
  | 'contract-specialist'
  | 'gatebreaker';

export type RunMilestoneMetric = 'flawlessWins' | 'apexWins' | 'contractsCleared' | 'bossesCleared';

export interface RunMilestone {
  id: RunMilestoneId;
  title: string;
  label: string;
  description: string;
  metric: RunMilestoneMetric;
  target: number;
  scoreBonus: number;
  scoutPasses: number;
}

export interface RunStats {
  flawlessWins: number;
  apexWins: number;
  contractsCleared: number;
  bossesCleared: number;
}

export interface RunMilestoneProgress {
  milestone: RunMilestone;
  current: number;
  complete: boolean;
  unlocked: boolean;
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

export interface RunSector {
  number: 1 | 2 | 3;
  title: string;
  objective: string;
  startStage: number;
  endStage: number;
  bossTitle: string;
}

export interface RunBossModifier {
  stage: 5 | 10 | 15;
  title: string;
  label: string;
  description: string;
  item: 'Sitrus Berry' | 'Life Orb' | 'Leftovers';
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
  contractStreak: number;
  challengeMultiplier: number;
  challengeBonus: number;
  scoutPassesEarned: number;
  route: RunRoute | null;
  routeBonus: number;
  milestoneBonus: number;
  milestoneScoutPasses: number;
  milestonesUnlocked: RunMilestone[];
  totalScore: number;
  levelsGained: number;
}
