import { Battle as ClientBattle } from '@pkmn/client';
import { Generations, type PokemonSet } from '@pkmn/data';
import { Protocol } from '@pkmn/protocol';
import { BattleStreams, Dex, Teams, type PRNGSeed } from '@pkmn/sim';
import { ChoiceBuilder, LogFormatter } from '@pkmn/view';
import type {
  ActiveBattlePokemon,
  BattleResult,
  BattleSnapshot,
  BattleSide,
  BattleVisualEvent,
  RunDifficulty,
  RunPokemon,
} from '../types/battle-run';
import type { ShowdownBattleCallbacks } from '../types/battle-worker';
import { toPokemonSet } from '../utils/battle-pokemon-set';
import {
  isForcedMoveRequest,
  isSwitchingBlocked,
  isTrappedSwitchError,
} from '../utils/battle-request-rules';
import { calculateMoveEffectiveness } from '../utils/battle-move-effectiveness';
import { ChallengePlayerAI } from './challenge-player-ai';

export interface BattleSimulationSeeds {
  battle: PRNGSeed;
  opponentAi: PRNGSeed;
}

export interface ShowdownBattleSessionOptions {
  playerSide?: 'p1' | 'p2';
  opponentMode?: 'ai' | 'manual';
  playerName?: string;
  opponentName?: string;
  emitPendingDecision?: boolean;
  onOpponentRequest?: (requestId: number) => void;
}

function safeClientPokemonTypes(pokemon: ClientBattle['p1']['active'][number]): string[] {
  if (!pokemon) return [];
  const species = Dex.species.get(pokemon.speciesForme);
  let types = species.types;
  try {
    if (pokemon.types?.length) types = pokemon.types;
  } catch {
    // @pkmn/client can briefly expose an active shell without a resolved species
    // during a faint/switch batch. The canonical species typing is safe until the
    // next protocol message completes that transition.
  }
  return [...types];
}

function toActivePokemon(pokemon: ClientBattle['p1']['active'][number]): ActiveBattlePokemon | null {
  if (!pokemon) return null;
  const species = Dex.species.get(pokemon.speciesForme);
  return {
    id: species.num,
    species: pokemon.speciesForme,
    types: safeClientPokemonTypes(pokemon),
    level: pokemon.level,
    hp: pokemon.hp,
    maxhp: pokemon.maxhp,
    status: pokemon.status,
    fainted: pokemon.fainted,
  };
}

function cleanLogMessage(message: string): string {
  return message
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\|\|/g, ' ')
    .replace(/^==\s*(.*?)\s*==$/gm, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isRecoverableClientProjectionError(error: unknown): boolean {
  if (!(error instanceof TypeError)) return false;
  return (
    error.message.includes("reading 'abilities'")
    && (error.stack ?? '').includes('getPressurePP')
  );
}

export class ShowdownBattleSession {
  private readonly callbacks: ShowdownBattleCallbacks;
  private readonly playerSets: PokemonSet[];
  private readonly opponentSets: PokemonSet[];
  private readonly client: ClientBattle;
  private readonly formatter: LogFormatter;
  private readonly streams: ReturnType<typeof BattleStreams.getPlayerStreams>;
  private currentRequest: Protocol.Request | null = null;
  private pendingRequest: Protocol.Request | null = null;
  private ended = false;
  private visualId = 0;
  private readonly stage: number;
  private readonly difficulty: RunDifficulty;
  private readonly simulationSeeds?: BattleSimulationSeeds;
  private readonly playerSide: 'p1' | 'p2';
  private readonly opponentMode: 'ai' | 'manual';
  private readonly playerName: string;
  private readonly opponentName: string;
  private readonly emitPendingDecision: boolean;
  private readonly onOpponentRequest?: (requestId: number) => void;
  private manualRequestIndex = 0;
  private manualOpenRequestId: number | null = null;

  constructor(
    playerParty: RunPokemon[],
    opponentParty: RunPokemon[],
    callbacks: ShowdownBattleCallbacks,
    stage = 1,
    difficulty: RunDifficulty = 'medium',
    simulationSeeds?: BattleSimulationSeeds,
    options: ShowdownBattleSessionOptions = {},
  ) {
    this.callbacks = callbacks;
    this.stage = stage;
    this.difficulty = difficulty;
    this.simulationSeeds = simulationSeeds;
    this.playerSide = options.playerSide ?? 'p1';
    this.opponentMode = options.opponentMode ?? 'ai';
    this.playerName = options.playerName ?? 'Player';
    this.opponentName = options.opponentName ?? 'NPC';
    this.emitPendingDecision = options.emitPendingDecision ?? true;
    this.onOpponentRequest = options.onOpponentRequest;
    this.playerSets = playerParty.map(toPokemonSet);
    this.opponentSets = opponentParty.map(toPokemonSet);

    const generations = new Generations(Dex as never);
    const canonicalTeams = this.playerSide === 'p1'
      ? [this.playerSets, this.opponentSets]
      : [this.opponentSets, this.playerSets];
    this.client = new ClientBattle(generations, this.playerSide as never, canonicalTeams);
    this.formatter = new LogFormatter(this.playerSide as never, this.client);
    this.streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream({ noCatch: true }));
  }

  start(): void {
    if (this.opponentMode === 'ai') {
      const ai = new ChallengePlayerAI(
        this.streams.p2,
        this.stage,
        this.difficulty,
        this.simulationSeeds?.opponentAi,
      );
      void ai.start().catch(error => this.fail(error));
    } else {
      void this.consumeRemoteStream();
    }
    void this.consumePlayerStream();

    const p1Sets = this.playerSide === 'p1' ? this.playerSets : this.opponentSets;
    const p2Sets = this.playerSide === 'p1' ? this.opponentSets : this.playerSets;
    const p1Name = this.playerSide === 'p1' ? this.playerName : this.opponentName;
    const p2Name = this.playerSide === 'p1' ? this.opponentName : this.playerName;

    const commands = [
      `>start ${JSON.stringify({
        formatid: 'gen9customgame',
        ...(this.simulationSeeds ? { seed: this.simulationSeeds.battle } : {}),
      })}`,
      `>player p1 ${JSON.stringify({ name: p1Name, team: Teams.pack(p1Sets) })}`,
      `>player p2 ${JSON.stringify({ name: p2Name, team: Teams.pack(p2Sets) })}`,
    ].join('\n');

    void Promise.resolve(this.streams.omniscient.write(commands)).catch(error => this.fail(error));
  }

  chooseMove(slot: number): void {
    this.submitChoice(`move ${slot}`);
  }

  chooseSwitch(slot: number): void {
    this.submitChoice(`switch ${slot}`);
  }

  dispose(): void {
    if (this.ended) return;
    this.ended = true;
    void Promise.resolve(this.streams.omniscient.writeEnd()).catch(() => undefined);
  }

  submitSynchronizedChoices(p1Choice: string, p2Choice: string): void {
    if (this.ended || this.opponentMode !== 'manual') return;
    const localChoice = this.playerSide === 'p1' ? p1Choice : p2Choice;
    const request = this.currentRequest;

    try {
      if (!request && localChoice !== 'default') return;
      const localCommand = request ? this.buildChoice(request, localChoice) : 'default';
      this.pendingRequest = request;
      this.currentRequest = null;
      const p1Command = this.playerSide === 'p1' ? localCommand : p1Choice;
      const p2Command = this.playerSide === 'p2' ? localCommand : p2Choice;
      this.manualOpenRequestId = null;
      void Promise.resolve(this.streams.p1.write(p1Command)).catch(error => this.fail(error));
      void Promise.resolve(this.streams.p2.write(p2Command)).catch(error => this.fail(error));
    } catch (error) {
      this.fail(error, false);
      if (request && !this.restorePendingRequest()) this.handleRequest(request);
    }
  }

  private buildChoice(request: Protocol.Request, choice: string): string {
    if (choice === 'default') return 'default';
    const builder = new ChoiceBuilder(request);
    const error = builder.addChoice(choice);
    if (error) throw new Error(error);
    return builder.toString();
  }

  private submitChoice(choice: string): void {
    if (!this.currentRequest || this.ended) return;
    const request = this.currentRequest;
    try {
      const command = this.buildChoice(request, choice);
      this.pendingRequest = this.currentRequest;
      this.currentRequest = null;
      if (this.emitPendingDecision) {
        this.callbacks.onDecision({ kind: 'wait', moves: [], switches: [], switchingBlocked: false });
      }
      const localStream = this.playerSide === 'p1' ? this.streams.p1 : this.streams.p2;
      void Promise.resolve(localStream.write(command)).catch(errorValue => {
        this.restorePendingRequest();
        this.fail(errorValue, false);
      });
    } catch (error) {
      this.fail(error, false);
      if (!this.restorePendingRequest()) this.handleRequest(request);
    }
  }

  private async consumePlayerStream(): Promise<void> {
    const localStream = this.playerSide === 'p1' ? this.streams.p1 : this.streams.p2;
    try {
      for await (const chunk of localStream) {
        this.callbacks.onProtocol?.(this.playerSide === 'p2' ? this.swapProtocolSides(chunk) : chunk);
        for (const message of Protocol.parse(chunk)) {
          const { args, kwArgs } = message;
          const formatted = cleanLogMessage(this.formatter.formatText(args, kwArgs));
          if (formatted && args[0] !== 'error') this.callbacks.onLog(formatted);

          try {
            this.client.add(args, kwArgs);
          } catch (error) {
            if (!isRecoverableClientProjectionError(error)) throw error;
            this.callbacks.onError(
              'The battle display skipped a transient form update and recovered.',
              false,
              error,
            );
          }
          this.emitVisual(args);

          if (args[0] === 'request') {
            this.pendingRequest = null;
            this.handleRequest(Protocol.parseRequest(args[1]));
          } else if (args[0] === 'win') {
            this.finish(args[1] === this.playerName ? 'player' : 'opponent');
          } else if (args[0] === 'tie') {
            this.finish('tie');
          } else if (args[0] === 'error') {
            if (!this.restorePendingRequest(isTrappedSwitchError(args[1]))) this.callbacks.onError(args[1], false);
          }
        }
        this.emitSnapshot();
      }
    } catch (error) {
      this.fail(error);
    }
  }

  private async consumeRemoteStream(): Promise<void> {
    const remoteStream = this.playerSide === 'p1' ? this.streams.p2 : this.streams.p1;
    try {
      for await (const chunk of remoteStream) {
        // Drain the remote POV stream. Team preview is deliberately automatic on
        // both sides; later requests are fulfilled by synchronized choice pairs.
        for (const message of Protocol.parse(chunk)) {
          if (message.args[0] !== 'request') continue;
          const request = Protocol.parseRequest(message.args[1]);
          if (request.requestType === 'team') {
            void Promise.resolve(remoteStream.write('default')).catch(error => this.fail(error));
          } else {
            this.onOpponentRequest?.(this.getManualRequestId());
          }
        }
      }
    } catch (error) {
      this.fail(error);
    }
  }

  private swapProtocolSides(chunk: string): string {
    return chunk
      .replace(/p1/g, '__VS_P1__')
      .replace(/p2/g, 'p1')
      .replace(/__VS_P1__/g, 'p2');
  }

  private handleRequest(request: Protocol.Request, switchingBlockedOverride = false): void {
    if (request.requestType === 'team') {
      const localStream = this.playerSide === 'p1' ? this.streams.p1 : this.streams.p2;
      void Promise.resolve(localStream.write('default')).catch(error => this.fail(error));
      return;
    }

    this.currentRequest = request;
    const requestId = this.opponentMode === 'manual' ? this.getManualRequestId() : undefined;
    if (request.requestType === 'move') {
      const active = request.active[0];
      if (isForcedMoveRequest(active)) {
        if (this.opponentMode === 'manual') {
          this.callbacks.onDecision({
            requestId,
            kind: 'wait',
            moves: [],
            switches: [],
            switchingBlocked: true,
          });
        } else {
          this.submitChoice('default');
        }
        return;
      }

      const switchingBlocked = switchingBlockedOverride || isSwitchingBlocked(active);
      const opponent = this.playerSide === 'p1' ? this.client.p2 : this.client.p1;
      const opponentTypes = safeClientPokemonTypes(opponent.active[0]);
      const moves = (active?.moves ?? []).map((move, index) => {
        const moveData = Dex.moves.get(move.id);
        return {
          slot: index + 1,
          name: move.name,
          type: moveData.type,
          category: moveData.category,
          description: moveData.shortDesc || moveData.desc,
          power: moveData.basePower,
          accuracy: moveData.accuracy,
          priority: moveData.priority,
          pp: 'pp' in move ? move.pp : 0,
          maxpp: 'maxpp' in move ? move.maxpp : 0,
          disabled: 'disabled' in move ? Boolean(move.disabled) : false,
          effectiveness: calculateMoveEffectiveness(moveData.type, moveData.category, opponentTypes),
        };
      });

      this.callbacks.onDecision({
        requestId,
        kind: 'move',
        moves,
        switches: switchingBlocked ? [] : this.getSwitches(request.side.pokemon),
        switchingBlocked,
      });
      return;
    }

    if (request.requestType === 'switch') {
      this.callbacks.onDecision({
        requestId,
        kind: 'switch',
        moves: [],
        switches: this.getSwitches(request.side.pokemon),
        switchingBlocked: false,
      });
      return;
    }

    this.callbacks.onDecision({ requestId, kind: 'wait', moves: [], switches: [], switchingBlocked: false });
  }

  private restorePendingRequest(switchingBlockedOverride = false): boolean {
    if (!this.pendingRequest || this.ended) return false;
    const request = this.pendingRequest;
    this.pendingRequest = null;
    this.handleRequest(request, switchingBlockedOverride);
    return true;
  }

  private getManualRequestId(): number {
    if (this.manualOpenRequestId === null) {
      this.manualOpenRequestId = ++this.manualRequestIndex;
    }
    return this.manualOpenRequestId;
  }

  private getSwitches(pokemon: Protocol.Request.Pokemon[]) {
    return pokemon.map((entry, index) => {
      const species = entry.details.split(',')[0];
      return {
        slot: index + 1,
        id: Dex.species.get(species).num,
        species,
        condition: entry.condition,
        active: Boolean(entry.active),
        fainted: entry.condition.endsWith(' fnt'),
      };
    });
  }

  private emitSnapshot(): void {
    if (this.ended) return;
    this.callbacks.onSnapshot(this.getSnapshot());
  }

  private getSnapshot(): BattleSnapshot {
    const player = this.playerSide === 'p1' ? this.client.p1 : this.client.p2;
    const opponent = this.playerSide === 'p1' ? this.client.p2 : this.client.p1;
    return {
      turn: this.client.turn,
      player: toActivePokemon(player.active[0]),
      opponent: toActivePokemon(opponent.active[0]),
      playerRemaining: player.team.filter(pokemon => !pokemon.fainted).length,
      opponentRemaining: opponent.team.filter(pokemon => !pokemon.fainted).length,
    };
  }

  private getSide(ident: string | undefined): BattleSide | undefined {
    if (ident?.startsWith(this.playerSide)) return 'player';
    if (ident?.startsWith(this.playerSide === 'p1' ? 'p2' : 'p1')) return 'opponent';
    return undefined;
  }

  private emitVisual(args: Protocol.Args): void {
    let event: Omit<BattleVisualEvent, 'id' | 'snapshot'> | null = null;

    switch (args[0]) {
      case 'move': {
        const move = Dex.moves.get(args[2]);
        event = {
          kind: 'move',
          actor: this.getSide(args[1]),
          target: this.getSide(args[3]),
          label: args[2],
          moveType: move.type,
          moveCategory: move.category,
        };
        break;
      }
      case '-damage':
        event = { kind: 'damage', target: this.getSide(args[1]) };
        break;
      case '-heal':
        event = { kind: 'heal', target: this.getSide(args[1]), tone: 'positive' };
        break;
      case '-miss':
        event = { kind: 'miss', actor: this.getSide(args[1]), label: 'Missed' };
        break;
      case 'faint':
        event = { kind: 'faint', target: this.getSide(args[1]), label: 'Fainted', tone: 'negative' };
        break;
      case 'switch':
      case 'drag':
      case 'replace':
        event = { kind: 'switch', actor: this.getSide(args[1]) };
        break;
      case '-status':
        event = { kind: 'status', target: this.getSide(args[1]), label: args[2].toUpperCase(), tone: 'negative' };
        break;
      case '-boost':
        event = { kind: 'status', target: this.getSide(args[1]), label: `${args[2].toUpperCase()} rose`, tone: 'positive' };
        break;
      case '-unboost':
        event = { kind: 'status', target: this.getSide(args[1]), label: `${args[2].toUpperCase()} fell`, tone: 'negative' };
        break;
      case '-immune':
        event = { kind: 'effectiveness', target: this.getSide(args[1]), label: 'No effect', tone: 'neutral' };
        break;
      case 'cant':
        event = { kind: 'status', target: this.getSide(args[1]), label: 'Unable to move', tone: 'negative' };
        break;
      case '-supereffective':
        event = { kind: 'effectiveness', target: this.getSide(args[1]), label: 'Super effective', tone: 'positive' };
        break;
      case '-resisted':
        event = { kind: 'effectiveness', target: this.getSide(args[1]), label: 'Not very effective', tone: 'neutral' };
        break;
      case '-crit':
        event = { kind: 'effectiveness', target: this.getSide(args[1]), label: 'Critical hit', tone: 'positive' };
        break;
      default:
        break;
    }

    if (!event) return;
    this.callbacks.onVisual({
      ...event,
      id: ++this.visualId,
      snapshot: this.getSnapshot(),
    });
  }

  private finish(winner: BattleResult['winner']): void {
    if (this.ended) return;
    this.ended = true;
    this.callbacks.onEnd({
      winner,
      faintedPlayerSpecies: (this.playerSide === 'p1' ? this.client.p1 : this.client.p2).team
        .filter(pokemon => pokemon.fainted)
        .map(pokemon => pokemon.speciesForme),
    });
  }

  private fail(error: unknown, fatal = true): void {
    const message = error instanceof Error ? error.message : 'The battle simulator stopped unexpectedly.';
    if (fatal) this.ended = true;
    this.callbacks.onError(message, fatal, error);
  }
}
