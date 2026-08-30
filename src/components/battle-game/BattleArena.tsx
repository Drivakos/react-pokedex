import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Bot, ChevronRight, Compass, Info, Loader2, LockKeyhole, ShieldCheck, Swords, Target, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useBattleRunStore } from '../../store/battleRunStore';
import { useBattleEngineStore } from '../../store/battleEngineStore';
import type { ActiveBattlePokemon, BattleSide, BattleVisualEvent } from '../../types/battle-run';
import { getBossModifier, getContractChainMultiplier, getStageChallengeProgress } from '../../utils/battle-run-rules';
import { getBattleAiProfile } from '../../utils/battle-ai-profile';
import { BattlePokemonImage } from './BattlePokemonImage';
import { BattleConclusionBanner } from './BattleConclusionBanner';
import { MoveBattleEffect } from './MoveBattleEffect';
import { ShowdownStage } from './ShowdownStage';
import { isShowdownMuted, setShowdownMuted } from './showdown-client';
import { getRunArenaTheme } from './arena-themes';
import { TrainerImage } from './TrainerImage';
import { ChallengeCard, MoveCategoryBadge, MoveDetails, TrainerCard, TypeBadges } from './BattleRunShared';
import { getEffectivenessPresentation, typeClasses } from './battle-run-presentation';

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

function sameActivePokemon(previous: ActiveBattlePokemon | null, next: ActiveBattlePokemon | null): boolean {
  if (previous === next) return true;
  if (!previous || !next) return false;
  return previous.id === next.id
    && previous.species === next.species
    && previous.types.length === next.types.length
    && previous.types.every((type, index) => type === next.types[index])
    && previous.level === next.level
    && previous.hp === next.hp
    && previous.maxhp === next.maxhp
    && previous.status === next.status
    && previous.fainted === next.fainted;
}

const HealthPanel = memo(function HealthPanel({ pokemon, opponent = false }: {
  pokemon: ActiveBattlePokemon | null;
  opponent?: boolean;
}) {
  if (!pokemon) return <div className="h-16 animate-pulse rounded-xl bg-white/60" />;
  const percentage = pokemon.maxhp > 0 ? Math.max(0, Math.round((pokemon.hp / pokemon.maxhp) * 100)) : 0;
  const barColor = percentage > 50 ? 'bg-emerald-500' : percentage > 20 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className={`rounded-xl border bg-white/95 p-2 shadow-lg backdrop-blur-sm ${opponent ? 'border-red-200/80' : 'border-blue-200/80'}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1">
          <span className={`hidden text-[8px] font-black uppercase tracking-[0.16em] sm:block ${opponent ? 'text-red-500' : 'text-blue-500'}`}>
            {opponent ? 'Opponent' : 'Active'}
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-1">
            <strong className="min-w-0 truncate text-sm text-slate-900">{pokemon.species}</strong>
            <TypeBadges types={pokemon.types} compact />
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-black text-slate-600">LV. {pokemon.level}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-black text-slate-400">HP</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-300">
          <div
            className={`battle-health-fill h-full w-full origin-left rounded-full ${barColor}`}
            style={{ transform: `scaleX(${percentage / 100})` }}
          />
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-[8px] font-bold text-slate-500">
        <span className={pokemon.status ? 'rounded bg-amber-100 px-1.5 py-0.5 text-amber-800' : ''}>{pokemon.status ? pokemon.status.toUpperCase() : 'READY'}</span>
        <span>{pokemon.hp}/{pokemon.maxhp}</span>
      </div>
    </div>
  );
}, (previous, next) => previous.opponent === next.opponent && sameActivePokemon(previous.pokemon, next.pokemon));

function BattleEffect({ event }: { event: BattleVisualEvent | null }) {
  if (!event) return null;
  const targetPosition = event.target === 'player' ? 'left-[19%]' : 'right-[19%]';

  return (
    <div className="battle-effects-layer pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-live="polite">
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
      {event.label && event.kind !== 'move' && (
        <div className={`battle-event-label absolute top-[42%] -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-black shadow-xl ${event.kind === 'damage' || event.kind === 'heal' ? 'battle-event-label-fast' : ''} ${event.target === 'player' || event.actor === 'player' ? 'left-[27%]' : 'left-[73%]'} ${event.tone === 'positive' ? 'bg-emerald-600 text-white' : event.tone === 'negative' ? 'bg-red-600 text-white' : 'bg-slate-950 text-white'}`}>
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

const BattleLogPanel = memo(function BattleLogPanel() {
  const battleLog = useBattleEngineStore(state => state.battleLog);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
  }, [battleLog.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-red-600" />
          <h2 className="font-black text-slate-950">Battle feed</h2>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE
        </span>
      </div>
      <div ref={logRef} className="max-h-[420px] min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 text-sm leading-relaxed text-slate-600 xl:max-h-none" aria-live="polite">
        {battleLog.map((message, index) => (
          <div
            key={`${index}-${message}`}
            className={`flex gap-3 rounded-lg border-b border-slate-200/80 px-1 py-2 transition-colors last:border-0 ${index === battleLog.length - 1 ? 'bg-white/70 text-slate-900' : ''}`}
          >
            <span className="mt-0.5 text-[10px] font-black text-slate-400">{String(index + 1).padStart(2, '0')}</span>
            <p>{message}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

const BattleSidebar = memo(function BattleSidebar() {
  const trainer = useBattleRunStore(state => state.opponentTrainer);
  const stage = useBattleRunStore(state => state.stage);
  const activeChallenge = useBattleRunStore(state => state.activeChallenge);
  const activeRoute = useBattleRunStore(state => state.activeRoute);
  const contractStreak = useBattleRunStore(state => state.contractStreak);
  const snapshot = useBattleEngineStore(state => state.snapshot);
  const partySize = useBattleRunStore(state => state.party.length);
  const challengeProgress = activeChallenge && snapshot
    ? getStageChallengeProgress(activeChallenge, snapshot.turn, partySize, snapshot.playerRemaining)
    : null;
  const bossModifier = getBossModifier(stage);
  const aiProfile = getBattleAiProfile(stage, activeRoute?.difficulty);

  return (
    <aside className="hidden h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/75 text-slate-900 shadow-xl backdrop-blur-xl xl:flex">
      {trainer && (
        <div className="shrink-0 border-b border-slate-200/80 bg-gradient-to-br from-red-50 via-white/80 to-sky-50 p-5">
          <TrainerCard trainer={trainer} stage={stage} />
          <p className="mt-3 text-sm italic leading-relaxed text-slate-600">“{trainer.intro}”</p>
          {activeRoute && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-black text-slate-600">
              <span className="flex items-center gap-1.5"><Compass className="h-3.5 w-3.5" /> {activeRoute.title}</span>
              <span className="text-red-600">Score x{activeRoute.scoreMultiplier}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs text-indigo-950">
            <span className="flex items-center gap-1.5 font-black"><Bot className="h-3.5 w-3.5" /> {aiProfile.title}</span>
            <span className="font-bold text-indigo-600">{aiProfile.label}</span>
          </div>
          {bossModifier && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              <span className="flex items-center gap-1.5 font-black"><ShieldCheck className="h-3.5 w-3.5" /> {bossModifier.title}</span>
              <span className="font-bold text-amber-700">{bossModifier.item}</span>
            </div>
          )}
        </div>
      )}
      {activeChallenge && (
        <div className="shrink-0 border-b border-slate-200/80 bg-white/55 p-3">
          <ChallengeCard
            challenge={activeChallenge}
            compact
            progress={challengeProgress}
            chainMultiplier={getContractChainMultiplier(contractStreak)}
          />
        </div>
      )}
      <BattleLogPanel />
    </aside>
  );
});

function MobileBattleSummary() {
  const trainer = useBattleRunStore(state => state.opponentTrainer);
  const activeChallenge = useBattleRunStore(state => state.activeChallenge);
  const activeRoute = useBattleRunStore(state => state.activeRoute);
  const battleLog = useBattleEngineStore(state => state.battleLog);
  const stage = useBattleRunStore(state => state.stage);

  if (!trainer) return null;
  const recentLog = battleLog.slice(-6);

  return (
    <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2.5">
          <TrainerImage src={trainer.image} name={trainer.name} className="h-10 w-10 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-slate-900">{trainer.name}</span>
            <span className="block truncate text-[10px] font-bold text-slate-500">
              {activeRoute?.title ?? `Stage ${stage}`} · Battle details
            </span>
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs font-black text-slate-500">
          View <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
        </span>
      </summary>
      <div className="border-t border-slate-200 bg-slate-50 p-3">
        {activeChallenge && <ChallengeCard challenge={activeChallenge} compact />}
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-black text-slate-900"><Swords className="h-3.5 w-3.5 text-red-600" /> Recent turns</span>
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Live</span>
          </div>
          <div className="space-y-1.5 text-xs leading-relaxed text-slate-600" aria-live="polite">
            {recentLog.map((message, index) => (
              <p key={`${battleLog.length - recentLog.length + index}-${message}`} className="border-t border-slate-100 pt-1.5 first:border-0 first:pt-0">{message}</p>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}

export function BattleArena() {
  const { profile, user } = useAuth();
  const snapshot = useBattleEngineStore(state => state.snapshot);
  const stage = useBattleRunStore(state => state.stage);
  const activeChallenge = useBattleRunStore(state => state.activeChallenge);
  const activeRoute = useBattleRunStore(state => state.activeRoute);
  const partySize = useBattleRunStore(state => state.party.length);
  const decision = useBattleEngineStore(state => state.decision);
  const engineStatus = useBattleEngineStore(state => state.status);
  const conclusion = useBattleEngineStore(state => state.conclusion);
  const metadataName = typeof user?.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name.trim()
    : '';
  const playerName = profile?.username?.trim()
    || metadataName
    || user?.email?.split('@')[0]?.trim()
    || undefined;
  const error = useBattleEngineStore(state => state.error);
  const visualEvents = useBattleEngineStore(state => state.visualEvents);
  const consumeVisualEvent = useBattleEngineStore(state => state.consumeVisualEvent);
  const chooseMove = useBattleEngineStore(state => state.chooseMove);
  const chooseSwitch = useBattleEngineStore(state => state.chooseSwitch);
  const retryBattle = useBattleEngineStore(state => state.retryBattle);
  const forfeitBattle = useBattleEngineStore(state => state.forfeitBattle);
  const availableSwitches = decision.switches.filter(choice => !choice.active && !choice.fainted);
  const [displaySnapshot, setDisplaySnapshot] = useState(snapshot);
  const [activeVisual, setActiveVisual] = useState<BattleVisualEvent | null>(null);
  // Adopt Showdown's BattleScene for the arena; fall back to the stylized fx arena
  // if its client bundle can't load. Memoized so the scene isn't torn down and
  // recreated on every re-render (e.g. hovering a move to inspect it).
  const [showdownFailed, setShowdownFailed] = useState(false);
  const handleShowdownError = useCallback(() => setShowdownFailed(true), []);
  // The Showdown play-by-play log renders into this node, which we place in a
  // full-height right column beside the arena + moves rather than inside the arena.
  const [logEl, setLogEl] = useState<HTMLDivElement | null>(null);
  const [inspectedMoveSlot, setInspectedMoveSlot] = useState<number | null>(null);
  // Battle audio (BGM + Pokémon cries) is on by default; this toggle mutes it live
  // and remembers the choice. Only meaningful while the Showdown scene is driving.
  const [muted, setMuted] = useState(() => isShowdownMuted());
  const toggleMuted = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      setShowdownMuted(next);
      return next;
    });
  }, []);
  const nextVisual = visualEvents[0];
  // With the live Showdown scene, pacing is driven by the scene's real animation
  // clock (the store holds the decision as 'wait' until the queue drains), so the
  // guessed-duration visual-event queue is only used for the fallback renderer.
  const controlsLocked = showdownFailed && (activeVisual !== null || visualEvents.length > 0);
  const inspectedMove = decision.kind === 'move'
    ? decision.moves.find(move => move.slot === inspectedMoveSlot)
    : undefined;
  const toggleMoveInspection = (slot: number) => {
    const nextSlot = inspectedMoveSlot === slot ? null : slot;
    setInspectedMoveSlot(nextSlot);
  };

  useEffect(() => {
    // The Showdown scene animates these events itself; only the fallback arena
    // replays them through this fixed-duration queue.
    if (!showdownFailed || !nextVisual) return undefined;
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
  }, [consumeVisualEvent, nextVisual, showdownFailed]);

  useEffect(() => {
    // In Showdown mode the HP/turn readouts follow the live snapshot directly; the
    // fallback arena instead freezes the readout on the visual event being replayed.
    if (!showdownFailed) {
      setDisplaySnapshot(snapshot);
      return;
    }
    if (!activeVisual && visualEvents.length === 0) setDisplaySnapshot(snapshot);
  }, [showdownFailed, activeVisual, snapshot, visualEvents.length]);

  useEffect(() => {
    if (decision.kind !== 'move') setInspectedMoveSlot(null);
  }, [decision.kind]);

  const challengeProgress = activeChallenge && displaySnapshot
    ? getStageChallengeProgress(activeChallenge, displaySnapshot.turn, partySize, displaySnapshot.playerRemaining)
    : null;
  const arenaTheme = getRunArenaTheme(stage, activeRoute?.id);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-3 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-5">
      <section className="overflow-hidden border border-slate-200/80 bg-white shadow-lg sm:shadow-2xl">
        <div className="battle-stage relative h-[min(46svh,360px)] min-h-[310px] overflow-hidden bg-slate-950 sm:h-[clamp(430px,52svh,500px)]">
          {!showdownFailed && <ShowdownStage onLoadError={handleShowdownError} logEl={logEl} />}

          {showdownFailed && (
            <>
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-[47%] bg-gradient-to-b ${arenaTheme.skyClass}`} />
              <div className={`pointer-events-none absolute left-[24%] -top-[12%] h-[56%] w-16 -rotate-12 blur-xl ${arenaTheme.beamClass}`} />
              <div className={`pointer-events-none absolute right-[22%] -top-[12%] h-[56%] w-16 rotate-12 blur-xl ${arenaTheme.beamClass}`} />
              <div className={`pointer-events-none absolute inset-x-0 top-[39%] h-16 shadow-[0_10px_30px_rgba(15,23,42,0.35)] ${arenaTheme.horizonClass}`} />
              <div className="pointer-events-none absolute inset-x-0 top-[40%] flex h-12 items-center justify-around opacity-60">
                {Array.from({ length: 14 }, (_, index) => <span key={index} className={`h-2 w-2 rounded-full ${arenaTheme.lightClass}`} />)}
              </div>
              <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-[56%] bg-gradient-to-b ${arenaTheme.fieldClass}`} />
              <div className="battle-field-grid pointer-events-none absolute inset-x-0 bottom-0 h-[54%] opacity-30" />

              <div className={`pointer-events-none absolute right-[7%] top-[48%] h-16 w-[38%] rounded-[50%] border-2 ${arenaTheme.platformClass}`} />
              <div className={`pointer-events-none absolute bottom-[8%] left-[3%] h-24 w-[48%] rounded-[50%] border-2 ${arenaTheme.platformClass}`} />
              <div className={`pointer-events-none absolute inset-0 z-[2] border-[3px] ${arenaTheme.routeFrameClass}`} />

              <div className="absolute left-2.5 top-2.5 z-20 w-[min(61%,240px)] sm:left-5 sm:top-5 sm:w-[min(52%,260px)]">
                <HealthPanel key={`opponent-${displaySnapshot?.opponent?.species ?? 'empty'}`} pokemon={displaySnapshot?.opponent ?? null} opponent />
              </div>

              <div className="absolute right-[7%] bottom-[41%] z-10 flex h-28 w-[38%] items-end justify-center sm:right-[10%] sm:bottom-[43%] sm:h-40 sm:w-[32%]">
                {displaySnapshot?.opponent && (
                  <div className={`relative h-full w-full ${pokemonMotion(activeVisual, 'opponent')}`}>
                    <BattlePokemonImage id={displaySnapshot.opponent.id} species={displaySnapshot.opponent.species} side="p2" className="h-full w-full drop-shadow-2xl" />
                  </div>
                )}
              </div>

              <div className="absolute bottom-[10%] left-[3%] z-10 flex h-32 w-[39%] items-end justify-center sm:bottom-[9%] sm:left-[8%] sm:h-48 sm:w-[38%]">
                {displaySnapshot?.player && (
                  <div className={`relative h-full w-full ${pokemonMotion(activeVisual, 'player')}`}>
                    <BattlePokemonImage id={displaySnapshot.player.id} species={displaySnapshot.player.species} side="p1" className="h-full w-full drop-shadow-2xl" />
                  </div>
                )}
              </div>

              <div className="absolute bottom-2.5 right-2.5 z-20 w-[56%] max-w-[240px] sm:bottom-5 sm:right-5 sm:w-[48%] sm:max-w-[260px]">
                <HealthPanel key={`player-${displaySnapshot?.player?.species ?? 'empty'}`} pokemon={displaySnapshot?.player ?? null} />
              </div>

              <BattleEffect event={activeVisual} />
            </>
          )}

          {!showdownFailed && (
            <button
              type="button"
              onClick={toggleMuted}
              aria-label={muted ? 'Unmute battle sound' : 'Mute battle sound'}
              aria-pressed={muted}
              title={muted ? 'Unmute battle sound' : 'Mute battle sound'}
              className="absolute bottom-2.5 left-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-800 shadow-md backdrop-blur transition hover:bg-white sm:bottom-5 sm:left-5"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          )}

          <div className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-white/95 px-2 py-1 text-[7px] font-black text-slate-800 shadow-md backdrop-blur sm:right-5 sm:top-5">
            <span>TURN {displaySnapshot?.turn ?? 0}</span>
            <span className="h-3 w-px bg-slate-300" />
            <span>YOU {displaySnapshot?.playerRemaining ?? 0}</span>
            <span className="text-red-300">VS</span>
            <span>{displaySnapshot?.opponentRemaining ?? 0} NPC</span>
          </div>

          {conclusion && <BattleConclusionBanner result={conclusion} playerName={playerName} />}
        </div>

        <div className="relative border-t border-slate-200 bg-slate-50 p-1.5 sm:p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              <p>{error}</p>
              {engineStatus === 'error' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={retryBattle}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700"
                  >
                    Restart battle
                  </button>
                  <button
                    type="button"
                    onClick={forfeitBattle}
                    className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                  >
                    End run
                  </button>
                </div>
              )}
            </div>
          )}

          {decision.kind === 'move' && !controlsLocked && (
            <div>
              {inspectedMove && (
                <div className="absolute inset-x-2 bottom-full z-40 mb-2 sm:left-1/2 sm:right-auto sm:w-[min(680px,calc(100%-2rem))] sm:-translate-x-1/2 sm:mb-3">
                  <MoveDetails move={inspectedMove} opponent={displaySnapshot?.opponent?.species} />
                </div>
              )}
              <div className="mb-2 hidden items-center justify-end sm:flex">
                {decision.switchingBlocked ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                    <LockKeyhole className="h-3.5 w-3.5" /> Active Pokémon is trapped
                  </span>
                ) : challengeProgress ? (
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${challengeProgress.status === 'failed' ? 'bg-red-100 text-red-800' : challengeProgress.status === 'at-risk' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    <Target className="h-3.5 w-3.5" /> {challengeProgress.label} · {challengeProgress.metrics.map(metric => metric.value).join(' / ')}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-400">Hover or focus a move for details</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1 sm:gap-2 xl:grid-cols-4">
                {decision.moves.map(move => {
                  const effectiveness = getEffectivenessPresentation(move.effectiveness);
                  return (
                    <div key={move.slot} className="relative flex min-w-0 flex-col">
                      <button
                        type="button"
                        disabled={move.disabled || controlsLocked}
                        onClick={() => chooseMove(move.slot)}
                        onMouseEnter={() => setInspectedMoveSlot(move.slot)}
                        onMouseLeave={() => setInspectedMoveSlot(current => current === move.slot ? null : current)}
                        onFocus={() => setInspectedMoveSlot(move.slot)}
                        onBlur={() => setInspectedMoveSlot(current => current === move.slot ? null : current)}
                        title={move.description || `${move.category} ${move.type} move`}
                        aria-label={`${move.name}. ${move.category} ${move.type} move. ${move.description || 'No description available.'}`}
                        aria-describedby={inspectedMoveSlot === move.slot ? `battle-move-details-${move.slot}` : undefined}
                        className="group relative min-h-[70px] w-full touch-manipulation overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 text-left transition active:scale-[0.98] hover:border-red-300 hover:shadow-md focus-visible:border-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-[92px] sm:rounded-2xl sm:p-3 xl:min-h-[108px]"
                      >
                        <span className={`absolute inset-y-0 left-0 w-1 sm:w-1.5 ${typeClasses[move.type] ?? 'bg-slate-400'}`} />
                        <span className="flex items-start justify-between gap-1 pl-1.5 sm:gap-3 sm:pl-2">
                          <span className="min-w-0">
                            <span className="block truncate text-[11px] font-black leading-tight text-slate-900 sm:text-base">{move.name}</span>
                            <span className="mt-0.5 flex items-center gap-0.5 text-[8px] font-bold text-slate-500 sm:mt-1 sm:gap-1 sm:text-[11px]">
                              <span className={`${typeClasses[move.type] ?? 'bg-slate-400'} rounded px-1 py-0.5 text-[7px] uppercase text-white sm:px-1.5 sm:text-[9px]`}>{move.type}</span>
                              <MoveCategoryBadge category={move.category} compact />
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-[9px] font-black leading-none text-slate-500 sm:text-[11px] sm:leading-normal">
                            {move.pp}/{move.maxpp}<span className="ml-0.5 font-bold text-slate-400 sm:ml-0 sm:block">PP</span>
                          </span>
                        </span>
                        <span className="mt-1 flex items-center justify-between gap-1 pl-1.5 pr-7 text-[8px] font-bold sm:mt-2 sm:pl-2 sm:pr-0 sm:text-[10px]">
                          <span className="truncate text-slate-400">
                            <span className="sm:hidden">
                              {move.category === 'Status'
                                ? 'Status'
                                : `${move.power || '—'} PWR · ${move.accuracy === true ? 'Always' : `${move.accuracy}%`}`}
                            </span>
                            <span className="max-sm:hidden">
                            {move.category === 'Status'
                              ? 'Effect move'
                              : `${move.power || '—'} power · ${move.accuracy === true ? 'Always hits' : `${move.accuracy}%`}`}
                            </span>
                          </span>
                          <span className={`shrink-0 rounded-full border px-1 py-0.5 font-black sm:px-1.5 ${effectiveness.classes}`}>{effectiveness.shortLabel}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleMoveInspection(move.slot)}
                        aria-expanded={inspectedMoveSlot === move.slot}
                        aria-controls={`battle-move-details-${move.slot}`}
                        title={inspectedMoveSlot === move.slot ? 'Hide move details' : `Inspect ${move.name}`}
                        aria-label={inspectedMoveSlot === move.slot ? `Hide ${move.name} details` : `Inspect ${move.name}`}
                        className="absolute bottom-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600 shadow-sm active:bg-slate-200 sm:hidden"
                      >
                        <Info className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {decision.switchingBlocked && (
                <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-amber-100 px-2 py-1.5 text-[10px] font-black text-amber-800 sm:hidden">
                  <LockKeyhole className="h-3 w-3" /> Active Pokémon is trapped and cannot switch
                </div>
              )}
            </div>
          )}

          {decision.kind === 'switch' && !controlsLocked && (
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Choose your next Pokémon</p>
              <SwitchChoices choices={availableSwitches} onChoose={chooseSwitch} />
            </div>
          )}

          {engineStatus !== 'error' && (decision.kind === 'wait' || controlsLocked) && (
            <div className="flex min-h-24 items-center justify-center gap-3 text-sm font-black text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-red-500" /> {controlsLocked ? 'Playing battle sequence…' : 'Resolving the turn…'}
            </div>
          )}

          {decision.kind === 'move' && availableSwitches.length > 0 && !controlsLocked && (
            <details className="mt-1 rounded-lg border border-blue-100 bg-blue-50/70 px-2 py-1.5 sm:mt-3 sm:rounded-xl sm:p-3">
              <summary className="min-h-4 cursor-pointer text-[10px] font-black text-blue-800 sm:min-h-6 sm:text-sm">Switch Pokémon instead</summary>
              <div className="mt-1.5 sm:mt-3"><SwitchChoices choices={availableSwitches} onChoose={chooseSwitch} /></div>
            </details>
          )}
        </div>
      </section>

      {!showdownFailed && (
        <aside className="showdown-log-col h-full min-h-0 overflow-hidden border border-slate-200/80 bg-white shadow-lg sm:shadow-2xl">
          <div className="relative h-full w-full">
            <div ref={setLogEl} className="showdown-log battle-log" />
          </div>
        </aside>
      )}

      <MobileBattleSummary />
      <BattleSidebar />
    </div>
  );
}
