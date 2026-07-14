import { memo, useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Bot,
  CheckCircle2,
  Compass,
  ChevronRight,
  Crown,
  Flag,
  Flame,
  Gauge,
  Heart,
  Loader2,
  LockKeyhole,
  Medal,
  RotateCcw,
  Shield,
  ShieldCheck,
  Swords,
  Trophy,
  Target,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { useBattleRunStore } from '../../store/battleRunStore';
import {
  disposePrewarmedShowdownBattleWorker,
  prewarmShowdownBattleWorker,
} from '../../services/showdown-battle-worker.service';
import type { ActiveBattlePokemon, BattleSide, BattleVisualEvent, OpponentTrainer, RunChallenge, RunChallengeProgress, RunPokemon, RunRewardSummary, RunUpgrade } from '../../types/battle-run';
import {
  RUN_ROUTES,
  RUN_SECTORS,
  RUN_STAGE_LIMIT,
  getContractChainMultiplier,
  getRunGrade,
  getRunSector,
  getStageChallengeProgress,
  isCheckpointStage,
  isFinalStage,
} from '../../utils/battle-run-rules';
import { BattlePokemonImage } from './BattlePokemonImage';
import { MoveBattleEffect } from './MoveBattleEffect';
import { TrainerImage } from './TrainerImage';
import { preloadMoveAnimationAssets } from './move-animation-recipes';

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

function StageMeter({ stage, complete = false }: { stage: number; complete?: boolean }) {
  const sector = getRunSector(stage);
  return (
    <div className="flex items-center gap-2" aria-label={`${sector.title}, stage ${Math.min(stage, RUN_STAGE_LIMIT)} of ${RUN_STAGE_LIMIT}`}>
      <span className="hidden text-[9px] font-black uppercase tracking-wider text-slate-400 xl:inline">{sector.title}</span>
      <div className="flex items-center gap-1">
        {RUN_SECTORS.map(runSector => (
          <div key={runSector.number} className="flex items-center gap-0.5">
            {Array.from({ length: runSector.endStage - runSector.startStage + 1 }, (_, index) => {
              const candidateStage = runSector.startStage + index;
              const cleared = candidateStage < stage || (complete && candidateStage <= stage);
              const current = candidateStage === stage && !complete;
              return (
                <span
                  key={candidateStage}
                  className={`h-1.5 rounded-full transition-all ${cleared ? 'w-2 bg-red-500' : current ? 'w-3 bg-amber-400' : 'w-1.5 bg-slate-200'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <span className="text-[10px] font-black text-slate-500">{Math.min(stage, RUN_STAGE_LIMIT)}/{RUN_STAGE_LIMIT}</span>
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
    <div className="flex max-w-full gap-1.5 overflow-x-auto">
      {party.map(pokemon => (
        <div key={pokemon.species} className="flex shrink-0 items-center gap-1.5 rounded-full border border-white bg-white/90 py-0.5 pl-0.5 pr-2.5 shadow-sm backdrop-blur">
          <div className="h-7 w-7 overflow-hidden rounded-full bg-sky-50">
            <BattlePokemonImage id={pokemon.id} species={pokemon.species} variant="icon" className="h-full w-full" />
          </div>
          <span className="text-[11px] font-black text-slate-700">{pokemon.species} <span className="text-slate-400">L{pokemon.level}</span></span>
        </div>
      ))}
    </div>
  );
}

function ChallengeCard({ challenge, compact = false, progress, chainMultiplier = 1 }: {
  challenge: RunChallenge;
  compact?: boolean;
  progress?: RunChallengeProgress | null;
  chainMultiplier?: number;
}) {
  const payout = Math.round(challenge.bounty * chainMultiplier);
  return (
    <div className={`rounded-2xl border border-white/10 bg-slate-950 text-white shadow-lg ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span className={`flex shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300 ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}>
            <Target className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </span>
          <span className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-red-300">Stage contract</span>
            <strong className={`block truncate ${compact ? 'text-sm' : 'text-lg'}`}>{challenge.title}</strong>
            <span className={`mt-0.5 block leading-relaxed text-slate-300 ${compact ? 'text-[11px]' : 'text-sm'}`}>{challenge.description}</span>
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-amber-400/15 px-2.5 py-1 text-right text-xs font-black text-amber-300">
          <span className="block">+{payout.toLocaleString()}</span>
          {chainMultiplier > 1 && <span className="block text-[8px] uppercase tracking-wider text-amber-200/70">Chain x{chainMultiplier.toFixed(2)}</span>}
        </span>
      </div>
      {progress && (
        <div className={`mt-3 rounded-xl border px-3 py-2 ${progress.status === 'failed' ? 'border-red-400/30 bg-red-500/15' : progress.status === 'at-risk' ? 'border-amber-400/30 bg-amber-400/10' : 'border-emerald-400/30 bg-emerald-400/10'}`}>
          <div className="flex items-center justify-between gap-3">
            <span className={`text-[10px] font-black uppercase tracking-wider ${progress.status === 'failed' ? 'text-red-300' : progress.status === 'at-risk' ? 'text-amber-300' : 'text-emerald-300'}`}>
              {progress.label}
            </span>
            <span className="flex items-center gap-3">
              {progress.metrics.map(metric => (
                <span key={metric.label} className="text-right">
                  <span className="block text-[8px] font-black uppercase text-slate-500">{metric.label}</span>
                  <strong className="block text-xs text-white">{metric.value}</strong>
                </span>
              ))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function RewardSummary({ reward, score, streak, bestScore, personalBestReached, final = false }: {
  reward: RunRewardSummary;
  score: number;
  streak: number;
  bestScore?: number;
  personalBestReached?: boolean;
  final?: boolean;
}) {
  const bonuses = [
    { label: 'Stage clear', value: reward.stageScore, icon: Trophy },
    { label: `${reward.survivors} survived`, value: reward.survivalBonus, icon: ShieldCheck },
    { label: `${reward.turns} turns`, value: reward.tempoBonus, icon: Gauge },
    ...(reward.flawlessBonus > 0 ? [{ label: 'Flawless team', value: reward.flawlessBonus, icon: Heart }] : []),
    ...(reward.checkpointBonus > 0 ? [{ label: 'Checkpoint', value: reward.checkpointBonus, icon: Flag }] : []),
    ...(reward.routeBonus > 0 && reward.route ? [{ label: reward.route.title, value: reward.routeBonus, icon: Compass }] : []),
  ];

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xl">
      <div className="flex flex-col justify-between gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Stage {reward.stage} cleared</p>
          <p className="mt-1 text-xl font-black">Performance reward</p>
        </div>
        <div className="flex items-end gap-5">
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Earned</p>
            <p className="text-2xl font-black text-amber-300">+{reward.totalScore.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Run score</p>
            <p className="text-lg font-black">{score.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Wins</p>
            <p className="flex items-center justify-end gap-1 text-lg font-black"><Flame className="h-4 w-4 text-orange-400" /> {streak}</p>
          </div>
        </div>
      </div>
      {personalBestReached && score === bestScore && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-300/20 bg-amber-400/10 px-5 py-2.5 text-xs font-black text-amber-200">
          <span className="flex items-center gap-2"><Crown className="h-4 w-4" /> {final ? 'New personal best secured' : 'Personal best in progress'}</span>
          <span>{bestScore.toLocaleString()} points</span>
        </div>
      )}
      <div className="grid gap-px bg-white/10 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        {bonuses.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center justify-between gap-3 bg-slate-950 px-4 py-3">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-300"><Icon className="h-3.5 w-3.5 text-slate-500" /> {label}</span>
            <strong className="text-sm text-white">+{value}</strong>
          </div>
        ))}
      </div>
      {reward.challenge && (
        <div className={`flex items-center justify-between gap-4 border-t border-white/10 px-5 py-3 ${reward.challengeCompleted ? 'bg-emerald-950/60' : 'bg-slate-900'}`}>
          <div className="flex items-center gap-3">
            {reward.challengeCompleted
              ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              : <XCircle className="h-5 w-5 shrink-0 text-slate-500" />}
            <div>
              <p className={`text-xs font-black uppercase tracking-wider ${reward.challengeCompleted ? 'text-emerald-300' : 'text-slate-400'}`}>
                {reward.challengeCompleted ? `Contract cleared · ${reward.contractStreak} chain` : 'Contract missed · chain reset'}
              </p>
              <p className="text-sm font-bold text-white">{reward.challenge.title}</p>
            </div>
          </div>
          <span className="text-right">
            <strong className={`block ${reward.challengeCompleted ? 'text-emerald-300' : 'text-slate-500'}`}>
              {reward.challengeCompleted ? `+${reward.challengeBonus.toLocaleString()}` : 'No bonus'}
            </strong>
            {reward.challengeCompleted && reward.challengeMultiplier > 1 && (
              <span className="block text-[9px] font-black uppercase tracking-wider text-emerald-400/70">Chain x{reward.challengeMultiplier.toFixed(2)}</span>
            )}
          </span>
        </div>
      )}
      <div className="bg-emerald-950/50 px-5 py-2.5 text-xs font-bold text-emerald-200">
        {final ? 'Final checkpoint secured. The challenge is complete.' : `Surviving Pokémon gained ${reward.levelsGained} levels.`}
      </div>
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

function sameActivePokemon(previous: ActiveBattlePokemon | null, next: ActiveBattlePokemon | null): boolean {
  if (previous === next) return true;
  if (!previous || !next) return false;
  return previous.id === next.id
    && previous.species === next.species
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
  if (!pokemon) return <div className="h-24 animate-pulse rounded-2xl bg-white/60" />;
  const percentage = pokemon.maxhp > 0 ? Math.max(0, Math.round((pokemon.hp / pokemon.maxhp) * 100)) : 0;
  const barColor = percentage > 50 ? 'bg-emerald-500' : percentage > 20 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className={`rounded-2xl border bg-white/95 p-3 shadow-xl backdrop-blur-sm ${opponent ? 'border-red-200/80' : 'border-blue-200/80'}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className={`block text-[9px] font-black uppercase tracking-[0.18em] ${opponent ? 'text-red-500' : 'text-blue-500'}`}>
            {opponent ? 'Opponent' : 'Active'}
          </span>
          <strong className="block truncate text-base text-slate-900 sm:text-lg">{pokemon.species}</strong>
        </span>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">LV. {pokemon.level}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-slate-400">HP</span>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-300">
          <div
            className={`battle-health-fill h-full w-full origin-left rounded-full ${barColor}`}
            style={{ transform: `scaleX(${percentage / 100})` }}
          />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
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

const BattleOpponentBadge = memo(function BattleOpponentBadge() {
  const trainer = useBattleRunStore(state => state.opponentTrainer);
  const stage = useBattleRunStore(state => state.stage);
  if (!trainer) return null;

  return (
    <div className="absolute right-4 top-4 z-20 hidden sm:block">
      <TrainerCard trainer={trainer} stage={stage} compact />
    </div>
  );
});

const BattleLogPanel = memo(function BattleLogPanel() {
  const battleLog = useBattleRunStore(state => state.battleLog);
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
  const snapshot = useBattleRunStore(state => state.snapshot);
  const partySize = useBattleRunStore(state => state.party.length);
  const challengeProgress = activeChallenge && snapshot
    ? getStageChallengeProgress(activeChallenge, snapshot.turn, partySize, snapshot.playerRemaining)
    : null;

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 text-slate-900 shadow-2xl backdrop-blur-xl">
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

function BattleArena() {
  const snapshot = useBattleRunStore(state => state.snapshot);
  const activeChallenge = useBattleRunStore(state => state.activeChallenge);
  const partySize = useBattleRunStore(state => state.party.length);
  const decision = useBattleRunStore(state => state.decision);
  const error = useBattleRunStore(state => state.error);
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

  const challengeProgress = activeChallenge && displaySnapshot
    ? getStageChallengeProgress(activeChallenge, displaySnapshot.turn, partySize, displaySnapshot.playerRemaining)
    : null;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-2xl">
        <div className="battle-stage relative h-[clamp(430px,52svh,500px)] overflow-hidden bg-slate-900">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[47%] bg-gradient-to-b from-sky-400 via-sky-200 to-cyan-100" />
          <div className="pointer-events-none absolute inset-x-0 top-[39%] h-16 bg-slate-900/80 shadow-[0_10px_30px_rgba(15,23,42,0.35)]" />
          <div className="pointer-events-none absolute inset-x-0 top-[40%] flex h-12 items-center justify-around opacity-60">
            {Array.from({ length: 14 }, (_, index) => <span key={index} className="h-2 w-2 rounded-full bg-white" />)}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[56%] bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-800" />
          <div className="battle-field-grid pointer-events-none absolute inset-x-0 bottom-0 h-[54%] opacity-30" />

          <div className="pointer-events-none absolute right-[7%] top-[48%] h-16 w-[38%] rounded-[50%] border-2 border-white/30 bg-emerald-950/20 shadow-[inset_0_10px_22px_rgba(6,78,59,0.24)]" />
          <div className="pointer-events-none absolute bottom-[8%] left-[3%] h-24 w-[48%] rounded-[50%] border-2 border-white/25 bg-emerald-950/30 shadow-[inset_0_14px_28px_rgba(6,78,59,0.3)]" />

          <div className="absolute left-3 top-3 z-20 w-[min(64%,320px)] sm:left-5 sm:top-5">
            <HealthPanel key={`opponent-${displaySnapshot?.opponent?.species ?? 'empty'}`} pokemon={displaySnapshot?.opponent ?? null} opponent />
          </div>
          {challengeProgress && (
            <div className={`absolute right-3 top-3 z-20 w-[30%] rounded-xl border px-2 py-2 text-right shadow-lg backdrop-blur sm:hidden ${challengeProgress.status === 'failed' ? 'border-red-300/50 bg-red-950/85 text-red-200' : challengeProgress.status === 'at-risk' ? 'border-amber-300/50 bg-amber-950/85 text-amber-200' : 'border-emerald-300/50 bg-emerald-950/85 text-emerald-200'}`}>
              <span className="block text-[8px] font-black uppercase tracking-wider">{challengeProgress.label}</span>
              <strong className="mt-0.5 block text-xs text-white">{challengeProgress.metrics.map(metric => metric.value).join(' · ')}</strong>
            </div>
          )}
          <BattleOpponentBadge />

          <div className="absolute right-[8%] top-[31%] z-10 flex h-36 w-[38%] items-end justify-center sm:right-[10%] sm:h-44 sm:w-[34%]">
            {displaySnapshot?.opponent && (
              <div className={`relative h-full w-full ${pokemonMotion(activeVisual, 'opponent')}`}>
                <BattlePokemonImage id={displaySnapshot.opponent.id} species={displaySnapshot.opponent.species} side="p2" className="h-full w-full drop-shadow-2xl" />
              </div>
            )}
          </div>

          <div className="absolute bottom-[7%] left-[2%] z-10 flex h-40 w-[36%] items-end justify-center sm:bottom-[5%] sm:left-[8%] sm:h-48 sm:w-[38%]">
            {displaySnapshot?.player && (
              <div className={`relative h-full w-full ${pokemonMotion(activeVisual, 'player')}`}>
                <BattlePokemonImage id={displaySnapshot.player.id} species={displaySnapshot.player.species} side="p1" className="h-full w-full drop-shadow-2xl" />
              </div>
            )}
          </div>

          <div className="absolute bottom-3 right-3 z-20 w-[56%] max-w-[320px] sm:bottom-5 sm:right-5">
            <HealthPanel key={`player-${displaySnapshot?.player?.species ?? 'empty'}`} pokemon={displaySnapshot?.player ?? null} />
          </div>

          <BattleEffect event={activeVisual} />

          <div className="absolute left-3 top-[43%] z-20 flex items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-slate-950/90 px-3 py-2 text-[9px] font-black text-white shadow-xl backdrop-blur sm:left-1/2 sm:-translate-x-1/2 sm:gap-3 sm:px-4 sm:text-xs">
            <span>TURN {displaySnapshot?.turn ?? 0}</span>
            <span className="h-4 w-px bg-white/30" />
            <span>YOU {displaySnapshot?.playerRemaining ?? 0}</span>
            <span className="text-red-300">VS</span>
            <span>{displaySnapshot?.opponentRemaining ?? 0} NPC</span>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-6">
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

          {decision.kind === 'move' && !controlsLocked && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white"><Swords className="h-4 w-4" /></span>
                  <span>
                    <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-red-500">Command phase</span>
                    <span className="block text-sm font-black text-slate-800">Choose your move</span>
                  </span>
                </div>
                {decision.switchingBlocked ? (
                  <span className="hidden items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800 sm:flex">
                    <LockKeyhole className="h-3.5 w-3.5" /> Active Pokémon is trapped
                  </span>
                ) : challengeProgress ? (
                  <span className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black sm:flex ${challengeProgress.status === 'failed' ? 'bg-red-100 text-red-800' : challengeProgress.status === 'at-risk' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    <Target className="h-3.5 w-3.5" /> {challengeProgress.label} · {challengeProgress.metrics.map(metric => metric.value).join(' / ')}
                  </span>
                ) : (
                  <span className="hidden text-xs font-bold text-slate-400 sm:inline">Switch options below</span>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {decision.moves.map(move => (
                  <button
                    key={move.slot}
                    type="button"
                    disabled={move.disabled || controlsLocked}
                    onClick={() => chooseMove(move.slot)}
                    className="group relative min-h-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-white hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 xl:min-h-[96px]"
                  >
                    <span className={`absolute inset-y-0 left-0 w-1.5 ${typeClasses[move.type] ?? 'bg-slate-400'}`} />
                    <span className="flex items-start justify-between gap-3 pl-2">
                      <span>
                        <span className="block font-black text-slate-900">{move.name}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-bold text-slate-500">
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
              {decision.switchingBlocked && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-800 sm:hidden">
                  <LockKeyhole className="h-3.5 w-3.5" /> Active Pokémon is trapped and cannot switch
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

      <BattleSidebar />
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
  const activeChallenge = useBattleRunStore(state => state.activeChallenge);
  const activeRoute = useBattleRunStore(state => state.activeRoute);
  const contractStreak = useBattleRunStore(state => state.contractStreak);
  const checkpoint = isCheckpointStage(stage);
  const sector = getRunSector(stage);
  const finalStage = isFinalStage(stage);
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
        <div className={`flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.18em] ${checkpoint ? 'text-amber-700' : 'text-red-600'}`}>
          {checkpoint ? <Flag className="h-4 w-4" /> : <Swords className="h-4 w-4" />}
          {finalStage ? `Final boss · ${sector.bossTitle}` : checkpoint ? `${sector.bossTitle} · Stage ${stage}` : `${sector.title} · Stage ${stage}`}
        </div>
        {activeRoute && (
          <div className="mt-2 flex items-center justify-center gap-2 text-xs font-black text-slate-500">
            <Compass className="h-3.5 w-3.5" /> {activeRoute.title} · Score x{activeRoute.scoreMultiplier}
          </div>
        )}
        <p className="mt-3 text-lg font-bold italic text-slate-700">“{trainer.intro}”</p>
        {activeChallenge && (
          <div className="mx-auto mt-4 max-w-xl text-left">
            <ChallengeCard challenge={activeChallenge} chainMultiplier={getContractChainMultiplier(contractStreak)} />
          </div>
        )}
        {checkpoint && (
          <div className="mx-auto mt-4 max-w-lg rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            {finalStage
              ? 'The entire run is on the line. Defeat this roster to conquer all three circuits.'
              : 'Stronger roster. Clear it for a 1,000 point bonus, an extra team level, and a permanent upgrade.'}
          </div>
        )}
        <div className="mt-5 flex justify-center gap-2">
          {enemyParty.map(pokemon => (
            <div key={pokemon.species} className="h-14 w-14 rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm" title={pokemon.species}>
              <BattlePokemonImage id={pokemon.id} species={pokemon.species} variant="icon" className="h-full w-full" />
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm font-black text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-red-500" /> Loading the battle engine…
        </div>
      </div>
    </section>
  );
}

function RouteSelectionScreen() {
  const stage = useBattleRunStore(state => state.stage);
  const selectRoute = useBattleRunStore(state => state.selectRoute);
  const upgrades = useBattleRunStore(state => state.upgrades);
  const activeChallenge = useBattleRunStore(state => state.activeChallenge);
  const contractStreak = useBattleRunStore(state => state.contractStreak);
  const trainer = useBattleRunStore(state => state.opponentTrainer);
  const routePreviews = useBattleRunStore(state => state.routePreviews);
  const checkpoint = isCheckpointStage(stage);
  const sector = getRunSector(stage);
  const finalStage = isFinalStage(stage);
  const chainMultiplier = getContractChainMultiplier(contractStreak);

  return (
    <section className="relative mx-auto max-w-6xl">
      <div className="mb-6 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-600">Sector {sector.number} of {RUN_SECTORS.length} · {sector.title}</p>
        <h2 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">{finalStage ? 'Choose the stakes for the final boss' : `Set the stakes for stage ${stage}`}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-slate-600">
          {sector.objective} Higher-risk routes strengthen the opposing team, but multiply every point earned from the battle and its contract.
        </p>
      </div>

      {trainer && (
        <div className="mx-auto mb-4 flex max-w-4xl items-center gap-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-4 text-white shadow-lg">
          <TrainerImage src={trainer.image} name={trainer.name} className="h-20 w-20 self-end sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-300">Scouted challenger · {trainer.title}</p>
            <p className="mt-0.5 text-xl font-black">{trainer.name}</p>
            <p className="mt-1 truncate text-xs font-semibold italic text-slate-400">“{trainer.intro}”</p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-300 sm:flex">
            <ShieldCheck className="h-4 w-4" /> Three routes verified
          </div>
        </div>
      )}

      {activeChallenge && (
        <div className="mx-auto mb-4 grid max-w-4xl gap-3 lg:grid-cols-[1fr_220px]">
          <ChallengeCard challenge={activeChallenge} chainMultiplier={chainMultiplier} />
          <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm lg:flex-col lg:items-start lg:justify-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/60 text-amber-800">
              <Target className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">Contract chain</span>
              <strong className="block text-lg">{contractStreak} cleared in a row</strong>
              <span className="mt-1 block text-xs font-semibold leading-relaxed text-amber-800">
                Clear this objective for x{chainMultiplier.toFixed(2)} contract score. A miss resets the chain.
              </span>
            </span>
          </div>
        </div>
      )}

      {checkpoint && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900">
          <Flag className="h-4 w-4" /> {finalStage ? `${sector.bossTitle}: win this battle to complete the challenge.` : `${sector.bossTitle}: checkpoint modifiers stack with your route.`}
        </div>
      )}

      {upgrades.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Run upgrades</span>
          {upgrades.map(upgrade => (
            <span key={upgrade.id} className="rounded-full border border-white bg-white/80 px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
              {upgrade.title}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {RUN_ROUTES.map((route, index) => {
          const preview = routePreviews[route.id];
          const Icon = route.id === 'trail' ? Shield : route.id === 'rival' ? Swords : Crown;
          const accent = route.id === 'trail'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : route.id === 'rival'
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-red-200 bg-red-50 text-red-700';
          return (
            <button
              key={route.id}
              type="button"
              onClick={() => selectRoute(route.id)}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-lg transition duration-200 hover:-translate-y-1 hover:border-slate-400 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-red-200"
            >
              <div className={`flex items-center justify-between border-b p-4 ${accent}`}>
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80"><Icon className="h-5 w-5" /></span>
                  <span>
                    <span className="block text-[9px] font-black uppercase tracking-[0.2em]">Route {index + 1}</span>
                    <strong className="block text-lg text-slate-950">{route.title}</strong>
                  </span>
                </span>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-black text-white">x{route.scoreMultiplier}</span>
              </div>
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{route.label}</p>
                <p className="mt-2 min-h-10 text-sm leading-relaxed text-slate-600">{route.description}</p>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                      <Bot className="h-3.5 w-3.5" /> Scouted roster
                    </span>
                    <span className="text-[9px] font-black uppercase text-emerald-600">Exact match</span>
                  </div>
                  <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(72px,1fr))]">
                    {preview.map(pokemon => (
                      <div key={pokemon.species} className="min-w-0 rounded-lg bg-white px-1.5 py-2 text-center shadow-sm">
                        <BattlePokemonImage id={pokemon.id} species={pokemon.species} variant="icon" className="mx-auto h-11 w-11" />
                        <strong className="mt-0.5 block truncate text-[10px] text-slate-800">{pokemon.species}</strong>
                        <span className="block text-[9px] font-black text-slate-400">LV. {pokemon.level}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 p-2">
                    <span className="block text-[9px] font-black uppercase text-slate-400">Level</span>
                    <strong className="text-sm text-slate-800">{preview[0] ? `L${preview[0].level}` : '—'}</strong>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <span className="block text-[9px] font-black uppercase text-slate-400">Roster</span>
                    <strong className="text-sm text-slate-800">{preview.length}</strong>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <span className="block text-[9px] font-black uppercase text-slate-400">Score</span>
                    <strong className="text-sm text-slate-800">x{route.scoreMultiplier}</strong>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                  Take this route <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function UpgradeDraftScreen() {
  const stage = useBattleRunStore(state => state.stage);
  const score = useBattleRunStore(state => state.score);
  const upgradeChoices = useBattleRunStore(state => state.upgradeChoices);
  const chooseUpgrade = useBattleRunStore(state => state.chooseUpgrade);

  return (
    <section className="relative mx-auto max-w-6xl">
      <div className="mb-6 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">Checkpoint cleared</p>
        <h2 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">Choose a permanent run upgrade</h2>
        <p className="mx-auto mt-2 max-w-2xl text-slate-600">
          Stage {stage} secured. This upgrade remains active until the run ends and changes every future encounter or reward.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
          <Trophy className="h-3.5 w-3.5 text-amber-300" /> Current score {score.toLocaleString()}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {upgradeChoices.map(upgrade => {
          const Icon = upgrade.id === 'veteran-training'
            ? Crown
            : upgrade.id === 'expanded-scouting'
              ? Users
              : upgrade.id === 'contract-ledger'
                ? Target
                : upgrade.id === 'route-dividend'
                  ? Compass
                  : upgrade.id === 'flawless-standard'
                    ? ShieldCheck
                    : Heart;
          return (
            <button
              key={upgrade.id}
              type="button"
              onClick={() => chooseUpgrade(upgrade.id)}
              className="group flex min-h-64 flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-lg transition duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-amber-200"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Permanent</span>
              </div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">{upgrade.label}</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">{upgrade.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{upgrade.description}</p>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                Claim upgrade <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
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

function RunCompleteScreen({
  party,
  score,
  bestScore,
  personalBestReached,
  winStreak,
  upgrades,
  reward,
  onRestart,
}: {
  party: RunPokemon[];
  score: number;
  bestScore: number;
  personalBestReached: boolean;
  winStreak: number;
  upgrades: RunUpgrade[];
  reward: RunRewardSummary | null;
  onRestart: () => void;
}) {
  const grade = getRunGrade(score, winStreak);

  return (
    <section className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-white bg-white/90 shadow-2xl">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-red-950 to-slate-900 px-6 py-9 text-center text-white sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute inset-x-24 top-0 h-40 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-300">
          <Medal className="h-8 w-8" />
        </div>
        <p className="relative mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">15-stage challenge complete</p>
        <h2 className="relative mt-2 text-4xl font-black sm:text-5xl">Battle Run conquered</h2>
        <p className="relative mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
          You cleared every circuit, survived all three checkpoint bosses, and defeated the Run Champion.
        </p>

        <div className="relative mx-auto mt-7 grid max-w-3xl gap-2 sm:grid-cols-3">
          {RUN_SECTORS.map(sector => (
            <div key={sector.number} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>
                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Sector {sector.number}</span>
                <strong className="block text-sm text-white">{sector.title}</strong>
              </span>
            </div>
          ))}
        </div>

        <div className="relative mx-auto mt-7 grid max-w-xl grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Final score</p>
            <p className="mt-1 text-xl font-black text-white">{score.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Survivors</p>
            <p className="mt-1 text-xl font-black text-white">{party.length}/6</p>
          </div>
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-amber-200">Run grade</p>
            <p className="mt-1 text-xl font-black text-amber-300">{grade.rank}</p>
          </div>
        </div>
        <p className="relative mt-3 text-xs font-bold text-slate-400">{grade.title} · {grade.description}</p>
      </div>

      <div className="p-5 sm:p-8">
        {reward && (
          <RewardSummary
            reward={reward}
            score={score}
            streak={winStreak}
            bestScore={bestScore}
            personalBestReached={personalBestReached}
            final
          />
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Final roster</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">The team that reached the summit</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{upgrades.length} upgrades</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {party.map(pokemon => (
                <div key={pokemon.species} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-1.5 pr-3">
                  <BattlePokemonImage id={pokemon.id} species={pokemon.species} variant="icon" className="h-10 w-10" />
                  <span className="text-left">
                    <strong className="block text-xs text-slate-900">{pokemon.species}</strong>
                    <span className="block text-[10px] font-bold text-slate-400">Level {pokemon.level}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button type="button" onClick={onRestart} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-black text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-red-700">
            <RotateCcw className="h-5 w-5" /> Start another run
          </button>
        </div>
      </div>
    </section>
  );
}

export default function BattleRunGame() {
  const phase = useBattleRunStore(state => state.phase);
  const stage = useBattleRunStore(state => state.stage);
  const score = useBattleRunStore(state => state.score);
  const bestScore = useBattleRunStore(state => state.bestScore);
  const personalBestReached = useBattleRunStore(state => state.personalBestReached);
  const winStreak = useBattleRunStore(state => state.winStreak);
  const contractStreak = useBattleRunStore(state => state.contractStreak);
  const lastReward = useBattleRunStore(state => state.lastReward);
  const upgrades = useBattleRunStore(state => state.upgrades);
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
    if (phase === 'starter-draft' || phase === 'reward-draft' || phase === 'route-select') {
      prewarmShowdownBattleWorker();
      preloadMoveAnimationAssets();
    }
  }, [phase]);

  useEffect(() => () => {
    disposePrewarmedShowdownBattleWorker();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [phase]);

  const isDraft = phase === 'starter-draft' || phase === 'reward-draft';
  const runGrade = getRunGrade(score, winStreak);
  const sector = getRunSector(stage);

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-red-50 via-sky-50 to-emerald-50 px-4 py-4 sm:px-6">
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-red-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-64 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />

      <header className="relative mx-auto mb-4 max-w-7xl rounded-2xl border border-white/80 bg-white/75 px-3 py-2.5 shadow-sm backdrop-blur sm:px-4">
        <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-200">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-red-600">Sector {sector.number} · {sector.title}</div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black leading-none text-slate-950 sm:text-2xl">Battle Run</h1>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-black text-white ${phase === 'run-complete' ? 'bg-emerald-600' : isCheckpointStage(stage) ? 'bg-amber-600' : 'bg-slate-950'}`}>
                  {phase === 'run-complete' ? 'COMPLETE' : isFinalStage(stage) ? 'FINAL BOSS' : isCheckpointStage(stage) ? `BOSS ${stage}` : `STAGE ${stage}`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 lg:items-end">
            <div className="flex items-center justify-between gap-4 lg:justify-end">
              <span className="flex items-center gap-1 text-[11px] font-black text-slate-600"><Trophy className="h-3.5 w-3.5 text-amber-500" /> {score.toLocaleString()}</span>
              <span className="hidden items-center gap-1 text-[11px] font-black text-slate-600 sm:flex" title="Personal best"><Crown className="h-3.5 w-3.5 text-violet-500" /> {bestScore.toLocaleString()}</span>
              <span className="flex items-center gap-1 text-[11px] font-black text-slate-600" title="Contract chain"><Target className="h-3.5 w-3.5 text-red-500" /> x{contractStreak}</span>
              <span className="flex items-center gap-1 text-[11px] font-black text-slate-600"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> {upgrades.length}</span>
              <StageMeter stage={stage} complete={phase === 'run-complete'} />
              <div className="flex items-center gap-1 text-[11px] font-black text-slate-500"><Users className="h-3.5 w-3.5" /> {party.length}/6</div>
            </div>
            {party.length > 0 && <PartyStrip party={party} />}
          </div>
        </div>
      </header>

      {isDraft && (
        <section className="relative mx-auto max-w-6xl">
          <div className="mb-7 text-center">
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
              {phase === 'starter-draft' ? 'Choose your first partner' : 'Victory reward'}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-slate-600">
              {phase === 'starter-draft'
                ? 'Build a team capable of clearing 15 stages, three checkpoint bosses, and the final Run Champion.'
                : party.length < 6
                  ? `Your survivors gained ${lastReward?.levelsGained ?? 2} levels. Add one of these Pokémon to your party.`
                  : `Your survivors gained ${lastReward?.levelsGained ?? 2} levels. Pick a recruit, then choose which party member it replaces.`}
            </p>
          </div>

          {phase === 'reward-draft' && lastReward && (
            <RewardSummary
              reward={lastReward}
              score={score}
              streak={winStreak}
              bestScore={bestScore}
              personalBestReached={personalBestReached}
            />
          )}

          {draftChoices.length === 0 ? (
            <div className="flex items-center justify-center gap-3 py-20 font-bold text-slate-500"><Loader2 className="animate-spin" /> Scouting Pokémon…</div>
          ) : (
            <div className={`grid gap-5 md:grid-cols-2 ${draftChoices.length >= 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-3'}`}>
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
              <div className="rounded-2xl bg-white/70 p-4 text-slate-600"><Compass className="mb-2 h-5 w-5 text-red-500" /><strong className="block text-slate-900">Choose the stakes</strong>Riskier routes strengthen opponents and multiply every reward.</div>
              <div className="rounded-2xl bg-white/70 p-4 text-slate-600"><Target className="mb-2 h-5 w-5 text-amber-600" /><strong className="block text-slate-900">Chain contracts</strong>Clear consecutive objectives to build a larger score multiplier.</div>
              <div className="rounded-2xl bg-white/70 p-4 text-slate-600"><Heart className="mb-2 h-5 w-5 text-pink-500" /><strong className="block text-slate-900">Faints are permanent</strong>Lose the whole party and the run ends.</div>
            </div>
          )}
        </section>
      )}

      {phase === 'upgrade-draft' && <UpgradeDraftScreen />}
      {phase === 'route-select' && <RouteSelectionScreen />}
      {phase === 'preparing-battle' && <VersusScreen />}
      {phase === 'battle' && <BattleArena />}
      {phase === 'replacement' && <ReplacementScreen />}

      {phase === 'run-complete' && (
        <RunCompleteScreen
          party={party}
          score={score}
          bestScore={bestScore}
          personalBestReached={personalBestReached}
          winStreak={winStreak}
          upgrades={upgrades}
          reward={lastReward}
          onRestart={startRun}
        />
      )}

      {phase === 'game-over' && (
        <section className="relative mx-auto max-w-xl overflow-hidden rounded-[2rem] border border-white bg-white/90 p-8 text-center shadow-2xl sm:p-12">
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-red-600 via-amber-400 to-blue-600" />
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100"><Shield className="h-10 w-10 text-slate-400" /></div>
          <h2 className="mt-5 text-4xl font-black text-slate-950">Run over</h2>
          <p className="mt-3 text-lg text-slate-600">You reached <strong>stage {stage}</strong>. No usable Pokémon remain.</p>
          <div className="mx-auto mt-6 grid max-w-lg grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Final score</p>
              <p className="mt-1 text-xl font-black text-slate-900">{score.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Contract chain</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xl font-black text-slate-900"><Target className="h-5 w-5 text-red-500" /> x{contractStreak}</p>
            </div>
            <div className="rounded-xl bg-slate-950 p-3 text-white">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Run grade</p>
              <p className="mt-1 text-xl font-black text-amber-300">{runGrade.rank}</p>
            </div>
          </div>
          <div className={`mx-auto mt-4 max-w-lg rounded-xl border px-4 py-3 ${personalBestReached ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
            <p className="flex items-center justify-center gap-2 text-sm font-black">
              <Crown className="h-4 w-4" /> {personalBestReached ? 'New personal best' : `Personal best ${bestScore.toLocaleString()}`}
            </p>
            <p className="mt-1 text-xs font-semibold">Grade {runGrade.rank} · {runGrade.title}. {runGrade.description}</p>
          </div>
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
