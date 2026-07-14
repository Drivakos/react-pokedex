import { create } from 'zustand';
import { createDraftChoices, createEnemyParty, createRerolledDraftChoices, createRoutePreviews } from '../services/battle-content.service';
import { ShowdownBattleWorkerSession } from '../services/showdown-battle-worker.service';
import { pickOpponentTrainer } from '../components/battle-game/trainer-profiles';
import type {
  BattleDecision,
  BattleRunPhase,
  BattleResult,
  BattleSnapshot,
  BattleVisualEvent,
  OpponentTrainer,
  RunChallenge,
  RunRewardSummary,
  RunRoute,
  RunRouteId,
  RunRoutePreviewMap,
  RunUpgrade,
  RunUpgradeId,
  RunPokemon,
} from '../types/battle-run';
import {
  PARTY_LIMIT,
  RUN_ROUTES,
  addOrReplacePartyMember,
  applyRunUpgradesToChallenge,
  calculateBattleReward,
  createRunUpgradeChoices,
  createStageChallenge,
  createSeededRandom,
  getBossModifier,
  getPostBattlePhase,
  isCheckpointStage,
  isFinalStage,
  levelUpSurvivors,
  recruitmentChoiceCount,
} from '../utils/battle-run-rules';
import { canSubmitMove, canSubmitSwitch } from '../utils/battle-request-rules';

const emptyDecision: BattleDecision = { kind: 'wait', moves: [], switches: [], switchingBlocked: false };
interface BattleSession {
  start: () => void;
  chooseMove: (slot: number) => void;
  chooseSwitch: (slot: number) => void;
  dispose: () => void;
}

let session: BattleSession | null = null;
let random: (() => number) | null = null;
let pendingBattleResult: BattleResult | null = null;
const BEST_SCORE_KEY = 'battle-run-best-score';

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
  phase: BattleRunPhase;
  stage: number;
  score: number;
  bestScore: number;
  personalBestReached: boolean;
  winStreak: number;
  contractStreak: number;
  scoutPasses: number;
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
  snapshot: BattleSnapshot | null;
  decision: BattleDecision;
  battleLog: string[];
  visualEvents: BattleVisualEvent[];
  error: string | null;
  lastReward: RunRewardSummary | null;
  startRun: () => void;
  chooseStarter: (pokemon: RunPokemon) => void;
  selectRoute: (routeId: RunRouteId) => void;
  chooseUpgrade: (upgradeId: RunUpgradeId) => void;
  chooseMove: (slot: number) => void;
  chooseSwitch: (slot: number) => void;
  chooseReward: (pokemon: RunPokemon) => void;
  rerollDraft: () => void;
  replacePartyMember: (index: number) => void;
  consumeVisualEvent: (id: number) => void;
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
  const finishBattle = (result: BattleResult) => {
    const current = get();
    const rng = random ?? Math.random;
    const fainted = new Set(result.faintedPlayerSpecies);
    const survivingParty = current.party.filter(pokemon => !fainted.has(pokemon.species));

    pendingBattleResult = null;
    if (result.winner !== 'player' || survivingParty.length === 0) {
      set({
        phase: 'game-over',
        party: survivingParty,
        routePreviews: emptyRoutePreviews(),
        decision: emptyDecision,
        visualEvents: [],
        lastReward: null,
        activeChallenge: null,
        activeRoute: null,
      });
      return;
    }

    const reward = calculateBattleReward(
      current.stage,
      current.snapshot?.turn ?? 1,
      current.party.length,
      fainted.size,
      current.activeChallenge,
      current.activeRoute,
      current.upgrades,
      current.contractStreak,
    );
    const survivors = levelUpSurvivors(survivingParty, reward.levelsGained);
    const runComplete = isFinalStage(current.stage);
    const upgradeChoices = !runComplete && isCheckpointStage(current.stage)
      ? createRunUpgradeChoices(current.upgrades, rng)
      : [];
    const needsUpgradeChoice = upgradeChoices.length > 0;
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
      scoutPasses: current.scoutPasses + reward.scoutPassesEarned,
      draftChoices: runComplete || needsUpgradeChoice
        ? []
        : createDraftChoices(current.stage + 1, survivors, rng, false, recruitmentChoiceCount(current.upgrades)),
      upgradeChoices,
      decision: emptyDecision,
      pendingRecruit: null,
      visualEvents: [],
      lastReward: reward,
      activeChallenge: null,
      activeRoute: null,
      routePreviews: emptyRoutePreviews(),
    });
  };

  const beginBattle = (route: RunRoute) => {
    const state = get();
    const rng = random ?? Math.random;
    pendingBattleResult = null;
    const opponentTrainer = state.opponentTrainer ?? pickOpponentTrainer(state.stage, rng);
    const previewedParty = state.routePreviews[route.id];
    const enemyParty = previewedParty.length > 0
      ? previewedParty
      : createEnemyParty(state.stage, state.party, rng, route);
    const activeChallenge = state.activeChallenge
      ?? prepareStageChallenge(state.stage, state.party.length, state.upgrades, rng);
    const bossModifier = getBossModifier(state.stage);

    set({
      phase: 'preparing-battle',
      enemyParty,
      opponentTrainer,
      activeChallenge,
      activeRoute: route,
      snapshot: null,
      decision: emptyDecision,
      battleLog: [
        `${opponentTrainer.title} ${opponentTrainer.name} challenges you!`,
        ...(bossModifier ? [`Boss rule: ${bossModifier.title}. ${bossModifier.description}`] : []),
      ],
      visualEvents: [],
      error: null,
    });

    session?.dispose();
    const battleSession = new ShowdownBattleWorkerSession(state.party, enemyParty, {
      onSnapshot: snapshot => set({ snapshot, phase: 'battle' }),
      onDecision: decision => set({ decision, phase: 'battle', error: null }),
      onLog: message => set(current => ({
        battleLog: [...current.battleLog, message].slice(-12),
      })),
      onVisual: event => set(current => ({
        visualEvents: [...current.visualEvents, event].slice(-40),
      })),
      onError: message => set({ error: message, phase: 'battle' }),
      onEnd: result => {
        if (session === battleSession) session = null;
        pendingBattleResult = result;
        if (get().visualEvents.length === 0) finishBattle(result);
      },
    });
    session = battleSession;
    window.setTimeout(() => {
      if (session === battleSession) battleSession.start();
    }, 900);
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
        draftChoices: [],
        lastReward: null,
        enemyParty: [],
        ...encounter,
        activeRoute: null,
        upgradeChoices: [],
        snapshot: null,
        battleLog: [],
        phase: 'route-select',
      };
    });
  };

  return {
    phase: 'starter-draft',
    stage: 1,
    score: 0,
    bestScore: readBestScore(),
    personalBestReached: false,
    winStreak: 0,
    contractStreak: 0,
    scoutPasses: 0,
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
    snapshot: null,
    decision: emptyDecision,
    battleLog: [],
    visualEvents: [],
    error: null,
    lastReward: null,

    startRun: () => {
      const seed = newSeed();
      const bestScore = Math.max(get().bestScore, readBestScore());
      random = createSeededRandom(seed);
      session?.dispose();
      session = null;
      pendingBattleResult = null;
      set({
        phase: 'starter-draft',
        stage: 1,
        score: 0,
        bestScore,
        personalBestReached: false,
        winStreak: 0,
        contractStreak: 0,
        scoutPasses: 0,
        seed,
        party: [],
        enemyParty: [],
        routePreviews: emptyRoutePreviews(),
        opponentTrainer: null,
        activeChallenge: null,
        activeRoute: null,
        upgrades: [],
        upgradeChoices: [],
        draftChoices: createDraftChoices(1, [], random, true),
        pendingRecruit: null,
        snapshot: null,
        decision: emptyDecision,
        battleLog: [],
        visualEvents: [],
        error: null,
        lastReward: null,
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

    selectRoute: routeId => {
      if (get().phase !== 'route-select') return;
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
      set({
        phase: 'reward-draft',
        upgrades,
        upgradeChoices: [],
        draftChoices: createDraftChoices(
          current.stage + 1,
          current.party,
          random ?? Math.random,
          false,
          recruitmentChoiceCount(upgrades),
        ),
      });
    },

    chooseMove: slot => {
      const decision = get().decision;
      if (!session || !canSubmitMove(decision, slot)) return;
      set({ decision: emptyDecision, error: null });
      session.chooseMove(slot);
    },

    chooseSwitch: slot => {
      const decision = get().decision;
      if (!session || !canSubmitSwitch(decision, slot)) return;
      set({ decision: emptyDecision, error: null });
      session.chooseSwitch(slot);
    },

    chooseReward: pokemon => {
      const { party } = get();
      if (party.length >= PARTY_LIMIT) {
        set({ phase: 'replacement', pendingRecruit: pokemon });
        return;
      }
      advanceStage(addOrReplacePartyMember(party, pokemon));
    },

    rerollDraft: () => {
      const current = get();
      if (current.phase !== 'reward-draft' || current.scoutPasses < 1) return;
      const draftChoices = createRerolledDraftChoices(
        current.stage + 1,
        current.party,
        current.draftChoices,
        random ?? Math.random,
        recruitmentChoiceCount(current.upgrades),
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

    consumeVisualEvent: id => {
      let completedResult: BattleResult | null = null;
      set(current => {
        const visualEvents = current.visualEvents.filter(event => event.id !== id);
        if (visualEvents.length === 0 && pendingBattleResult) completedResult = pendingBattleResult;
        return { visualEvents };
      });
      if (completedResult) finishBattle(completedResult);
    },
  };
});
