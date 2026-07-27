import { create } from 'zustand';
import {
  createDraftChoices,
  createEnemyParty,
  createRerolledDraftChoices,
  createRoutePreviews,
  developPartyPokemon,
  getPartyDevelopmentChoices,
} from '../services/battle-content.service';
import { useBattleEngineStore } from './battleEngineStore';
import { pickOpponentTrainer } from '../components/battle-game/trainer-profiles';
import type {
  BattleRunPhase,
  BattleResult,
  OpponentTrainer,
  RunChallenge,
  RunMilestoneId,
  RunRewardSummary,
  RunRoute,
  RunRouteId,
  RunRoutePreviewMap,
  RunStats,
  RunUpgrade,
  RunUpgradeId,
  RunPokemon,
} from '../types/battle-run';
import {
  PARTY_LIMIT,
  RUN_ROUTES,
  addOrReplacePartyMember,
  advanceRunStats,
  applyRunUpgradesToChallenge,
  calculateRunMilestoneReward,
  calculateBattleReward,
  createRunUpgradeChoices,
  createEmptyRunStats,
  createStageChallenge,
  createSeededRandom,
  getBossModifier,
  getRecruitmentRewardProfile,
  getPostBattlePhase,
  isCheckpointStage,
  isFinalStage,
  levelUpSurvivors,
  rotatePartyToLead,
} from '../utils/battle-run-rules';
import { getBattleAiProfile } from '../utils/battle-ai-profile';

// The battle itself is run by the reusable battle engine (see battleEngineStore).
// This store owns only the Battle Run "narrative" around it: the roguelike party,
// stages, routes, upgrades, rewards, and drafts. It starts each battle through the
// engine and reacts to the outcome — it never touches the sim directly.
let random: (() => number) | null = null;
let randomCalls = 0;

const BEST_SCORE_KEY = 'battle-run-best-score';
export const BATTLE_RUN_SAVE_KEY = 'battle-run-checkpoint-v1';
const BATTLE_RUN_SAVE_VERSION = 1;
const RESTORABLE_PHASES = new Set<BattleRunPhase>([
  'starter-draft',
  'lead-select',
  'route-select',
  'upgrade-draft',
  'reward-draft',
  'party-development',
  'replacement',
]);

export interface SavedBattleRunSummary {
  stage: number;
  score: number;
  party: RunPokemon[];
  savedAt: number;
}

type PersistedBattleRunState = Pick<BattleRunStore,
  | 'phase'
  | 'stage'
  | 'score'
  | 'personalBestReached'
  | 'winStreak'
  | 'contractStreak'
  | 'scoutPasses'
  | 'runStats'
  | 'unlockedMilestoneIds'
  | 'seed'
  | 'party'
  | 'enemyParty'
  | 'routePreviews'
  | 'opponentTrainer'
  | 'activeChallenge'
  | 'activeRoute'
  | 'upgrades'
  | 'upgradeChoices'
  | 'draftChoices'
  | 'pendingRecruit'
  | 'developmentRewardPending'
  | 'lastReward'
>;

interface SavedBattleRunCheckpoint {
  version: number;
  savedAt: number;
  randomCalls: number;
  state: PersistedBattleRunState;
}

function setRunRandom(seed: string, calls = 0): () => number {
  const seeded = createSeededRandom(seed);
  const restoredCalls = Math.max(0, Math.floor(calls));
  for (let index = 0; index < restoredCalls; index += 1) seeded();
  randomCalls = restoredCalls;
  random = () => {
    randomCalls += 1;
    return seeded();
  };
  return random;
}

function readSavedBattleRun(): SavedBattleRunCheckpoint | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(BATTLE_RUN_SAVE_KEY);
    if (!raw) return null;
    const checkpoint = JSON.parse(raw) as Partial<SavedBattleRunCheckpoint>;
    if (
      checkpoint.version !== BATTLE_RUN_SAVE_VERSION
      || typeof checkpoint.savedAt !== 'number'
      || typeof checkpoint.randomCalls !== 'number'
      || !checkpoint.state
      || typeof checkpoint.state.seed !== 'string'
      || checkpoint.state.seed.length === 0
      || !Array.isArray(checkpoint.state.party)
      || !RESTORABLE_PHASES.has(checkpoint.state.phase as BattleRunPhase)
    ) {
      window.localStorage.removeItem(BATTLE_RUN_SAVE_KEY);
      return null;
    }
    return checkpoint as SavedBattleRunCheckpoint;
  } catch {
    window.localStorage.removeItem(BATTLE_RUN_SAVE_KEY);
    return null;
  }
}

function savedRunSummary(checkpoint: SavedBattleRunCheckpoint | null): SavedBattleRunSummary | null {
  if (!checkpoint) return null;
  return {
    stage: checkpoint.state.stage,
    score: checkpoint.state.score,
    party: checkpoint.state.party,
    savedAt: checkpoint.savedAt,
  };
}

function clearSavedBattleRun(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(BATTLE_RUN_SAVE_KEY);
  } catch {
    // Saving is optional in private or restricted browser sessions.
  }
}

const initialSavedRun = readSavedBattleRun();

function readBestScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const value = Number(window.localStorage.getItem(BEST_SCORE_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function persistBestScore(score: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch {
    // A private or restricted browser session can still play without persistence.
  }
}

interface BattleRunStore {
  resumeAvailable: boolean;
  savedRunSummary: SavedBattleRunSummary | null;
  phase: BattleRunPhase;
  stage: number;
  score: number;
  bestScore: number;
  personalBestReached: boolean;
  winStreak: number;
  contractStreak: number;
  scoutPasses: number;
  runStats: RunStats;
  unlockedMilestoneIds: RunMilestoneId[];
  seed: string;
  party: RunPokemon[];
  enemyParty: RunPokemon[];
  routePreviews: RunRoutePreviewMap;
  opponentTrainer: OpponentTrainer | null;
  activeChallenge: RunChallenge | null;
  activeRoute: RunRoute | null;
  upgrades: RunUpgrade[];
  upgradeChoices: RunUpgrade[];
  draftChoices: RunPokemon[];
  pendingRecruit: RunPokemon | null;
  developmentRewardPending: boolean;
  lastReward: RunRewardSummary | null;
  startRun: () => void;
  resumeRun: () => void;
  chooseStarter: (pokemon: RunPokemon) => void;
  chooseLead: (index: number) => void;
  selectRoute: (routeId: RunRouteId) => void;
  chooseUpgrade: (upgradeId: RunUpgradeId) => void;
  chooseReward: (pokemon: RunPokemon) => void;
  openPartyDevelopment: () => void;
  closePartyDevelopment: () => void;
  developPartyMember: (partyIndex: number, targetSpecies: string) => void;
  rerollDraft: () => void;
  replacePartyMember: (index: number) => void;
}

function newSeed(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function prepareStageChallenge(
  stage: number,
  partySize: number,
  upgrades: RunUpgrade[],
  rng: () => number,
): RunChallenge {
  return applyRunUpgradesToChallenge(createStageChallenge(stage, partySize, rng), upgrades);
}

function emptyRoutePreviews(): RunRoutePreviewMap {
  return { trail: [], rival: [], apex: [] };
}

function prepareStageEncounter(
  stage: number,
  party: RunPokemon[],
  upgrades: RunUpgrade[],
  rng: () => number,
): Pick<BattleRunStore, 'activeChallenge' | 'opponentTrainer' | 'routePreviews'> {
  return {
    activeChallenge: prepareStageChallenge(stage, party.length, upgrades, rng),
    opponentTrainer: pickOpponentTrainer(stage, rng),
    routePreviews: createRoutePreviews(stage, party, rng),
  };
}

export const useBattleRunStore = create<BattleRunStore>((set, get) => {
  // The reward payout when a battle ends — handed to the engine as its onEnd
  // callback. The engine guarantees this fires exactly once, after the on-screen
  // KO animation has finished, so we only decide what the win/loss *means*.
  const finishBattle = (result: BattleResult) => {
    const current = get();
    const rng = random ?? Math.random;
    const fainted = new Set(result.faintedPlayerSpecies);
    const survivingParty = current.party.filter(pokemon => !fainted.has(pokemon.species));

    if (result.winner !== 'player' || survivingParty.length === 0) {
      set({
        phase: 'game-over',
        party: survivingParty,
        routePreviews: emptyRoutePreviews(),
        lastReward: null,
        activeChallenge: null,
        activeRoute: null,
      });
      return;
    }

    const baseReward = calculateBattleReward(
      current.stage,
      useBattleEngineStore.getState().snapshot?.turn ?? 1,
      current.party.length,
      fainted.size,
      current.activeChallenge,
      current.activeRoute,
      current.upgrades,
      current.contractStreak,
    );
    const runStats = advanceRunStats(
      current.runStats,
      current.stage,
      fainted.size,
      current.activeRoute,
      baseReward.challengeCompleted,
    );
    const milestoneReward = calculateRunMilestoneReward(runStats, current.unlockedMilestoneIds);
    const reward: RunRewardSummary = {
      ...baseReward,
      ...milestoneReward,
      totalScore: baseReward.totalScore + milestoneReward.milestoneBonus,
    };
    const unlockedMilestoneIds = [
      ...current.unlockedMilestoneIds,
      ...milestoneReward.milestonesUnlocked.map(milestone => milestone.id),
    ];
    const survivors = levelUpSurvivors(survivingParty, reward.levelsGained);
    const runComplete = isFinalStage(current.stage);
    const upgradeChoices = !runComplete && isCheckpointStage(current.stage)
      ? createRunUpgradeChoices(current.upgrades, rng, 3, {
        emptyPartySlots: PARTY_LIMIT - survivors.length,
        canDevelop: getPartyDevelopmentChoices(survivors).length > 0,
      })
      : [];
    const needsUpgradeChoice = upgradeChoices.length > 0;
    const recruitmentReward = getRecruitmentRewardProfile(
      current.stage + 1,
      current.activeRoute,
      current.upgrades,
    );
    const score = current.score + reward.totalScore;
    const personalBestReached = current.personalBestReached || score > current.bestScore;
    const bestScore = Math.max(current.bestScore, score);
    if (bestScore > current.bestScore) persistBestScore(bestScore);

    set({
      phase: getPostBattlePhase(current.stage, needsUpgradeChoice),
      party: survivors,
      score,
      bestScore,
      personalBestReached,
      winStreak: current.winStreak + 1,
      contractStreak: reward.contractStreak,
      scoutPasses: current.scoutPasses + reward.scoutPassesEarned + reward.milestoneScoutPasses,
      runStats,
      unlockedMilestoneIds,
      draftChoices: runComplete || needsUpgradeChoice
        ? []
        : createDraftChoices(
          recruitmentReward.stage,
          survivors,
          rng,
          false,
          recruitmentReward.choiceCount,
        ),
      upgradeChoices,
      pendingRecruit: null,
      developmentRewardPending: false,
      lastReward: reward,
      activeChallenge: null,
      activeRoute: null,
      routePreviews: emptyRoutePreviews(),
    });
  };

  const beginBattle = (route: RunRoute) => {
    const state = get();
    const rng = random ?? Math.random;
    const opponentTrainer = state.opponentTrainer ?? pickOpponentTrainer(state.stage, rng);
    const previewedParty = state.routePreviews[route.id];
    const enemyParty = previewedParty.length > 0
      ? previewedParty
      : createEnemyParty(state.stage, state.party, rng, route);
    const activeChallenge = state.activeChallenge
      ?? prepareStageChallenge(state.stage, state.party.length, state.upgrades, rng);
    const bossModifier = getBossModifier(state.stage);
    const aiProfile = getBattleAiProfile(state.stage, route.difficulty);

    set({
      phase: 'preparing-battle',
      enemyParty,
      opponentTrainer,
      activeChallenge,
      activeRoute: route,
    });

    // Hand the fight to the reusable engine: it runs the sim, drives the scene,
    // and calls finishBattle once the on-screen battle is over. We only supply the
    // two parties, the difficulty (stage), the opening flavor lines, and flip to
    // the 'battle' phase the moment the fight goes live.
    useBattleEngineStore.getState().startBattle({
      playerParty: state.party,
      enemyParty,
      level: state.stage,
      difficulty: route.difficulty,
      introLog: [
        `${opponentTrainer.title} ${opponentTrainer.name} challenges you!`,
        `Opponent strategy: ${aiProfile.title}. ${aiProfile.description}`,
        ...(bossModifier ? [`Boss rule: ${bossModifier.title}. ${bossModifier.description}`] : []),
      ],
      onActive: () => set(current => (current.phase === 'preparing-battle' ? { phase: 'battle' } : {})),
      onEnd: finishBattle,
    });
  };

  const advanceStage = (party: RunPokemon[]) => {
    const rng = random ?? Math.random;
    set(current => {
      const stage = current.stage + 1;
      const encounter = prepareStageEncounter(stage, party, current.upgrades, rng);
      return {
        stage,
        party,
        pendingRecruit: null,
        developmentRewardPending: false,
        draftChoices: [],
        lastReward: null,
        enemyParty: [],
        ...encounter,
        activeRoute: null,
        upgradeChoices: [],
        phase: party.length > 1 ? 'lead-select' : 'route-select',
      };
    });
  };

  return {
    resumeAvailable: Boolean(initialSavedRun),
    savedRunSummary: savedRunSummary(initialSavedRun),
    phase: 'starter-draft',
    stage: 1,
    score: 0,
    bestScore: readBestScore(),
    personalBestReached: false,
    winStreak: 0,
    contractStreak: 0,
    scoutPasses: 0,
    runStats: createEmptyRunStats(),
    unlockedMilestoneIds: [],
    seed: '',
    party: [],
    enemyParty: [],
    routePreviews: emptyRoutePreviews(),
    opponentTrainer: null,
    activeChallenge: null,
    activeRoute: null,
    upgrades: [],
    upgradeChoices: [],
    draftChoices: [],
    pendingRecruit: null,
    developmentRewardPending: false,
    lastReward: null,

    startRun: () => {
      const seed = newSeed();
      const bestScore = Math.max(get().bestScore, readBestScore());
      clearSavedBattleRun();
      const rng = setRunRandom(seed);
      useBattleEngineStore.getState().resetBattle();
      set({
        resumeAvailable: false,
        savedRunSummary: null,
        phase: 'starter-draft',
        stage: 1,
        score: 0,
        bestScore,
        personalBestReached: false,
        winStreak: 0,
        contractStreak: 0,
        scoutPasses: 0,
        runStats: createEmptyRunStats(),
        unlockedMilestoneIds: [],
        seed,
        party: [],
        enemyParty: [],
        routePreviews: emptyRoutePreviews(),
        opponentTrainer: null,
        activeChallenge: null,
        activeRoute: null,
        upgrades: [],
        upgradeChoices: [],
        draftChoices: createDraftChoices(1, [], rng, true),
        pendingRecruit: null,
        developmentRewardPending: false,
        lastReward: null,
      });
    },

    resumeRun: () => {
      const checkpoint = readSavedBattleRun();
      if (!checkpoint) {
        get().startRun();
        return;
      }
      setRunRandom(checkpoint.state.seed, checkpoint.randomCalls);
      useBattleEngineStore.getState().resetBattle();
      set({
        ...checkpoint.state,
        bestScore: Math.max(get().bestScore, readBestScore()),
        resumeAvailable: false,
        savedRunSummary: null,
      });
    },

    chooseStarter: pokemon => {
      const current = get();
      const party = [pokemon];
      const encounter = prepareStageEncounter(current.stage, party, current.upgrades, random ?? Math.random);
      set({
        party,
        draftChoices: [],
        ...encounter,
        phase: 'route-select',
      });
    },

    chooseLead: index => {
      const current = get();
      if (current.phase !== 'lead-select' || !Number.isInteger(index) || index < 0 || index >= current.party.length) return;
      set({
        party: rotatePartyToLead(current.party, index),
        phase: 'route-select',
      });
    },

    selectRoute: routeId => {
      if (get().phase !== 'route-select') return;
      if (isCheckpointStage(get().stage) && routeId !== 'apex') return;
      const route = RUN_ROUTES.find(option => option.id === routeId);
      if (!route) return;
      beginBattle(route);
    },

    chooseUpgrade: upgradeId => {
      const current = get();
      if (current.phase !== 'upgrade-draft') return;
      const upgrade = current.upgradeChoices.find(choice => choice.id === upgradeId);
      if (!upgrade) return;
      const upgrades = [...current.upgrades, upgrade];
      const rng = random ?? Math.random;

      if (upgrade.effect === 'develop-pokemon') {
        if (getPartyDevelopmentChoices(current.party).length === 0) return;
        set({
          phase: 'party-development',
          upgrades,
          upgradeChoices: [],
          draftChoices: [],
          developmentRewardPending: true,
        });
        return;
      }

      const party = upgrade.effect === 'fill-roster'
        ? [
          ...current.party,
          ...createDraftChoices(
            current.stage + 1,
            current.party,
            rng,
            false,
            Math.max(0, PARTY_LIMIT - current.party.length),
          ),
        ].slice(0, PARTY_LIMIT)
        : current.party;
      const recruitmentReward = getRecruitmentRewardProfile(
        current.stage + 1,
        current.lastReward?.route,
        upgrades,
      );
      set({
        phase: 'reward-draft',
        party,
        upgrades,
        upgradeChoices: [],
        draftChoices: createDraftChoices(
          recruitmentReward.stage,
          party,
          rng,
          false,
          recruitmentReward.choiceCount,
        ),
        developmentRewardPending: false,
      });
    },

    chooseReward: pokemon => {
      const { party } = get();
      if (party.length >= PARTY_LIMIT) {
        set({ phase: 'replacement', pendingRecruit: pokemon });
        return;
      }
      advanceStage(addOrReplacePartyMember(party, pokemon));
    },

    openPartyDevelopment: () => {
      const current = get();
      if (
        current.phase !== 'reward-draft'
        || current.party.length < PARTY_LIMIT
        || getPartyDevelopmentChoices(current.party).length === 0
      ) return;
      set({ phase: 'party-development', developmentRewardPending: false });
    },

    closePartyDevelopment: () => {
      if (get().phase === 'party-development' && !get().developmentRewardPending) set({ phase: 'reward-draft' });
    },

    developPartyMember: (partyIndex, targetSpecies) => {
      const current = get();
      if (current.phase !== 'party-development') return;
      const party = developPartyPokemon(current.party, partyIndex, targetSpecies);
      if (!party) return;
      if (current.developmentRewardPending) {
        const recruitmentReward = getRecruitmentRewardProfile(
          current.stage + 1,
          current.lastReward?.route,
          current.upgrades,
        );
        set({
          phase: 'reward-draft',
          party,
          developmentRewardPending: false,
          draftChoices: createDraftChoices(
            recruitmentReward.stage,
            party,
            random ?? Math.random,
            false,
            recruitmentReward.choiceCount,
          ),
        });
        return;
      }
      advanceStage(party);
    },

    rerollDraft: () => {
      const current = get();
      if (current.phase !== 'reward-draft' || current.scoutPasses < 1) return;
      const recruitmentReward = getRecruitmentRewardProfile(
        current.stage + 1,
        current.lastReward?.route,
        current.upgrades,
      );
      const draftChoices = createRerolledDraftChoices(
        recruitmentReward.stage,
        current.party,
        current.draftChoices,
        random ?? Math.random,
        recruitmentReward.choiceCount,
      );
      if (draftChoices.length === 0) return;
      set({
        draftChoices,
        scoutPasses: current.scoutPasses - 1,
      });
    },

    replacePartyMember: index => {
      const { party, pendingRecruit } = get();
      if (!pendingRecruit) return;
      advanceStage(addOrReplacePartyMember(party, pendingRecruit, index));
    },
  };
});

function persistBattleRunCheckpoint(state: BattleRunStore): void {
  if (typeof window === 'undefined' || !state.seed) return;
  if (state.phase === 'game-over' || state.phase === 'run-complete') {
    clearSavedBattleRun();
    return;
  }
  if (state.phase === 'preparing-battle' || state.phase === 'battle') return;
  const hasStarterDraft = state.phase === 'starter-draft' && state.draftChoices.length > 0;
  if (state.party.length === 0 && !hasStarterDraft) return;

  const persistedState: PersistedBattleRunState = {
    phase: state.phase,
    stage: state.stage,
    score: state.score,
    personalBestReached: state.personalBestReached,
    winStreak: state.winStreak,
    contractStreak: state.contractStreak,
    scoutPasses: state.scoutPasses,
    runStats: state.runStats,
    unlockedMilestoneIds: state.unlockedMilestoneIds,
    seed: state.seed,
    party: state.party,
    enemyParty: state.enemyParty,
    routePreviews: state.routePreviews,
    opponentTrainer: state.opponentTrainer,
    activeChallenge: state.activeChallenge,
    activeRoute: state.activeRoute,
    upgrades: state.upgrades,
    upgradeChoices: state.upgradeChoices,
    draftChoices: state.draftChoices,
    pendingRecruit: state.pendingRecruit,
    developmentRewardPending: state.developmentRewardPending,
    lastReward: state.lastReward,
  };

  try {
    window.localStorage.setItem(BATTLE_RUN_SAVE_KEY, JSON.stringify({
      version: BATTLE_RUN_SAVE_VERSION,
      savedAt: Date.now(),
      randomCalls,
      state: persistedState,
    } satisfies SavedBattleRunCheckpoint));
  } catch {
    // The run remains playable if storage is unavailable or full.
  }
}

useBattleRunStore.subscribe(persistBattleRunCheckpoint);
