import { create } from 'zustand';
import { createDraftChoices, createEnemyParty } from '../services/battle-content.service';
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
  RunPokemon,
} from '../types/battle-run';
import {
  PARTY_LIMIT,
  addOrReplacePartyMember,
  calculateBattleReward,
  createStageChallenge,
  createSeededRandom,
  levelUpSurvivors,
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

interface BattleRunStore {
  phase: BattleRunPhase;
  stage: number;
  score: number;
  winStreak: number;
  seed: string;
  party: RunPokemon[];
  enemyParty: RunPokemon[];
  opponentTrainer: OpponentTrainer | null;
  activeChallenge: RunChallenge | null;
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
  chooseMove: (slot: number) => void;
  chooseSwitch: (slot: number) => void;
  chooseReward: (pokemon: RunPokemon) => void;
  replacePartyMember: (index: number) => void;
  consumeVisualEvent: (id: number) => void;
}

function newSeed(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
        decision: emptyDecision,
        visualEvents: [],
        lastReward: null,
        activeChallenge: null,
      });
      return;
    }

    const reward = calculateBattleReward(
      current.stage,
      current.snapshot?.turn ?? 1,
      current.party.length,
      fainted.size,
      current.activeChallenge,
    );
    const survivors = levelUpSurvivors(survivingParty, reward.levelsGained);

    set({
      phase: 'reward-draft',
      party: survivors,
      score: current.score + reward.totalScore,
      winStreak: current.winStreak + 1,
      draftChoices: createDraftChoices(current.stage + 1, survivors, rng),
      decision: emptyDecision,
      pendingRecruit: null,
      visualEvents: [],
      lastReward: reward,
      activeChallenge: null,
    });
  };

  const beginBattle = () => {
    const state = get();
    const rng = random ?? Math.random;
    pendingBattleResult = null;
    const opponentTrainer = pickOpponentTrainer(state.stage, rng);
    const enemyParty = createEnemyParty(state.stage, state.party, rng);
    const activeChallenge = createStageChallenge(state.stage, state.party.length, rng);

    set({
      phase: 'preparing-battle',
      enemyParty,
      opponentTrainer,
      activeChallenge,
      snapshot: null,
      decision: emptyDecision,
      battleLog: [`${opponentTrainer.title} ${opponentTrainer.name} challenges you!`],
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
    set(current => ({
      stage: current.stage + 1,
      party,
      pendingRecruit: null,
      draftChoices: [],
      lastReward: null,
    }));
    beginBattle();
  };

  return {
    phase: 'starter-draft',
    stage: 1,
    score: 0,
    winStreak: 0,
    seed: '',
    party: [],
    enemyParty: [],
    opponentTrainer: null,
    activeChallenge: null,
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
      random = createSeededRandom(seed);
      session?.dispose();
      session = null;
      pendingBattleResult = null;
      set({
        phase: 'starter-draft',
        stage: 1,
        score: 0,
        winStreak: 0,
        seed,
        party: [],
        enemyParty: [],
        opponentTrainer: null,
        activeChallenge: null,
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
      set({ party: [pokemon], draftChoices: [] });
      beginBattle();
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
