import { Battle as ClientBattle } from '@pkmn/client';
import { Generations, type PokemonSet } from '@pkmn/data';
import { Protocol } from '@pkmn/protocol';
import { BattleStreams, Dex, RandomPlayerAI, Teams } from '@pkmn/sim';
import { ChoiceBuilder, LogFormatter } from '@pkmn/view';
import type {
  ActiveBattlePokemon,
  BattleResult,
  BattleSnapshot,
  BattleSide,
  BattleVisualEvent,
  RunPokemon,
} from '../types/battle-run';
import type { ShowdownBattleCallbacks } from '../types/battle-worker';
import { isSwitchingBlocked, isTrappedSwitchError } from '../utils/battle-request-rules';

const statTable = (value: number) => ({
  hp: value,
  atk: value,
  def: value,
  spa: value,
  spd: value,
  spe: value,
});

function toPokemonSet(pokemon: RunPokemon): PokemonSet {
  return {
    name: pokemon.species,
    species: pokemon.species,
    item: '',
    ability: pokemon.ability,
    moves: pokemon.moves,
    nature: 'Hardy',
    gender: '',
    evs: statTable(85),
    ivs: statTable(31),
    level: pokemon.level,
  };
}

function toActivePokemon(pokemon: ClientBattle['p1']['active'][number]): ActiveBattlePokemon | null {
  if (!pokemon) return null;
  return {
    id: pokemon.species.num,
    species: pokemon.speciesForme,
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

  constructor(playerParty: RunPokemon[], opponentParty: RunPokemon[], callbacks: ShowdownBattleCallbacks) {
    this.callbacks = callbacks;
    this.playerSets = playerParty.map(toPokemonSet);
    this.opponentSets = opponentParty.map(toPokemonSet);

    const generations = new Generations(Dex as never);
    this.client = new ClientBattle(generations, 'p1' as never, [this.playerSets, this.opponentSets]);
    this.formatter = new LogFormatter('p1' as never, this.client);
    this.streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream({ noCatch: true }));
  }

  start(): void {
    const ai = new RandomPlayerAI(this.streams.p2, { move: 0.9 });
    void ai.start().catch(error => this.fail(error));
    void this.consumePlayerStream();

    const commands = [
      `>start ${JSON.stringify({ formatid: 'gen9customgame' })}`,
      `>player p1 ${JSON.stringify({ name: 'Player', team: Teams.pack(this.playerSets) })}`,
      `>player p2 ${JSON.stringify({ name: 'NPC', team: Teams.pack(this.opponentSets) })}`,
    ].join('\n');

    void Promise.resolve(this.streams.omniscient.write(commands)).catch(error => this.fail(error));
  }

  chooseMove(slot: number): void {
    this.submitChoice(`move ${slot}`);
  }

  chooseSwitch(slot: number): void {
    this.submitChoice(`switch ${slot}`);
  }

  private submitChoice(choice: string): void {
    if (!this.currentRequest || this.ended) return;
    const request = this.currentRequest;
    try {
      const builder = new ChoiceBuilder(request);
      const error = builder.addChoice(choice);
      if (error) throw new Error(error);
      const command = builder.toString();
      this.pendingRequest = this.currentRequest;
      this.currentRequest = null;
      this.callbacks.onDecision({ kind: 'wait', moves: [], switches: [], switchingBlocked: false });
      void Promise.resolve(this.streams.p1.write(command)).catch(errorValue => {
        this.restorePendingRequest();
        this.fail(errorValue);
      });
    } catch (error) {
      this.fail(error);
      if (!this.restorePendingRequest()) this.handleRequest(request);
    }
  }

  private async consumePlayerStream(): Promise<void> {
    try {
      for await (const chunk of this.streams.p1) {
        for (const message of Protocol.parse(chunk)) {
          const { args, kwArgs } = message;
          const formatted = cleanLogMessage(this.formatter.formatText(args, kwArgs));
          if (formatted && args[0] !== 'error') this.callbacks.onLog(formatted);

          this.client.add(args, kwArgs);
          this.emitVisual(args);

          if (args[0] === 'request') {
            this.pendingRequest = null;
            this.handleRequest(Protocol.parseRequest(args[1]));
          } else if (args[0] === 'win') {
            this.finish(args[1] === 'Player' ? 'player' : 'opponent');
          } else if (args[0] === 'tie') {
            this.finish('tie');
          } else if (args[0] === 'error') {
            if (!this.restorePendingRequest(isTrappedSwitchError(args[1]))) this.callbacks.onError(args[1]);
          }
        }
        this.emitSnapshot();
      }
    } catch (error) {
      this.fail(error);
    }
  }

  private handleRequest(request: Protocol.Request, switchingBlockedOverride = false): void {
    if (request.requestType === 'team') {
      void Promise.resolve(this.streams.p1.write('default')).catch(error => this.fail(error));
      return;
    }

    this.currentRequest = request;
    if (request.requestType === 'move') {
      const active = request.active[0];
      const switchingBlocked = switchingBlockedOverride || isSwitchingBlocked(active);
      const moves = (active?.moves ?? []).map((move, index) => {
        const moveData = Dex.moves.get(move.id);
        return {
          slot: index + 1,
          name: move.name,
          type: moveData.type,
          category: moveData.category,
          power: moveData.basePower,
          accuracy: moveData.accuracy,
          pp: 'pp' in move ? move.pp : 0,
          maxpp: 'maxpp' in move ? move.maxpp : 0,
          disabled: 'disabled' in move ? Boolean(move.disabled) : false,
        };
      });

      this.callbacks.onDecision({
        kind: 'move',
        moves,
        switches: switchingBlocked ? [] : this.getSwitches(request.side.pokemon),
        switchingBlocked,
      });
      return;
    }

    if (request.requestType === 'switch') {
      this.callbacks.onDecision({
        kind: 'switch',
        moves: [],
        switches: this.getSwitches(request.side.pokemon),
        switchingBlocked: false,
      });
      return;
    }

    this.callbacks.onDecision({ kind: 'wait', moves: [], switches: [], switchingBlocked: false });
  }

  private restorePendingRequest(switchingBlockedOverride = false): boolean {
    if (!this.pendingRequest || this.ended) return false;
    const request = this.pendingRequest;
    this.pendingRequest = null;
    this.handleRequest(request, switchingBlockedOverride);
    return true;
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
    return {
      turn: this.client.turn,
      player: toActivePokemon(this.client.p1.active[0]),
      opponent: toActivePokemon(this.client.p2.active[0]),
      playerRemaining: this.client.p1.team.filter(pokemon => !pokemon.fainted).length,
      opponentRemaining: this.client.p2.team.filter(pokemon => !pokemon.fainted).length,
    };
  }

  private getSide(ident: string | undefined): BattleSide | undefined {
    if (ident?.startsWith('p1')) return 'player';
    if (ident?.startsWith('p2')) return 'opponent';
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
      faintedPlayerSpecies: this.client.p1.team
        .filter(pokemon => pokemon.fainted)
        .map(pokemon => pokemon.speciesForme),
    });
  }

  private fail(error: unknown): void {
    const message = error instanceof Error ? error.message : 'The battle simulator stopped unexpectedly.';
    this.callbacks.onError(message);
  }
}
