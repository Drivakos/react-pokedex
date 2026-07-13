import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Bot,
  ChevronRight,
  Crown,
  Heart,
  Loader2,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { useBattleRunStore } from '../../store/battleRunStore';
import type { ActiveBattlePokemon, BattleSide, BattleVisualEvent, OpponentTrainer, RunPokemon } from '../../types/battle-run';
import { BattlePokemonImage } from './BattlePokemonImage';
import { MoveBattleEffect } from './MoveBattleEffect';
import { TrainerImage } from './TrainerImage';

const typeClasses: Record<string, string> = {
  Bug: 'bg-lime-600', Dark: 'bg-slate-700', Dragon: 'bg-indigo-600', Electric: 'bg-yellow-500',
  Fairy: 'bg-pink-400', Fighting: 'bg-red-700', Fire: 'bg-orange-500', Flying: 'bg-sky-400',
  Ghost: 'bg-purple-700', Grass: 'bg-green-600', Ground: 'bg-amber-700', Ice: 'bg-cyan-500',
  Normal: 'bg-stone-400', Poison: 'bg-violet-600', Psychic: 'bg-pink-600', Rock: 'bg-yellow-800',
  Steel: 'bg-slate-500', Water: 'bg-blue-600',
};

function TypeBadges({ types, compact = false }: { types: string[]; compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map(type => (
        <span
          key={type}
          className={`${typeClasses[type] ?? 'bg-gray-500'} rounded-full text-xs font-extrabold uppercase tracking-wide text-white ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'}`}
        >
          {type}
        </span>
      ))}
    </div>
  );
}

function StageMeter({ stage }: { stage: number }) {
  const position = ((stage - 1) % 5) + 1;
  return (
    <div className="flex items-center gap-1.5" aria-label={`Stage ${stage}, checkpoint progress ${position} of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className={`h-2 rounded-full transition-all ${index < position ? 'w-7 bg-red-500' : 'w-3 bg-slate-200'}`}
        />
      ))}
    </div>
  );
}

function DraftCard({ pokemon, onChoose, label }: {
  pokemon: RunPokemon;
  onChoose: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChoose}
      className="group overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 text-left shadow-xl transition duration-300 hover:-translate-y-2 hover:border-red-300 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-red-200"
    >
      <div className="relative flex h-52 items-center justify-center overflow-hidden bg-gradient-to-br from-sky-100 via-white to-emerald-100">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-[18px] border-white/50" />
        <div className="absolute bottom-3 h-8 w-40 rounded-[50%] bg-emerald-900/10 blur-sm" />
        <BattlePokemonImage
          id={pokemon.id}
          species={pokemon.species}
          variant="artwork"
          className="relative z-10 h-44 w-44 drop-shadow-xl transition duration-300 group-hover:scale-110"
        />
        <span className="absolute left-4 top-4 rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-black text-white backdrop-blur">
          LV. {pokemon.level}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black text-slate-950">{pokemon.species}</h3>
            <p className="text-sm font-bold text-slate-400">BST {pokemon.bst}</p>
          </div>
          <TypeBadges types={pokemon.types} compact />
        </div>
        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ability</p>
          <p className="mt-0.5 text-sm font-extrabold text-slate-700">{pokemon.ability}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {pokemon.moves.slice(0, 4).map(move => (
              <span key={move} className="rounded-md bg-white px-2 py-1 text-[11px] font-bold text-slate-500 shadow-sm">{move}</span>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition group-hover:bg-red-700">
          {label} <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </div>
      </div>
    </button>
  );
}

function PartyStrip({ party }: { party: RunPokemon[] }) {
  return (
    <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
      {party.map(pokemon => (
        <div key={pokemon.species} className="flex shrink-0 items-center gap-2 rounded-full border border-white bg-white/90 py-1 pl-1 pr-3 shadow-sm backdrop-blur">
          <div className="h-9 w-9 overflow-hidden rounded-full bg-sky-50">
            <BattlePokemonImage id={pokemon.id} species={pokemon.species} variant="icon" className="h-full w-full" />
          </div>
          <span className="text-xs font-black text-slate-700">{pokemon.species} <span className="text-slate-400">L{pokemon.level}</span></span>
        </div>
      ))}
    </div>
  );
}

function TrainerCard({ trainer, stage, compact = false }: {
  trainer: OpponentTrainer;
  stage: number;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-950/80 text-white shadow-xl backdrop-blur ${compact ? 'p-2.5 pr-4' : 'p-4'}`}>
      <TrainerImage src={trainer.image} name={trainer.name} className={compact ? 'h-14 w-14' : 'h-20 w-20'} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-red-300">
          <Bot className="h-3 w-3" /> {trainer.title}
        </div>
        <p className={`${compact ? 'text-lg' : 'text-2xl'} truncate font-black`}>{trainer.name}</p>
        <div className="mt-1 flex gap-1" aria-label={`Difficulty ${Math.min(5, Math.ceil(stage / 2))} of 5`}>
          {Array.from({ length: 5 }, (_, index) => (
            <Zap key={index} className={`h-3 w-3 ${index < Math.min(5, Math.ceil(stage / 2)) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HealthPanel({ pokemon, opponent = false }: {
  pokemon: ActiveBattlePokemon | null;
  opponent?: boolean;
}) {
  const targetHp = pokemon?.hp ?? 0;
  const identity = pokemon?.species ?? 'empty';
  const [displayedHp, setDisplayedHp] = useState(targetHp);
  const displayedHpRef = useRef(targetHp);
  const identityRef = useRef(identity);

  useEffect(() => {
    if (identityRef.current !== identity) {
      identityRef.current = identity;
      displayedHpRef.current = targetHp;
      setDisplayedHp(targetHp);
      return undefined;
    }

    const from = displayedHpRef.current;
    if (from === targetHp) return undefined;
    const startedAt = performance.now();
    const duration = 460;
    let frame = 0;
    const update = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      const value = Math.round(from + (targetHp - from) * eased);
      displayedHpRef.current = value;
      setDisplayedHp(value);
      if (progress < 1) frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [identity, targetHp]);

  if (!pokemon) return <div className="h-24 animate-pulse rounded-2xl bg-white/60" />;
  const percentage = pokemon.maxhp > 0 ? Math.max(0, Math.round((displayedHp / pokemon.maxhp) * 100)) : 0;
  const barColor = percentage > 50 ? 'bg-emerald-500' : percentage > 20 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className={`rounded-2xl border border-white/80 bg-white/95 p-3 shadow-lg sm:p-4 ${opponent ? 'sm:ml-10' : 'sm:mr-10'}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <strong className="truncate text-base text-slate-900 sm:text-lg">{pokemon.species}</strong>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">LV. {pokemon.level}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-slate-400">HP</span>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-300">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
        <span className={pokemon.status ? 'rounded bg-amber-100 px-1.5 py-0.5 text-amber-800' : ''}>{pokemon.status ? pokemon.status.toUpperCase() : 'READY'}</span>
        <span>{displayedHp}/{pokemon.maxhp}</span>
      </div>
    </div>
  );
}

function BattleEffect({ event }: { event: BattleVisualEvent | null }) {
  if (!event) return null;
  const targetPosition = event.target === 'player' ? 'left-[19%]' : 'right-[19%]';

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-live="polite">
      {event.kind === 'move' && (
        <>
          <MoveBattleEffect event={event} />
          <div className="battle-event-label absolute left-1/2 top-[42%] -translate-x-1/2 rounded-lg bg-slate-950/90 px-4 py-2 text-sm font-black text-white shadow-xl">
            {event.label}
          </div>
        </>
      )}
      {(event.kind === 'damage' || event.kind === 'heal') && (
        <div className={`battle-impact absolute top-[48%] h-28 w-28 rounded-full ${targetPosition} ${event.kind === 'heal' ? 'bg-emerald-300/60' : 'bg-white/80'}`}>
          <span className="absolute inset-3 rounded-full border-4 border-white/80" />
        </div>
      )}
      {event.label && event.kind !== 'move' && event.kind !== 'damage' && event.kind !== 'heal' && (
        <div className={`battle-event-label absolute top-[42%] -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-black shadow-xl ${event.target === 'player' || event.actor === 'player' ? 'left-[27%]' : 'left-[73%]'} ${event.tone === 'positive' ? 'bg-emerald-600 text-white' : event.tone === 'negative' ? 'bg-red-600 text-white' : 'bg-slate-950 text-white'}`}>
          {event.label}
        </div>
      )}
    </div>
  );
}

function pokemonMotion(event: BattleVisualEvent | null, side: BattleSide): string {
  if (!event) return '';
  if (event.kind === 'move' && event.actor === side) {
    return side === 'player' ? 'battle-lunge-right' : 'battle-lunge-left';
  }
  if (event.kind === 'damage' && event.target === side) return 'battle-hit';
  if (event.kind === 'heal' && event.target === side) return 'battle-heal';
  if (event.kind === 'faint' && event.target === side) return 'battle-faint';
  if (event.kind === 'switch' && event.actor === side) return 'battle-enter';
  return '';
}

function BattleArena() {
  const snapshot = useBattleRunStore(state => state.snapshot);
  const decision = useBattleRunStore(state => state.decision);
  const battleLog = useBattleRunStore(state => state.battleLog);
  const error = useBattleRunStore(state => state.error);
  const trainer = useBattleRunStore(state => state.opponentTrainer);
  const stage = useBattleRunStore(state => state.stage);
  const visualEvents = useBattleRunStore(state => state.visualEvents);
  const consumeVisualEvent = useBattleRunStore(state => state.consumeVisualEvent);
  const chooseMove = useBattleRunStore(state => state.chooseMove);
  const chooseSwitch = useBattleRunStore(state => state.chooseSwitch);
  const availableSwitches = decision.switches.filter(choice => !choice.active && !choice.fainted);
  const [displaySnapshot, setDisplaySnapshot] = useState(snapshot);
  const [activeVisual, setActiveVisual] = useState<BattleVisualEvent | null>(null);
  const nextVisual = visualEvents[0];
  const controlsLocked = activeVisual !== null || visualEvents.length > 0;

  useEffect(() => {
    if (!nextVisual) return undefined;
    const event = nextVisual;
    setActiveVisual(event);
    setDisplaySnapshot(event.snapshot);
    const duration = event.kind === 'move'
      ? 780
      : event.kind === 'faint'
        ? 720
        : event.kind === 'damage' || event.kind === 'heal'
          ? 540
          : 440;
    const timer = window.setTimeout(() => {
      consumeVisualEvent(event.id);
      setActiveVisual(null);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [consumeVisualEvent, nextVisual]);

  useEffect(() => {
    if (!activeVisual && visualEvents.length === 0) setDisplaySnapshot(snapshot);
  }, [activeVisual, snapshot, visualEvents.length]);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-2xl backdrop-blur">
        <div className="relative min-h-[450px] overflow-hidden bg-gradient-to-b from-sky-300 via-sky-100 to-emerald-300 p-4 sm:p-7">
          <div className="pointer-events-none absolute left-[12%] top-12 h-8 w-28 rounded-full bg-white/70 blur-[1px]" />
          <div className="pointer-events-none absolute right-[20%] top-24 h-5 w-20 rounded-full bg-white/60 blur-[1px]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-emerald-800/30 to-transparent" />
          <div className="pointer-events-none absolute -bottom-12 left-[4%] h-32 w-[46%] rounded-[50%] bg-emerald-900/20 blur-sm" />
          <div className="pointer-events-none absolute bottom-40 right-[5%] h-20 w-[38%] rounded-[50%] bg-emerald-900/20 blur-sm" />

          <div className="relative z-10 grid grid-cols-2 gap-3 sm:gap-6">
            <HealthPanel pokemon={displaySnapshot?.player ?? null} />
            <HealthPanel pokemon={displaySnapshot?.opponent ?? null} opponent />
          </div>

          <div className="relative z-[5] mt-14 grid grid-cols-2 items-end gap-4 sm:mt-10">
            <div className="flex min-h-52 items-end justify-center">
              {displaySnapshot?.player && (
                <div className={`relative h-44 w-full sm:h-52 ${pokemonMotion(activeVisual, 'player')}`}>
                  <BattlePokemonImage id={displaySnapshot.player.id} species={displaySnapshot.player.species} side="p1" className="h-full w-full drop-shadow-2xl" />
                </div>
              )}
            </div>
            <div className="flex min-h-52 items-end justify-center">
              {displaySnapshot?.opponent && (
                <div className={`relative h-44 w-full sm:h-52 ${pokemonMotion(activeVisual, 'opponent')}`}>
                  <BattlePokemonImage id={displaySnapshot.opponent.id} species={displaySnapshot.opponent.species} side="p2" className="h-full w-full drop-shadow-2xl" />
                </div>
              )}
            </div>
          </div>

          <BattleEffect event={activeVisual} />

          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 rounded-full bg-slate-950/80 px-4 py-2 text-[11px] font-black text-white shadow-lg backdrop-blur sm:left-7 sm:text-xs">
            <span>TURN {displaySnapshot?.turn ?? 0}</span>
            <span className="h-4 w-px bg-white/30" />
            <span>YOU {displaySnapshot?.playerRemaining ?? 0}</span>
            <span className="text-red-300">VS</span>
            <span>{displaySnapshot?.opponentRemaining ?? 0} NPC</span>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white p-4 sm:p-6">
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

          {decision.kind === 'move' && !controlsLocked && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Choose your move</p>
                <span className="text-xs font-bold text-slate-400">or switch below</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {decision.moves.map(move => (
                  <button
                    key={move.slot}
                    type="button"
                    disabled={move.disabled || controlsLocked}
                    onClick={() => chooseMove(move.slot)}
                    className="group relative min-h-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-white hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className={`absolute inset-y-0 left-0 w-1.5 ${typeClasses[move.type] ?? 'bg-slate-400'}`} />
                    <span className="flex items-start justify-between gap-3 pl-2">
                      <span>
                        <span className="block font-black text-slate-900">{move.name}</span>
                        <span className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                          <span className={`${typeClasses[move.type] ?? 'bg-slate-400'} rounded px-1.5 py-0.5 text-[9px] uppercase text-white`}>{move.type}</span>
                          {move.category} · {move.power || '—'} power
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-[11px] font-black text-slate-500">
                        {move.pp}/{move.maxpp}<span className="block font-bold text-slate-400">PP</span>
                      </span>
                    </span>
                    <span className="mt-2 block pl-2 text-[10px] font-bold text-slate-400">Accuracy {move.accuracy === true ? '—' : `${move.accuracy}%`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {decision.kind === 'switch' && !controlsLocked && (
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Choose your next Pokémon</p>
              <SwitchChoices choices={availableSwitches} onChoose={chooseSwitch} />
            </div>
          )}

          {(decision.kind === 'wait' || controlsLocked) && (
            <div className="flex min-h-24 items-center justify-center gap-3 text-sm font-black text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-red-500" /> {controlsLocked ? 'Playing battle sequence…' : 'Resolving the turn…'}
            </div>
          )}

          {decision.kind === 'move' && availableSwitches.length > 0 && !controlsLocked && (
            <details className="mt-4 rounded-xl bg-blue-50/70 p-3">
              <summary className="cursor-pointer text-sm font-black text-blue-800">Switch Pokémon instead</summary>
              <div className="mt-3"><SwitchChoices choices={availableSwitches} onChoose={chooseSwitch} /></div>
            </details>
          )}
        </div>
      </section>

      <aside className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl">
        {trainer && (
          <div className="border-b border-white/10 bg-gradient-to-br from-red-600/30 to-transparent p-5">
            <TrainerCard trainer={trainer} stage={stage} />
            <p className="mt-3 text-sm italic leading-relaxed text-slate-300">“{trainer.intro}”</p>
          </div>
        )}
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-red-400" />
              <h2 className="font-black">Battle feed</h2>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> LIVE
            </span>
          </div>
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 text-sm leading-relaxed text-slate-300" aria-live="polite">
            {battleLog.map((message, index) => (
              <div key={`${index}-${message}`} className="flex gap-3 border-b border-white/10 pb-3 last:border-0">
                <span className="mt-0.5 text-[10px] font-black text-slate-600">{String(index + 1).padStart(2, '0')}</span>
                <p>{message}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function SwitchChoices({ choices, onChoose }: {
  choices: Array<{ slot: number; id: number; species: string; condition: string }>;
  onChoose: (slot: number) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {choices.map(choice => (
        <button
          key={choice.slot}
          type="button"
          onClick={() => onChoose(choice.slot)}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50 hover:shadow"
        >
          <BattlePokemonImage id={choice.id} species={choice.species} variant="icon" className="h-12 w-12" />
          <span>
            <strong className="block text-sm text-slate-800">{choice.species}</strong>
            <span className="text-[11px] font-bold text-slate-500">{choice.condition}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function VersusScreen() {
  const trainer = useBattleRunStore(state => state.opponentTrainer);
  const enemyParty = useBattleRunStore(state => state.enemyParty);
  const stage = useBattleRunStore(state => state.stage);
  if (!trainer) return null;

  return (
    <section className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white bg-white/90 shadow-2xl">
      <div className="relative grid items-center overflow-hidden bg-gradient-to-br from-blue-600 via-slate-950 to-red-600 p-7 text-white sm:grid-cols-[1fr_auto_1fr] sm:p-10">
        <div className="text-center">
          <TrainerImage src="/images/trainers/player.png" name="You" className="mx-auto h-32 w-32 drop-shadow-2xl sm:h-40 sm:w-40" />
          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-blue-200">Challenger</p>
          <p className="text-2xl font-black">You</p>
        </div>
        <div className="my-5 text-center sm:mx-8 sm:my-0">
          <div className="rounded-full border-4 border-white bg-slate-950 p-4 text-2xl font-black italic shadow-xl">VS</div>
        </div>
        <div className="text-center">
          <TrainerImage src={trainer.image} name={trainer.name} className="mx-auto h-32 w-32 drop-shadow-2xl sm:h-40 sm:w-40" />
          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-red-200">{trainer.title}</p>
          <p className="text-2xl font-black">{trainer.name}</p>
        </div>
      </div>
      <div className="p-6 text-center sm:p-8">
        <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-600">
          <Swords className="h-4 w-4" /> Stage {stage} encounter
        </div>
        <p className="mt-3 text-lg font-bold italic text-slate-700">“{trainer.intro}”</p>
        <div className="mt-5 flex justify-center gap-2">
          {enemyParty.map(pokemon => (
            <div key={pokemon.species} className="h-14 w-14 rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm" title={pokemon.species}>
              <BattlePokemonImage id={pokemon.id} species={pokemon.species} variant="icon" className="h-full w-full" />
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm font-black text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-red-500" /> Entering the arena…
        </div>
      </div>
    </section>
  );
}

function ReplacementScreen() {
  const party = useBattleRunStore(state => state.party);
  const recruit = useBattleRunStore(state => state.pendingRecruit);
  const replace = useBattleRunStore(state => state.replacePartyMember);
  if (!recruit) return null;

  return (
    <section className="mx-auto max-w-6xl text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><ArrowLeftRight className="h-8 w-8" /></div>
      <h2 className="mt-4 text-3xl font-black text-slate-950">Your party is full</h2>
      <p className="mx-auto mt-2 max-w-xl text-slate-600">Choose a team member for <strong>{recruit.species}</strong> to replace. The replaced Pokémon permanently leaves this run.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {party.map((pokemon, index) => (
          <button
            key={pokemon.species}
            type="button"
            onClick={() => replace(index)}
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-lg transition hover:-translate-y-1 hover:border-red-400 hover:bg-red-50"
          >
            <div className="h-24 w-24 shrink-0 rounded-2xl bg-sky-50 p-1">
              <BattlePokemonImage id={pokemon.id} species={pokemon.species} variant="artwork" className="h-full w-full" />
            </div>
            <span>
              <strong className="block text-lg text-slate-900">{pokemon.species}</strong>
              <span className="text-sm font-semibold text-slate-500">Level {pokemon.level} · BST {pokemon.bst}</span>
              <span className="mt-2 block text-xs font-black text-red-600">REPLACE WITH {recruit.species.toUpperCase()}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function BattleRunGame() {
  const phase = useBattleRunStore(state => state.phase);
  const stage = useBattleRunStore(state => state.stage);
  const party = useBattleRunStore(state => state.party);
  const draftChoices = useBattleRunStore(state => state.draftChoices);
  const seed = useBattleRunStore(state => state.seed);
  const startRun = useBattleRunStore(state => state.startRun);
  const chooseStarter = useBattleRunStore(state => state.chooseStarter);
  const chooseReward = useBattleRunStore(state => state.chooseReward);

  useEffect(() => {
    if (!seed) startRun();
  }, [seed, startRun]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [phase]);

  const isDraft = phase === 'starter-draft' || phase === 'reward-draft';

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-red-50 via-sky-50 to-emerald-50 px-4 py-7 sm:px-6">
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-red-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-64 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />

      <header className="relative mx-auto mb-7 max-w-7xl rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-200">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-600">Roguelite challenge</div>
              <div className="flex items-end gap-3">
                <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Battle Run</h1>
                <span className="mb-1 rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white">STAGE {stage}</span>
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-3 lg:items-end">
            <div className="flex items-center justify-between gap-4 lg:justify-end">
              <StageMeter stage={stage} />
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-500"><Users className="h-4 w-4" /> {party.length}/6</div>
            </div>
            {party.length > 0 && <PartyStrip party={party} />}
          </div>
        </div>
      </header>

      {isDraft && (
        <section className="relative mx-auto max-w-6xl">
          <div className="mb-7 text-center">
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${phase === 'starter-draft' ? 'bg-yellow-100 text-yellow-600' : 'bg-amber-100 text-amber-600'}`}>
              {phase === 'starter-draft' ? <Sparkles className="h-7 w-7" /> : <Crown className="h-7 w-7" />}
            </div>
            <h2 className="mt-4 text-3xl font-black text-slate-950 sm:text-4xl">
              {phase === 'starter-draft' ? 'Choose your first partner' : 'Victory reward'}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-slate-600">
              {phase === 'starter-draft'
                ? 'Pick one of three random Pokémon, then adapt your team after every increasingly difficult battle.'
                : party.length < 6
                  ? 'Your survivors gained two levels and recovered. Add one of these Pokémon to your party.'
                  : 'Your survivors gained two levels. Pick a recruit, then choose which party member it replaces.'}
            </p>
          </div>

          {draftChoices.length === 0 ? (
            <div className="flex items-center justify-center gap-3 py-20 font-bold text-slate-500"><Loader2 className="animate-spin" /> Scouting Pokémon…</div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {draftChoices.map(pokemon => (
                <DraftCard
                  key={pokemon.species}
                  pokemon={pokemon}
                  label={phase === 'starter-draft' ? 'Choose partner' : 'Recruit to party'}
                  onChoose={() => phase === 'starter-draft' ? chooseStarter(pokemon) : chooseReward(pokemon)}
                />
              ))}
            </div>
          )}

          {phase === 'starter-draft' && (
            <div className="mt-7 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl bg-white/70 p-4 text-slate-600"><Swords className="mb-2 h-5 w-5 text-red-500" /><strong className="block text-slate-900">Real battle rules</strong>Types, accuracy, PP, status and switching all matter.</div>
              <div className="rounded-2xl bg-white/70 p-4 text-slate-600"><Crown className="mb-2 h-5 w-5 text-amber-500" /><strong className="block text-slate-900">Grow every stage</strong>Survivors level up and new choices become stronger.</div>
              <div className="rounded-2xl bg-white/70 p-4 text-slate-600"><Heart className="mb-2 h-5 w-5 text-pink-500" /><strong className="block text-slate-900">Faints are permanent</strong>Lose the whole party and the run ends.</div>
            </div>
          )}
        </section>
      )}

      {phase === 'preparing-battle' && <VersusScreen />}
      {phase === 'battle' && <BattleArena />}
      {phase === 'replacement' && <ReplacementScreen />}

      {phase === 'game-over' && (
        <section className="relative mx-auto max-w-xl overflow-hidden rounded-[2rem] border border-white bg-white/90 p-8 text-center shadow-2xl sm:p-12">
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-red-600 via-amber-400 to-blue-600" />
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100"><Shield className="h-10 w-10 text-slate-400" /></div>
          <h2 className="mt-5 text-4xl font-black text-slate-950">Run over</h2>
          <p className="mt-3 text-lg text-slate-600">You reached <strong>stage {stage}</strong>. No usable Pokémon remain.</p>
          <div className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            <Heart className="h-4 w-4" /> Fainted Pokémon do not return during a run.
          </div>
          <button type="button" onClick={startRun} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-black text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-red-700">
            <RotateCcw className="h-5 w-5" /> Start another run
          </button>
        </section>
      )}
    </main>
  );
}
