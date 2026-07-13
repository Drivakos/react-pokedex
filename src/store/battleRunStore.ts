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
  RunPokemon,
} from '../types/battle-run';
import {
  PARTY_LIMIT,
  addOrReplacePartyMember,
  createSeededRandom,
  levelUpSurvivors,
} from '../utils/battle-run-rules';

const emptyDecision: BattleDecision = { kind: 'wait', moves: [], switches: [] };
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
  seed: string;
  party: RunPokemon[];
  enemyParty: RunPokemon[];
  opponentTrainer: OpponentTrainer | null;
  draftChoices: RunPokemon[];
  pendingRecruit: RunPokemon | null;
  snapshot: BattleSnapshot | null;
  decision: BattleDecision;
  battleLog: string[];
  visualEvents: BattleVisualEvent[];
  error: string | null;
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
    const survivors = levelUpSurvivors(
      current.party.filter(pokemon => !fainted.has(pokemon.species)),
    );

    pendingBattleResult = null;
    if (result.winner !== 'player' || survivors.length === 0) {
      set({
        phase: 'game-over',
        party: survivors,
        decision: emptyDecision,
        visualEvents: [],
      });
      return;
    }

    set({
      phase: 'reward-draft',
      party: survivors,
      draftChoices: createDraftChoices(current.stage + 1, survivors, rng),
      decision: emptyDecision,
      pendingRecruit: null,
      visualEvents: [],
    });
  };

  const beginBattle = () => {
    const state = get();
    const rng = random ?? Math.random;
    pendingBattleResult = null;
    const opponentTrainer = pickOpponentTrainer(state.stage, rng);
    const enemyParty = createEnemyParty(state.stage, state.party, rng);

    set({
      phase: 'preparing-battle',
      enemyParty,
      opponentTrainer,
      snapshot: null,
      decision: emptyDecision,
      battleLog: [`${opponentTrainer.title} ${opponentTrainer.name} challenges you!`],
      visualEvents: [],
      error: null,
    });

    session?.dispose();
    const battleSession = new ShowdownBattleWorkerSession(state.party, enemyParty, {
      onSnapshot: snapshot => set({ snapshot, phase: 'battle' }),
      onDecision: decision => set({ decision, phase: 'battle' }),
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
    }));
    beginBattle();
  };

  return {
    phase: 'starter-draft',
    stage: 1,
    seed: '',
    party: [],
    enemyParty: [],
    opponentTrainer: null,
    draftChoices: [],
    pendingRecruit: null,
    snapshot: null,
    decision: emptyDecision,
    battleLog: [],
    visualEvents: [],
    error: null,

    startRun: () => {
      const seed = newSeed();
      random = createSeededRandom(seed);
      session?.dispose();
      session = null;
      pendingBattleResult = null;
      set({
        phase: 'starter-draft',
        stage: 1,
        seed,
        party: [],
        enemyParty: [],
        opponentTrainer: null,
        draftChoices: createDraftChoices(1, [], random, true),
        pendingRecruit: null,
        snapshot: null,
        decision: emptyDecision,
        battleLog: [],
        visualEvents: [],
        error: null,
      });
    },

    chooseStarter: pokemon => {
      set({ party: [pokemon], draftChoices: [] });
      beginBattle();
    },

    chooseMove: slot => {
      session?.chooseMove(slot);
    },

    chooseSwitch: slot => {
      session?.chooseSwitch(slot);
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
