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
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldCheck,
  Star,
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
import type { ActiveBattlePokemon, BattleMoveChoice, BattleSide, BattleVisualEvent, OpponentTrainer, RunChallenge, RunChallengeProgress, RunMilestoneId, RunPokemon, RunRewardSummary, RunStats, RunUpgrade } from '../../types/battle-run';
import {
  RUN_MILESTONES,
  RUN_ROUTES,
  RUN_SECTORS,
  RUN_STAGE_LIMIT,
  getBossModifier,
  getContractChainMultiplier,
  getRecruitmentRewardProfile,
  getRunMilestoneProgress,
  getRunGrade,
  getRunSector,
  getStageChallengeProgress,
  isCheckpointStage,
  isFinalStage,
} from '../../utils/battle-run-rules';
import { BattlePokemonImage } from './BattlePokemonImage';
import { MoveBattleEffect } from './MoveBattleEffect';
import { TrainerImage } from './TrainerImage';
import { getRunArenaTheme } from './arena-themes';
import { preloadMoveAnimationAssets } from './move-animation-recipes';
import { analyzeDraftFit, analyzeReplacementImpact, getRecommendedDraftChoice } from '../../utils/battle-run-draft';
import type { DraftFitAnalysis } from '../../utils/battle-run-draft';
import { getBattleAiProfile } from '../../utils/battle-ai-profile';
import { getPartyDevelopmentChoices } from '../../services/battle-content.service';

const typeClasses: Record<string, string> = {
  Bug: 'bg-lime-600', Dark: 'bg-slate-700', Dragon: 'bg-indigo-600', Electric: 'bg-yellow-500',
  Fairy: 'bg-pink-400', Fighting: 'bg-red-700', Fire: 'bg-orange-500', Flying: 'bg-sky-400',
  Ghost: 'bg-purple-700', Grass: 'bg-green-600', Ground: 'bg-amber-700', Ice: 'bg-cyan-500',
  Normal: 'bg-stone-400', Poison: 'bg-violet-600', Psychic: 'bg-pink-600', Rock: 'bg-yellow-800',
  Steel: 'bg-slate-500', Water: 'bg-blue-600',
};

const contractProgressClasses: Record<RunChallengeProgress['status'], {
  panel: string;
  label: string;
  value: string;
}> = {
  'on-track': {
    panel: 'border-[var(--battle-contract-success-border)] bg-[var(--battle-contract-success-surface)]',
    label: 'text-[var(--battle-contract-success)]',
    value: 'text-[var(--battle-contract-success-strong)]',
  },
  'at-risk': {
    panel: 'border-[var(--battle-contract-warning-border)] bg-[var(--battle-contract-warning-surface)]',
    label: 'text-[var(--battle-contract-warning)]',
    value: 'text-[var(--battle-contract-warning-strong)]',
  },
  failed: {
    panel: 'border-[var(--battle-contract-danger-border)] bg-[var(--battle-contract-danger-surface)]',
    label: 'text-[var(--battle-contract-danger)]',
    value: 'text-[var(--battle-contract-danger-strong)]',
  },
};

function TypeBadges({ types, compact = false }: { types: string[]; compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {types.map(type => (
        <span
          key={type}
          className={`${typeClasses[type] ?? 'bg-gray-500'} rounded-full font-extrabold uppercase tracking-wide text-white ${compact ? 'px-2 py-0.5 text-[9px] sm:text-[10px]' : 'px-2.5 py-1 text-xs'}`}
        >
          {type}
        </span>
      ))}
    </div>
  );
}

function getEffectivenessPresentation(effectiveness: number | null): {
  label: string;
  shortLabel: string;
  classes: string;
} {
  if (effectiveness === null) {
    return {
      label: 'Status move · no damage multiplier',
      shortLabel: 'Status',
      classes: 'border-slate-200 bg-slate-100 text-slate-600',
    };
  }
  if (effectiveness === 0) {
    return {
      label: 'No effect · 0×',
      shortLabel: 'No effect',
      classes: 'border-slate-300 bg-slate-200 text-slate-700',
    };
  }
  if (effectiveness > 1) {
    return {
      label: `Super effective · ${effectiveness}×`,
      shortLabel: `${effectiveness}× effective`,
      classes: 'border-emerald-200 bg-emerald-100 text-emerald-800',
    };
  }
  if (effectiveness < 1) {
    return {
      label: `Not very effective · ${effectiveness}×`,
      shortLabel: `${effectiveness}× effective`,
      classes: 'border-amber-200 bg-amber-100 text-amber-800',
    };
  }
  return {
    label: 'Neutral damage · 1×',
    shortLabel: '1× effective',
    classes: 'border-blue-200 bg-blue-50 text-blue-700',
  };
}

function MoveDetails({ move, opponent }: { move: BattleMoveChoice; opponent?: string }) {
  const effectiveness = getEffectivenessPresentation(move.effectiveness);

  return (
    <div
      id={`battle-move-details-${move.slot}`}
      role="tooltip"
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm text-slate-950">{move.name}</strong>
            <span className={`${typeClasses[move.type] ?? 'bg-slate-400'} rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-white`}>{move.type}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${effectiveness.classes}`}>{effectiveness.label}</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{move.description || 'No move description is available.'}</p>
        </div>
        <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-400">
          vs {opponent ?? 'opponent'}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-5 gap-2 border-t border-slate-100 pt-2 text-[10px]">
        <div><dt className="font-bold text-slate-400">Category</dt><dd className="font-black text-slate-700">{move.category}</dd></div>
        <div><dt className="font-bold text-slate-400">Power</dt><dd className="font-black text-slate-700">{move.power || '—'}</dd></div>
        <div><dt className="font-bold text-slate-400">Accuracy</dt><dd className="font-black text-slate-700">{move.accuracy === true ? 'Always' : `${move.accuracy}%`}</dd></div>
        <div><dt className="font-bold text-slate-400">Priority</dt><dd className="font-black text-slate-700">{move.priority > 0 ? `+${move.priority}` : move.priority}</dd></div>
        <div><dt className="font-bold text-slate-400">PP</dt><dd className="font-black text-slate-700">{move.pp}/{move.maxpp}</dd></div>
      </dl>
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

function RunMilestoneBoard({
  stats,
  unlockedIds,
  title = 'Run medal board',
  expanded = false,
}: {
  stats: RunStats;
  unlockedIds: RunMilestoneId[];
  title?: string;
  expanded?: boolean;
}) {
  const progress = getRunMilestoneProgress(stats, unlockedIds);
  const completed = progress.filter(item => item.unlocked).length;

  return (
    <details open={expanded || undefined} className="group overflow-hidden rounded-2xl border border-[var(--battle-panel-border)] bg-[var(--battle-panel-surface)] shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-gradient-to-r from-amber-50 via-white to-emerald-50 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Medal className="h-4 w-4" /></span>
          <span>
            <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">Optional run goals</span>
            <strong className="block text-sm text-[var(--battle-panel-title)]">{title}</strong>
          </span>
        </span>
        <span className="flex items-center gap-2 text-[10px] font-black text-slate-600">
          {completed}/{RUN_MILESTONES.length} earned
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
        </span>
      </summary>
      <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
        {progress.map(({ milestone, current, unlocked }) => {
          const percent = Math.min(100, Math.round((current / milestone.target) * 100));
          return (
            <div key={milestone.id} className={`p-3.5 ${unlocked ? 'bg-emerald-50/70' : 'bg-white'}`}>
              <div className="flex items-start justify-between gap-2">
                <span>
                  <span className={`block text-[9px] font-black uppercase tracking-[0.14em] ${unlocked ? 'text-emerald-600' : 'text-slate-400'}`}>{unlocked ? 'Medal earned' : milestone.label}</span>
                  <strong className="mt-0.5 block text-sm text-slate-950">{milestone.title}</strong>
                </span>
                {unlocked
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  : <LockKeyhole className="h-4 w-4 shrink-0 text-slate-300" />}
              </div>
              <p className="mt-1.5 min-h-8 text-[11px] font-semibold leading-relaxed text-slate-500">{milestone.description}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full transition-all ${unlocked ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${percent}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-black">
                <span className={unlocked ? 'text-emerald-700' : 'text-slate-500'}>{current}/{milestone.target}</span>
                <span className="text-amber-700">+{milestone.scoreBonus.toLocaleString()}{milestone.scoutPasses > 0 ? ` · ${milestone.scoutPasses} Scout Pass` : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

function DraftCard({ pokemon, onChoose, label, fit, recommended = false }: {
  pokemon: RunPokemon;
  onChoose: () => void;
  label: string;
  fit?: DraftFitAnalysis;
  recommended?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChoose}
      className="group grid h-full self-stretch grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-md transition-[border-color,box-shadow] duration-200 hover:border-red-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-red-200 sm:grid-cols-1 sm:grid-rows-[12rem_minmax(0,1fr)]"
    >
      <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-gradient-to-br from-sky-100 via-white to-emerald-100 sm:h-48 sm:min-h-0">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-[18px] border-white/50" />
        <div className="absolute bottom-3 h-5 w-24 rounded-[50%] bg-emerald-900/10 blur-sm sm:h-8 sm:w-40" />
        <BattlePokemonImage
          id={pokemon.id}
          species={pokemon.species}
          variant="artwork"
          className="relative z-10 h-28 w-28 drop-shadow-xl transition duration-300 group-hover:scale-105 sm:h-40 sm:w-40"
        />
        <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-black text-white backdrop-blur sm:left-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-xs">
          LV. {pokemon.level}
        </span>
        {recommended && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-amber-950 shadow-md sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-[10px]">
            <Star className="h-3 w-3 fill-current sm:h-3.5 sm:w-3.5" /> Best fit
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col p-3.5 sm:p-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h3 className="min-w-0 flex-1 truncate text-lg font-black text-slate-950 sm:text-2xl">{pokemon.species}</h3>
          <div className="shrink-0"><TypeBadges types={pokemon.types} compact /></div>
        </div>
        <p className="text-xs font-bold text-slate-400 sm:text-sm">BST {pokemon.bst}</p>
        <div className="mt-2 rounded-xl bg-slate-50 p-2.5 sm:mt-3 sm:p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ability</p>
          <p className="mt-0.5 truncate text-xs font-extrabold text-slate-700 sm:text-sm">{pokemon.ability}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {pokemon.moves.slice(0, 4).map((move, index) => (
              <span key={move} className={`${index > 1 ? 'hidden sm:inline' : ''} truncate rounded-md bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500 shadow-sm sm:px-2 sm:py-1 sm:text-[11px]`}>{move}</span>
            ))}
          </div>
        </div>
        {fit && (
          <div className={`mt-2 rounded-xl border px-2.5 py-2 sm:mt-3 sm:px-3 sm:py-2.5 ${recommended ? 'border-amber-200 bg-amber-50' : 'border-sky-100 bg-sky-50/70'}`}>
            <div className="flex items-center justify-between gap-3">
              <span>
                <span className={`block text-[9px] font-black uppercase tracking-[0.16em] ${recommended ? 'text-amber-700' : 'text-sky-700'}`}>Team fit</span>
                <strong className="block text-xs text-slate-900 sm:text-sm">{fit.label}</strong>
              </span>
              <span className={`text-xs font-black ${fit.powerDelta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {fit.powerDelta === 0 ? 'Team average' : `${fit.powerDelta > 0 ? '+' : ''}${fit.powerDelta} BST`}
              </span>
            </div>
            <div className="mt-1.5 hidden flex-wrap gap-1.5 sm:flex">
              <span className={`rounded-full px-2 py-1 text-[9px] font-black ${fit.newTypes.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                {fit.newTypes.length > 0 ? `Adds ${fit.newTypes.join(' / ')}` : 'Typing represented'}
              </span>
              {fit.uniqueAbility && <span className="rounded-full bg-violet-100 px-2 py-1 text-[9px] font-black text-violet-700">New ability</span>}
            </div>
          </div>
        )}
        <div className="mt-2.5 flex items-center justify-between rounded-xl bg-red-600 px-3 py-2.5 text-xs font-black text-white transition group-hover:bg-red-700 sm:mt-auto sm:px-4 sm:py-3 sm:text-sm">
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
  const progressTheme = progress ? contractProgressClasses[progress.status] : null;
  return (
    <div className={`rounded-2xl border border-[var(--battle-contract-border)] bg-[var(--battle-contract-surface)] text-[var(--battle-contract-title)] shadow-lg shadow-slate-200/60 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span className={`flex shrink-0 items-center justify-center rounded-xl bg-[var(--battle-contract-accent-surface)] text-[var(--battle-contract-accent)] ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}>
            <Target className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </span>
          <span className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--battle-contract-accent)]">Stage contract</span>
            <strong className={`block truncate ${compact ? 'text-sm' : 'text-lg'}`}>{challenge.title}</strong>
            <span className={`mt-0.5 block leading-relaxed text-[var(--battle-contract-copy)] ${compact ? 'text-[11px]' : 'text-sm'}`}>{challenge.description}</span>
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--battle-contract-bounty-surface)] px-2.5 py-1 text-right text-xs font-black text-[var(--battle-contract-bounty)]">
          <span className="block">+{payout.toLocaleString()}</span>
          {chainMultiplier > 1 && <span className="block text-[8px] uppercase tracking-wider opacity-70">Chain x{chainMultiplier.toFixed(2)}</span>}
        </span>
      </div>
      {progress && progressTheme && (
        <div className={`mt-3 rounded-xl border px-3 py-2 ${progressTheme.panel}`}>
          <div className="flex items-center justify-between gap-3">
            <span className={`text-[10px] font-black uppercase tracking-wider ${progressTheme.label}`}>
              {progress.label}
            </span>
            <span className="flex items-center gap-3">
              {progress.metrics.map(metric => (
                <span key={metric.label} className="text-right">
                  <span className="block text-[8px] font-black uppercase text-[var(--battle-contract-muted)]">{metric.label}</span>
                  <strong className={`block text-xs ${progressTheme.value}`}>{metric.value}</strong>
                </span>
              ))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function RewardSummary({ reward, score, streak, upgrades, bestScore, personalBestReached, final = false }: {
  reward: RunRewardSummary;
  score: number;
  streak: number;
  upgrades: RunUpgrade[];
  bestScore?: number;
  personalBestReached?: boolean;
  final?: boolean;
}) {
  const recruitmentReward = getRecruitmentRewardProfile(reward.stage + 1, reward.route, upgrades);
  const bonuses = [
    { label: 'Stage clear', value: reward.stageScore, icon: Trophy },
    { label: `${reward.survivors} survived`, value: reward.survivalBonus, icon: ShieldCheck },
    { label: `${reward.turns} turns`, value: reward.tempoBonus, icon: Gauge },
    ...(reward.flawlessBonus > 0 ? [{ label: 'Flawless team', value: reward.flawlessBonus, icon: Heart }] : []),
    ...(reward.checkpointBonus > 0 ? [{ label: 'Checkpoint', value: reward.checkpointBonus, icon: Flag }] : []),
    ...(reward.routeBonus > 0 && reward.route ? [{ label: reward.route.title, value: reward.routeBonus, icon: Compass }] : []),
    ...(reward.milestoneBonus > 0 ? [{ label: 'Run medals', value: reward.milestoneBonus, icon: Medal }] : []),
  ];

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--battle-panel-border)] bg-[var(--battle-panel-surface)] text-[var(--battle-panel-title)] shadow-xl shadow-slate-200/70">
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--battle-panel-border)] bg-gradient-to-r from-red-50 via-white to-sky-50 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Stage {reward.stage} cleared</p>
          <p className="mt-1 text-xl font-black">Performance reward</p>
        </div>
        <div className="flex items-end gap-5">
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Earned</p>
            <p className="text-2xl font-black text-amber-700">+{reward.totalScore.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Run score</p>
            <p className="text-lg font-black">{score.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Wins</p>
            <p className="flex items-center justify-end gap-1 text-lg font-black"><Flame className="h-4 w-4 text-orange-600" /> {streak}</p>
          </div>
        </div>
      </div>
      {personalBestReached && score === bestScore && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-xs font-black text-amber-800">
          <span className="flex items-center gap-2"><Crown className="h-4 w-4" /> {final ? 'New personal best secured' : 'Personal best in progress'}</span>
          <span>{bestScore.toLocaleString()} points</span>
        </div>
      )}
      <div className="grid gap-px bg-[var(--battle-panel-border)] [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        {bonuses.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center justify-between gap-3 bg-[var(--battle-panel-surface)] px-4 py-3">
            <span className="flex items-center gap-2 text-xs font-bold text-[var(--battle-panel-copy)]"><Icon className="h-3.5 w-3.5 text-[var(--battle-panel-muted)]" /> {label}</span>
            <strong className="text-sm text-[var(--battle-panel-title)]">+{value}</strong>
          </div>
        ))}
      </div>
      {reward.challenge && (
        <div className={`flex items-center justify-between gap-4 border-t px-5 py-3 ${reward.challengeCompleted ? 'border-[var(--battle-contract-success-border)] bg-[var(--battle-contract-success-surface)]' : 'border-[var(--battle-contract-danger-border)] bg-[var(--battle-contract-danger-surface)]'}`}>
          <div className="flex items-center gap-3">
            {reward.challengeCompleted
              ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--battle-contract-success)]" />
              : <XCircle className="h-5 w-5 shrink-0 text-[var(--battle-contract-danger)]" />}
            <div>
              <p className={`text-xs font-black uppercase tracking-wider ${reward.challengeCompleted ? 'text-[var(--battle-contract-success)]' : 'text-[var(--battle-contract-danger)]'}`}>
                {reward.challengeCompleted ? `Contract cleared · ${reward.contractStreak} chain` : 'Contract missed · chain reset'}
              </p>
              <p className="text-sm font-bold text-[var(--battle-contract-title)]">{reward.challenge.title}</p>
            </div>
          </div>
          <span className="text-right">
            <strong className={`block ${reward.challengeCompleted ? 'text-[var(--battle-contract-success-strong)]' : 'text-[var(--battle-contract-danger-strong)]'}`}>
              {reward.challengeCompleted ? `+${reward.challengeBonus.toLocaleString()}` : 'No bonus'}
            </strong>
            {reward.challengeCompleted && reward.challengeMultiplier > 1 && (
              <span className="block text-[9px] font-black uppercase tracking-wider text-[var(--battle-contract-success)] opacity-70">Chain x{reward.challengeMultiplier.toFixed(2)}</span>
            )}
            {reward.scoutPassesEarned > 0 && (
              <span className="mt-1 flex items-center justify-end gap-1 text-[9px] font-black uppercase tracking-wider text-sky-700">
                <RefreshCw className="h-3 w-3" /> +{reward.scoutPassesEarned} Scout {reward.scoutPassesEarned === 1 ? 'Pass' : 'Passes'}
              </span>
            )}
          </span>
        </div>
      )}
      {reward.milestonesUnlocked.length > 0 && (
        <div className="flex items-center justify-between gap-4 border-t border-amber-200 bg-amber-50 px-5 py-3">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Medal className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">Run medal unlocked</span>
              <strong className="block truncate text-sm text-amber-950">{reward.milestonesUnlocked.map(milestone => milestone.title).join(' · ')}</strong>
            </span>
          </span>
          <span className="shrink-0 text-right">
            <strong className="block text-sm text-amber-800">+{reward.milestoneBonus.toLocaleString()}</strong>
            {reward.milestoneScoutPasses > 0 && (
              <span className="mt-0.5 flex items-center justify-end gap-1 text-[9px] font-black uppercase tracking-wider text-sky-700">
                <RefreshCw className="h-3 w-3" /> +{reward.milestoneScoutPasses} Scout {reward.milestoneScoutPasses === 1 ? 'Pass' : 'Passes'}
              </span>
            )}
          </span>
        </div>
      )}
      {!final && reward.route && (
        <div className="flex items-center justify-between gap-4 border-t border-indigo-200 bg-indigo-50 px-5 py-3">
          <span className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700"><Medal className="h-4 w-4" /></span>
            <span>
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-indigo-700">{reward.route.title} spoils secured</span>
              <strong className="block text-sm text-indigo-950">Level {recruitmentReward.level} recruitment pool</strong>
            </span>
          </span>
          <span className="text-right text-xs font-black text-indigo-700">
            {recruitmentReward.choiceCount} choices
            {reward.route.recruitmentChoiceBonus > 0 && <span className="block text-[9px] uppercase tracking-wider text-indigo-600">+{reward.route.recruitmentChoiceBonus} route bonus</span>}
          </span>
        </div>
      )}
      <div className="border-t border-emerald-200 bg-emerald-50 px-5 py-2.5 text-xs font-bold text-emerald-700">
        {final ? 'Final checkpoint secured. The challenge is complete.' : `Surviving Pokémon gained ${reward.levelsGained} levels.`}
      </div>
    </div>
  );
}

function TrainerCard({ trainer, stage }: {
  trainer: OpponentTrainer;
  stage: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--battle-panel-border)] bg-[var(--battle-panel-surface)] p-4 text-[var(--battle-panel-title)] shadow-lg shadow-slate-200/60 backdrop-blur">
      <TrainerImage src={trainer.image} name={trainer.name} className="h-20 w-20" />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-red-600">
          <Bot className="h-3 w-3" /> {trainer.title}
        </div>
        <p className="truncate text-2xl font-black">{trainer.name}</p>
        <div className="mt-1 flex gap-1" aria-label={`Difficulty ${Math.min(5, Math.ceil(stage / 2))} of 5`}>
          {Array.from({ length: 5 }, (_, index) => (
            <Zap key={index} className={`h-3 w-3 ${index < Math.min(5, Math.ceil(stage / 2)) ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} />
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
  const bossModifier = getBossModifier(stage);
  const aiProfile = getBattleAiProfile(stage);

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
  const battleLog = useBattleRunStore(state => state.battleLog);
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

function BattleArena() {
  const snapshot = useBattleRunStore(state => state.snapshot);
  const stage = useBattleRunStore(state => state.stage);
  const activeChallenge = useBattleRunStore(state => state.activeChallenge);
  const activeRoute = useBattleRunStore(state => state.activeRoute);
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
  const [inspectedMoveSlot, setInspectedMoveSlot] = useState<number | null>(null);
  const nextVisual = visualEvents[0];
  const controlsLocked = activeVisual !== null || visualEvents.length > 0;
  const inspectedMove = decision.kind === 'move'
    ? decision.moves.find(move => move.slot === inspectedMoveSlot)
    : undefined;

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

  useEffect(() => {
    if (decision.kind !== 'move') setInspectedMoveSlot(null);
  }, [decision.kind]);

  const challengeProgress = activeChallenge && displaySnapshot
    ? getStageChallengeProgress(activeChallenge, displaySnapshot.turn, partySize, displaySnapshot.playerRemaining)
    : null;
  const arenaTheme = getRunArenaTheme(stage, activeRoute?.id);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-3 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg sm:rounded-[2rem] sm:shadow-2xl">
        <div className="battle-stage relative h-[min(46svh,360px)] min-h-[310px] overflow-hidden bg-slate-950 sm:h-[clamp(430px,52svh,500px)]">
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
          {challengeProgress && (
            <div className={`absolute right-2.5 top-10 z-20 w-[34%] rounded-xl border px-2 py-1.5 text-right shadow-lg backdrop-blur sm:hidden ${contractProgressClasses[challengeProgress.status].panel}`}>
              <span className={`block text-[8px] font-black uppercase tracking-wider ${contractProgressClasses[challengeProgress.status].label}`}>{challengeProgress.label}</span>
              <strong className={`mt-0.5 block text-xs ${contractProgressClasses[challengeProgress.status].value}`}>{challengeProgress.metrics.map(metric => metric.value).join(' · ')}</strong>
            </div>
          )}

          <div className="absolute right-[5%] top-[29%] z-10 flex h-28 w-[39%] items-end justify-center sm:right-[10%] sm:h-44 sm:w-[34%]">
            {displaySnapshot?.opponent && (
              <div className={`relative h-full w-full ${pokemonMotion(activeVisual, 'opponent')}`}>
                <BattlePokemonImage id={displaySnapshot.opponent.id} species={displaySnapshot.opponent.species} side="p2" className="h-full w-full drop-shadow-2xl" />
              </div>
            )}
          </div>

          <div className="absolute bottom-[7%] left-[1%] z-10 flex h-32 w-[39%] items-end justify-center sm:bottom-[5%] sm:left-[8%] sm:h-48 sm:w-[38%]">
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

          <div className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-white/95 px-2 py-1 text-[7px] font-black text-slate-800 shadow-md backdrop-blur sm:right-5 sm:top-5">
            <span>TURN {displaySnapshot?.turn ?? 0}</span>
            <span className="h-3 w-px bg-slate-300" />
            <span>YOU {displaySnapshot?.playerRemaining ?? 0}</span>
            <span className="text-red-300">VS</span>
            <span>{displaySnapshot?.opponentRemaining ?? 0} NPC</span>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-3 sm:p-6">
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
              <div className="mb-3 hidden min-h-[124px] sm:block">
                {inspectedMove ? (
                  <MoveDetails move={inspectedMove} opponent={displaySnapshot?.opponent?.species} />
                ) : (
                  <div className="flex min-h-[124px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 text-center text-xs font-bold text-slate-500">
                    Hover or focus a move to inspect its description, battle stats, and matchup against {displaySnapshot?.opponent?.species ?? 'the active opponent'}.
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                {decision.moves.map(move => {
                  const effectiveness = getEffectivenessPresentation(move.effectiveness);
                  return (
                    <button
                      key={move.slot}
                      type="button"
                      disabled={move.disabled || controlsLocked}
                      onClick={() => chooseMove(move.slot)}
                      onMouseEnter={() => setInspectedMoveSlot(move.slot)}
                      onMouseLeave={() => setInspectedMoveSlot(current => current === move.slot ? null : current)}
                      onFocus={() => setInspectedMoveSlot(move.slot)}
                      onBlur={() => setInspectedMoveSlot(current => current === move.slot ? null : current)}
                      aria-describedby={inspectedMoveSlot === move.slot ? `battle-move-details-${move.slot}` : undefined}
                      className="group relative min-h-[92px] touch-manipulation overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 text-left transition active:scale-[0.98] hover:border-red-300 hover:shadow-md focus-visible:border-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-40 sm:rounded-2xl sm:p-3 xl:min-h-[108px]"
                    >
                      <span className={`absolute inset-y-0 left-0 w-1.5 ${typeClasses[move.type] ?? 'bg-slate-400'}`} />
                      <span className="flex items-start justify-between gap-3 pl-2">
                        <span>
                          <span className="block text-sm font-black leading-tight text-slate-900 sm:text-base">{move.name}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-bold text-slate-500 sm:text-[11px]">
                            <span className={`${typeClasses[move.type] ?? 'bg-slate-400'} rounded px-1.5 py-0.5 text-[9px] uppercase text-white`}>{move.type}</span>
                            <span className="hidden sm:inline">{move.category} · </span>{move.power || '—'} power
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-[11px] font-black text-slate-500">
                          {move.pp}/{move.maxpp}<span className="block font-bold text-slate-400">PP</span>
                        </span>
                      </span>
                      <span className="mt-2 flex items-center justify-between gap-1 pl-2 text-[9px] font-bold sm:text-[10px]">
                        <span className="hidden text-slate-400 sm:inline">Accuracy {move.accuracy === true ? '—' : `${move.accuracy}%`}</span>
                        <span className={`rounded-full border px-1.5 py-0.5 font-black ${effectiveness.classes}`}>{effectiveness.shortLabel}</span>
                      </span>
                    </button>
                  );
                })}
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
            <details className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
              <summary className="min-h-6 cursor-pointer text-sm font-black text-blue-800">Switch Pokémon instead</summary>
              <div className="mt-3"><SwitchChoices choices={availableSwitches} onChoose={chooseSwitch} /></div>
            </details>
          )}
        </div>
      </section>

      <MobileBattleSummary />
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
  const bossModifier = getBossModifier(stage);
  const aiProfile = getBattleAiProfile(stage);
  if (!trainer) return null;

  return (
    <section className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white bg-white/90 shadow-2xl">
      <div className="relative grid items-center overflow-hidden bg-gradient-to-br from-sky-100 via-white to-red-100 p-7 text-slate-950 sm:grid-cols-[1fr_auto_1fr] sm:p-10">
        <div className="text-center">
          <TrainerImage src="/images/trainers/player.png" name="You" className="mx-auto h-32 w-32 drop-shadow-2xl sm:h-40 sm:w-40" />
          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-blue-700">Challenger</p>
          <p className="text-2xl font-black">You</p>
        </div>
        <div className="my-5 text-center sm:mx-8 sm:my-0">
          <div className="rounded-full border-4 border-white bg-red-600 p-4 text-2xl font-black italic text-white shadow-xl shadow-red-200">VS</div>
        </div>
        <div className="text-center">
          <TrainerImage src={trainer.image} name={trainer.name} className="mx-auto h-32 w-32 drop-shadow-2xl sm:h-40 sm:w-40" />
          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-red-700">{trainer.title}</p>
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
        <div className="mt-2 flex items-center justify-center gap-2 text-xs font-black text-indigo-600">
          <Bot className="h-3.5 w-3.5" /> {aiProfile.title} strategy · {aiProfile.label}
        </div>
        <p className="mt-3 text-lg font-bold italic text-slate-700">“{trainer.intro}”</p>
        {activeChallenge && (
          <div className="mx-auto mt-4 max-w-xl text-left">
            <ChallengeCard challenge={activeChallenge} chainMultiplier={getContractChainMultiplier(contractStreak)} />
          </div>
        )}
        {bossModifier && (
          <div className="mx-auto mt-4 flex max-w-xl items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-amber-950">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-200/70"><ShieldCheck className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">Boss mechanic · {bossModifier.label}</span>
              <strong className="block text-sm">{bossModifier.title}</strong>
              <span className="mt-0.5 block text-xs font-semibold leading-relaxed text-amber-800">{bossModifier.description}</span>
            </span>
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-amber-800 shadow-sm">{bossModifier.item}</span>
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

function LeadSelectionScreen() {
  const stage = useBattleRunStore(state => state.stage);
  const party = useBattleRunStore(state => state.party);
  const chooseLead = useBattleRunStore(state => state.chooseLead);
  const sector = getRunSector(stage);

  return (
    <section className="relative mx-auto max-w-5xl">
      <div className="mb-4 text-center sm:mb-7">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">Stage {stage} formation</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-4xl">Choose your lead Pokémon</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
          Pick who enters battle first. The rest of your team keeps its current rotation, and opponent scouting opens after your lead is locked in.
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/90 px-3 py-2.5 text-blue-950 shadow-sm sm:mb-5 sm:rounded-2xl sm:px-4 sm:py-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-200">
            <ArrowLeftRight className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">Rotation order</span>
            <strong className="block text-sm sm:text-base">Lead selection comes before route and opponent selection</strong>
          </span>
        </span>
        <span className="hidden shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm sm:block">
          {sector.title}
        </span>
      </div>

      <div className={`grid gap-3 sm:gap-4 ${party.length >= 4 ? 'md:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {party.map((pokemon, index) => (
          <button
            key={pokemon.species}
            type="button"
            onClick={() => chooseLead(index)}
            className="group grid grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-md transition duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 sm:block"
          >
            <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-gradient-to-br from-blue-100 via-white to-emerald-100 sm:h-40 sm:min-h-0">
              <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                Slot {index + 1}
              </span>
              {index === 0 && (
                <span className="absolute right-3 top-3 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                  Current lead
                </span>
              )}
              <BattlePokemonImage
                id={pokemon.id}
                species={pokemon.species}
                variant="artwork"
                className="h-28 w-28 drop-shadow-xl transition duration-200 group-hover:scale-105 sm:h-36 sm:w-36"
              />
            </div>
            <div className="min-w-0 p-3 sm:p-4">
              <div className="min-w-0">
                <strong className="block truncate text-lg text-slate-950 sm:text-xl">{pokemon.species}</strong>
                <span className="text-xs font-black text-slate-400">LV. {pokemon.level} · BST {pokemon.bst}</span>
              </div>

              <div className="mt-2">
                <TypeBadges types={pokemon.types} />
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Ability</span>
                <strong className="mt-0.5 block truncate text-xs text-slate-700">{pokemon.ability}</strong>
                <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Moves</span>
                <span className="mt-1 grid grid-cols-2 gap-1">
                  {pokemon.moves.map(move => (
                    <span key={move} title={move} className="truncate rounded-md bg-white px-1.5 py-1 text-[9px] font-bold text-slate-600 shadow-sm">
                      {move}
                    </span>
                  ))}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black text-white transition-colors group-hover:bg-blue-700 sm:px-3.5 sm:text-sm">
                {index === 0 ? 'Keep as lead' : 'Send out first'}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function RouteSelectionScreen() {
  const stage = useBattleRunStore(state => state.stage);
  const selectRoute = useBattleRunStore(state => state.selectRoute);
  const party = useBattleRunStore(state => state.party);
  const upgrades = useBattleRunStore(state => state.upgrades);
  const activeChallenge = useBattleRunStore(state => state.activeChallenge);
  const contractStreak = useBattleRunStore(state => state.contractStreak);
  const trainer = useBattleRunStore(state => state.opponentTrainer);
  const routePreviews = useBattleRunStore(state => state.routePreviews);
  const runStats = useBattleRunStore(state => state.runStats);
  const unlockedMilestoneIds = useBattleRunStore(state => state.unlockedMilestoneIds);
  const checkpoint = isCheckpointStage(stage);
  const sector = getRunSector(stage);
  const finalStage = isFinalStage(stage);
  const bossModifier = getBossModifier(stage);
  const chainMultiplier = getContractChainMultiplier(contractStreak);
  const aiProfile = getBattleAiProfile(stage);

  return (
    <section className="relative mx-auto max-w-6xl">
      <div className="mb-4 text-center sm:mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-600">Sector {sector.number} of {RUN_SECTORS.length} · {sector.title}</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-4xl">{finalStage ? 'Choose the stakes for the final boss' : `Set the stakes for stage ${stage}`}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
          {sector.objective} Higher-risk routes strengthen the opposing team, but multiply every point earned from the battle and its contract.
        </p>
      </div>

      {party[0] && (
        <div className="mx-auto mb-3 flex max-w-4xl items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/90 px-3 py-2 text-blue-950 shadow-sm sm:mb-4 sm:rounded-2xl sm:px-4 sm:py-3">
          <span className="flex min-w-0 items-center gap-3">
            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white shadow-sm">
              <BattlePokemonImage id={party[0].id} species={party[0].species} variant="icon" className="h-full w-full" />
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">Lead locked</span>
              <strong className="block truncate text-base">{party[0].species} will enter first</strong>
            </span>
          </span>
          <div className="hidden sm:block"><PartyStrip party={party} /></div>
        </div>
      )}

      {(trainer || activeChallenge) && (
        <details className="group mx-auto mb-3 max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-2.5">
              {trainer && <TrainerImage src={trainer.image} name={trainer.name} className="h-10 w-10 shrink-0" />}
              <span className="min-w-0 text-left">
                <strong className="block truncate text-sm text-slate-900">{trainer?.name ?? 'Stage challenge'}</strong>
                <span className="block truncate text-[10px] font-bold text-slate-500">{activeChallenge?.title ?? aiProfile.title}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs font-black text-slate-500">Details <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" /></span>
          </summary>
          <div className="space-y-2 border-t border-slate-200 bg-slate-50 p-3">
            {trainer && <p className="text-xs font-semibold italic leading-relaxed text-slate-600">“{trainer.intro}”</p>}
            {activeChallenge && <ChallengeCard challenge={activeChallenge} compact chainMultiplier={chainMultiplier} />}
            <p className="text-[11px] font-bold text-amber-800">Contract chain: {contractStreak} · score x{chainMultiplier.toFixed(2)}</p>
          </div>
        </details>
      )}

      {trainer && (
        <div className="mx-auto mb-3 hidden max-w-4xl items-center gap-3 overflow-hidden rounded-xl border border-[var(--battle-panel-border)] bg-[var(--battle-panel-surface)] px-3 text-[var(--battle-panel-title)] shadow-sm sm:mb-4 sm:flex sm:gap-4 sm:rounded-2xl sm:px-4 sm:shadow-lg">
          <TrainerImage src={trainer.image} name={trainer.name} className="h-16 w-16 self-end sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-600">Scouted challenger · {trainer.title}</p>
            <p className="mt-0.5 text-lg font-black sm:text-xl">{trainer.name}</p>
            <p className="mt-1 truncate text-xs font-semibold italic text-slate-500">“{trainer.intro}”</p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 sm:flex">
            <Bot className="h-4 w-4" /> {aiProfile.title} · {aiProfile.label}
          </div>
        </div>
      )}

      <div className="mx-auto mb-4 hidden max-w-4xl sm:block">
        <RunMilestoneBoard stats={runStats} unlockedIds={unlockedMilestoneIds} />
      </div>

      {activeChallenge && (
        <div className="mx-auto mb-4 hidden max-w-4xl gap-3 sm:grid lg:grid-cols-[1fr_220px]">
          <ChallengeCard challenge={activeChallenge} chainMultiplier={chainMultiplier} />
          <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm lg:flex-col lg:items-start lg:justify-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/60 text-amber-800">
              <Target className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">Contract chain</span>
              <strong className="block text-lg">{contractStreak} cleared in a row</strong>
              <span className="mt-1 block text-xs font-semibold leading-relaxed text-amber-800">
                {finalStage
                  ? `Clear this final objective for x${chainMultiplier.toFixed(2)} contract score and secure the completed chain.`
                  : `Clear this objective for x${chainMultiplier.toFixed(2)} contract score and a Scout Pass. Apex awards two; a miss resets the chain.`}
              </span>
            </span>
          </div>
        </div>
      )}

      {checkpoint && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900">
          <Flag className="h-4 w-4" /> {bossModifier
            ? `${sector.bossTitle}: ${bossModifier.title} equips every scouted opponent with ${bossModifier.item}.`
            : finalStage
              ? `${sector.bossTitle}: win this battle to complete the challenge.`
              : `${sector.bossTitle}: checkpoint modifiers stack with your route.`}
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

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        {RUN_ROUTES.map((route, index) => {
          const preview = routePreviews[route.id];
          const recruitmentReward = getRecruitmentRewardProfile(stage + 1, route, upgrades);
          const routeDescription = finalStage
            ? route.id === 'trail'
              ? 'Face the Run Champion at normal strength and protect the score already secured.'
              : route.id === 'rival'
                ? 'The Run Champion gains two levels. Win the final battle for 25% more score.'
                : 'The Run Champion gains four levels and may add one team member. Win for 60% more score.'
            : route.description;
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
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-md transition duration-200 hover:-translate-y-1 hover:border-slate-400 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-red-200"
            >
              <div className={`flex items-center justify-between border-b p-3 sm:p-4 ${accent}`}>
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80"><Icon className="h-5 w-5" /></span>
                  <span>
                    <span className="block text-[9px] font-black uppercase tracking-[0.2em]">Route {index + 1}</span>
                    <strong className="block text-lg text-slate-950">{route.title}</strong>
                  </span>
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black text-slate-800 shadow-sm">x{route.scoreMultiplier}</span>
              </div>
              <div className="flex flex-1 flex-col p-3.5 sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{route.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 lg:min-h-[4.5rem]">{routeDescription}</p>

                {finalStage ? (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-950">
                    <span className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-amber-700" />
                      <span>
                        <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-amber-600">Final wager</span>
                        <strong className="block text-xs">Route score decides the final grade</strong>
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-amber-800 shadow-sm">No draft</span>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-indigo-950">
                    <span className="flex items-center gap-2">
                      <Medal className="h-4 w-4 text-indigo-600" />
                      <span>
                        <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-indigo-500">Victory spoils</span>
                        <strong className="block text-xs">Level {recruitmentReward.level} recruit pool</strong>
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-indigo-700 shadow-sm">{recruitmentReward.choiceCount} choices</span>
                  </div>
                )}

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:mt-4 sm:p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                      <Bot className="h-3.5 w-3.5" /> Scouted roster
                    </span>
                    <span className="hidden text-[9px] font-black uppercase text-emerald-600 sm:inline">Exact match</span>
                  </div>
                  <div className="flex gap-1.5 sm:grid sm:[grid-template-columns:repeat(auto-fit,minmax(72px,1fr))]">
                    {preview.map(pokemon => (
                      <div key={pokemon.species} className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-left shadow-sm sm:block sm:px-1.5 sm:py-2 sm:text-center">
                        <BattlePokemonImage id={pokemon.id} species={pokemon.species} variant="icon" className="h-9 w-9 shrink-0 sm:mx-auto sm:h-11 sm:w-11" />
                        <span className="min-w-0">
                          <strong className="block truncate text-[10px] text-slate-800">{pokemon.species}</strong>
                          <span className="block text-[9px] font-black text-slate-400">LV. {pokemon.level}</span>
                          {pokemon.item && <span className="mt-1 hidden truncate rounded bg-amber-100 px-1 py-0.5 text-[8px] font-black text-amber-800 sm:block">{pokemon.item}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:mt-5">
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
                <div className="mt-3 flex items-center justify-between rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-sm shadow-red-200 transition-colors group-hover:bg-red-700 sm:mt-4">
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
      <div className="mb-4 text-center sm:mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">Checkpoint cleared</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-4xl">Choose a permanent run upgrade</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
          Stage {stage} secured. This upgrade remains active until the run ends and changes every future encounter or reward.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-900">
          <Trophy className="h-3.5 w-3.5 text-amber-600" /> Current score {score.toLocaleString()}
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
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
              className="group flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-md transition duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-amber-200 sm:min-h-64 sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Permanent</span>
              </div>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 sm:mt-5">{upgrade.label}</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">{upgrade.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{upgrade.description}</p>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white shadow-sm shadow-amber-200 transition-colors group-hover:bg-amber-700">
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
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 sm:h-16 sm:w-16 sm:rounded-2xl"><ArrowLeftRight className="h-6 w-6 sm:h-8 sm:w-8" /></div>
      <h2 className="mt-3 text-2xl font-black text-slate-950 sm:mt-4 sm:text-3xl">Your party is full</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 sm:text-base">Choose a team member for <strong>{recruit.species}</strong> to replace. The replaced Pokémon permanently leaves this run.</p>

      <div className="mt-5 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {party.map((pokemon, index) => {
          const impact = analyzeReplacementImpact(party, recruit, index);
          const coveragePreserved = impact.gainedTypes.length === 0 && impact.lostTypes.length === 0;
          return (
            <button
              key={pokemon.species}
              type="button"
              onClick={() => replace(index)}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-md transition hover:-translate-y-1 hover:border-red-400 hover:bg-red-50 sm:gap-4 sm:p-4"
            >
              <div className="h-20 w-20 shrink-0 rounded-xl bg-sky-50 p-1 sm:h-24 sm:w-24 sm:rounded-2xl">
                <BattlePokemonImage id={pokemon.id} species={pokemon.species} variant="artwork" className="h-full w-full" />
              </div>
              <span className="min-w-0 flex-1">
                <strong className="block text-lg text-slate-900">{pokemon.species}</strong>
                <span className="text-sm font-semibold text-slate-500">Level {pokemon.level} · BST {pokemon.bst}</span>
                <span className="mt-2 flex flex-wrap gap-1">
                  <span className={`rounded-full px-2 py-1 text-[9px] font-black ${impact.powerDelta > 0 ? 'bg-emerald-100 text-emerald-700' : impact.powerDelta < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {impact.powerDelta === 0 ? 'BST unchanged' : `${impact.powerDelta > 0 ? '+' : ''}${impact.powerDelta} BST`}
                  </span>
                  {impact.gainedTypes.map(type => <span key={`gain-${type}`} className="rounded-full bg-sky-100 px-2 py-1 text-[9px] font-black text-sky-700">Adds {type}</span>)}
                  {impact.lostTypes.map(type => <span key={`loss-${type}`} className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black text-amber-800">Loses {type}</span>)}
                  {coveragePreserved && <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-600">Coverage preserved</span>}
                </span>
                <span className="mt-2 block text-xs font-black text-red-600">REPLACE WITH {recruit.species.toUpperCase()}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PartyDevelopmentScreen() {
  const party = useBattleRunStore(state => state.party);
  const develop = useBattleRunStore(state => state.developPartyMember);
  const close = useBattleRunStore(state => state.closePartyDevelopment);
  const choices = getPartyDevelopmentChoices(party);
  const hasMega = party.some(pokemon => pokemon.isMega);

  return (
    <section className="relative mx-auto max-w-6xl">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700 sm:h-16 sm:w-16 sm:rounded-2xl">
          <Zap className="h-6 w-6 sm:h-8 sm:w-8" />
        </div>
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">Party development</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-4xl">Evolve a current partner</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
          Spend this stage reward to evolve one partner. Fully evolved Pokémon with a Mega form can permanently Mega Evolve for the rest of the run.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[10px] font-black">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Level is preserved</span>
          <span className={`rounded-full px-3 py-1 ${hasMega ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-600'}`}>
            {hasMega ? 'Mega slot already used' : 'One Mega per party'}
          </span>
        </div>
      </div>

      {choices.length > 0 ? (
        <div className="mt-6 space-y-4 sm:mt-8">
          {choices.map(choice => (
            <div key={`${choice.partyIndex}-${choice.current.species}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
              <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 sm:gap-4 sm:px-5">
                <div className="h-14 w-14 shrink-0 rounded-xl bg-white p-1 shadow-sm sm:h-16 sm:w-16">
                  <BattlePokemonImage id={choice.current.id} species={choice.current.species} variant="artwork" className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Current partner</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-lg text-slate-950 sm:text-xl">{choice.current.species}</strong>
                    <TypeBadges types={choice.current.types} compact />
                  </div>
                  <span className="text-xs font-bold text-slate-500">Level {choice.current.level} · BST {choice.current.bst} · {choice.current.ability}</span>
                </div>
              </div>

              <div className={`grid gap-2 p-3 sm:gap-3 sm:p-4 ${choice.options.length > 1 ? 'md:grid-cols-2 xl:grid-cols-3' : ''}`}>
                {choice.options.map(option => {
                  const bstGain = option.pokemon.bst - choice.current.bst;
                  return (
                    <button
                      key={option.pokemon.species}
                      type="button"
                      onClick={() => develop(choice.partyIndex, option.pokemon.species)}
                      className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 sm:p-4 ${option.kind === 'mega' ? 'border-violet-200 bg-violet-50/70 hover:border-violet-400 focus:ring-violet-200' : 'border-emerald-200 bg-emerald-50/70 hover:border-emerald-400 focus:ring-emerald-200'}`}
                    >
                      <div className="h-20 w-20 shrink-0 rounded-xl bg-white p-1 shadow-sm sm:h-24 sm:w-24">
                        <BattlePokemonImage id={option.pokemon.id} species={option.pokemon.species} variant="artwork" className="h-full w-full" />
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[9px] font-black uppercase tracking-[0.18em] ${option.kind === 'mega' ? 'text-violet-700' : 'text-emerald-700'}`}>
                          {option.kind === 'mega' ? 'Mega Evolution' : 'Evolution'}
                        </span>
                        <strong className="mt-0.5 block truncate text-base text-slate-950 sm:text-lg">{option.pokemon.species}</strong>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <TypeBadges types={option.pokemon.types} compact />
                          <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-emerald-700">+{bstGain} BST</span>
                        </span>
                        <span className="mt-1.5 block truncate text-[11px] font-bold text-slate-500">Ability · {option.pokemon.ability}</span>
                        <span className={`mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-xs font-black text-white ${option.kind === 'mega' ? 'bg-violet-700 group-hover:bg-violet-800' : 'bg-emerald-600 group-hover:bg-emerald-700'}`}>
                          {option.kind === 'mega' ? 'Mega Evolve' : 'Evolve'} <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-600">
          No party member can currently evolve or use the available Mega slot.
        </div>
      )}

      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={close}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" /> Back to recruits
        </button>
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
  runStats,
  unlockedMilestoneIds,
  reward,
  onRestart,
}: {
  party: RunPokemon[];
  score: number;
  bestScore: number;
  personalBestReached: boolean;
  winStreak: number;
  upgrades: RunUpgrade[];
  runStats: RunStats;
  unlockedMilestoneIds: RunMilestoneId[];
  reward: RunRewardSummary | null;
  onRestart: () => void;
}) {
  const grade = getRunGrade(score, winStreak);

  return (
    <section className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-white bg-white/90 shadow-2xl">
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-emerald-50 px-6 py-9 text-center text-slate-950 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute inset-x-24 top-0 h-40 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-700">
          <Medal className="h-8 w-8" />
        </div>
        <p className="relative mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-amber-700">15-stage challenge complete</p>
        <h2 className="relative mt-2 text-4xl font-black sm:text-5xl">Battle Run conquered</h2>
        <p className="relative mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          You cleared every circuit, survived all three checkpoint bosses, and defeated the Run Champion.
        </p>

        <div className="relative mx-auto mt-7 grid max-w-3xl gap-2 sm:grid-cols-3">
          {RUN_SECTORS.map(sector => (
            <div key={sector.number} className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white/80 px-4 py-3 text-left shadow-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>
                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Sector {sector.number}</span>
                <strong className="block text-sm text-slate-900">{sector.title}</strong>
              </span>
            </div>
          ))}
        </div>

        <div className="relative mx-auto mt-7 grid max-w-xl grid-cols-3 gap-2">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Final score</p>
            <p className="mt-1 text-xl font-black text-slate-900">{score.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Survivors</p>
            <p className="mt-1 text-xl font-black text-slate-900">{party.length}/6</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-100 p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-amber-700">Run grade</p>
            <p className="mt-1 text-xl font-black text-amber-900">{grade.rank}</p>
          </div>
        </div>
        <p className="relative mt-3 text-xs font-bold text-slate-500">{grade.title} · {grade.description}</p>
      </div>

      <div className="p-5 sm:p-8">
        {reward && (
          <RewardSummary
            reward={reward}
            score={score}
            streak={winStreak}
            upgrades={upgrades}
            bestScore={bestScore}
            personalBestReached={personalBestReached}
            final
          />
        )}

        <div className="mb-6">
          <RunMilestoneBoard stats={runStats} unlockedIds={unlockedMilestoneIds} title="Final medal board" expanded />
        </div>

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
  const scoutPasses = useBattleRunStore(state => state.scoutPasses);
  const lastReward = useBattleRunStore(state => state.lastReward);
  const upgrades = useBattleRunStore(state => state.upgrades);
  const runStats = useBattleRunStore(state => state.runStats);
  const unlockedMilestoneIds = useBattleRunStore(state => state.unlockedMilestoneIds);
  const party = useBattleRunStore(state => state.party);
  const draftChoices = useBattleRunStore(state => state.draftChoices);
  const seed = useBattleRunStore(state => state.seed);
  const startRun = useBattleRunStore(state => state.startRun);
  const chooseStarter = useBattleRunStore(state => state.chooseStarter);
  const chooseReward = useBattleRunStore(state => state.chooseReward);
  const openPartyDevelopment = useBattleRunStore(state => state.openPartyDevelopment);
  const rerollDraft = useBattleRunStore(state => state.rerollDraft);

  useEffect(() => {
    if (!seed) startRun();
  }, [seed, startRun]);

  useEffect(() => {
    if (phase === 'starter-draft' || phase === 'reward-draft' || phase === 'lead-select' || phase === 'route-select') {
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
  const recommendedDraft = phase === 'reward-draft'
    ? getRecommendedDraftChoice(draftChoices, party)
    : null;
  const developmentChoices = party.length >= 6 ? getPartyDevelopmentChoices(party) : [];

  return (
    <main className="battle-run-theme relative min-h-[calc(100svh-4rem)] overflow-hidden bg-slate-50 px-2 py-3 sm:bg-gradient-to-br sm:from-red-50 sm:via-sky-50 sm:to-emerald-50 sm:px-6 sm:py-4">
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-red-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-64 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />

      <header className="relative mx-auto mb-3 max-w-7xl rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:mb-4 sm:rounded-2xl sm:border-white/80 sm:bg-white/75 sm:px-4 sm:backdrop-blur">
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
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 lg:justify-end">
              <span className="flex items-center gap-1 text-[11px] font-black text-slate-600"><Trophy className="h-3.5 w-3.5 text-amber-500" /> {score.toLocaleString()}</span>
              <span className="hidden items-center gap-1 text-[11px] font-black text-slate-600 sm:flex" title="Personal best"><Crown className="h-3.5 w-3.5 text-violet-500" /> {bestScore.toLocaleString()}</span>
              <span className="flex items-center gap-1 text-[11px] font-black text-slate-600" title="Contract chain"><Target className="h-3.5 w-3.5 text-red-500" /> x{contractStreak}</span>
              <span className="flex items-center gap-1 text-[11px] font-black text-slate-600" title="Scout Passes"><RefreshCw className="h-3.5 w-3.5 text-sky-600" /> {scoutPasses}</span>
              <span className="hidden items-center gap-1 text-[11px] font-black text-slate-600 md:flex"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> {upgrades.length}</span>
              <span className="hidden items-center gap-1 text-[11px] font-black text-slate-600 md:flex" title="Run medals"><Medal className="h-3.5 w-3.5 text-amber-600" /> {unlockedMilestoneIds.length}/{RUN_MILESTONES.length}</span>
              <StageMeter stage={stage} complete={phase === 'run-complete'} />
              <div className="flex items-center gap-1 text-[11px] font-black text-slate-500"><Users className="h-3.5 w-3.5" /> {party.length}/6</div>
            </div>
            {party.length > 0 && <div className="hidden sm:block"><PartyStrip party={party} /></div>}
          </div>
        </div>
      </header>

      {isDraft && (
        <section className="relative mx-auto max-w-6xl">
          <div className="mb-4 text-center sm:mb-7">
            <h2 className="text-2xl font-black text-slate-950 sm:text-4xl">
              {phase === 'starter-draft' ? 'Choose your first partner' : 'Victory reward'}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              {phase === 'starter-draft'
                ? 'Build a team capable of clearing 15 stages, three checkpoint bosses, and the final Run Champion.'
                : party.length < 6
                  ? `Your survivors gained ${lastReward?.levelsGained ?? 2} levels. Team fit compares new typing, BST, and abilities.`
                  : `Your survivors gained ${lastReward?.levelsGained ?? 2} levels. Pick a recruit, then use the impact report to choose its replacement.`}
            </p>
          </div>

          {phase === 'reward-draft' && lastReward && (
            <RewardSummary
              reward={lastReward}
              score={score}
              streak={winStreak}
              upgrades={upgrades}
              bestScore={bestScore}
              personalBestReached={personalBestReached}
            />
          )}

          {phase === 'reward-draft' && party.length >= 6 && (
            <div className="-mt-3 mb-5 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
              <div className="flex flex-col items-center justify-between gap-4 bg-gradient-to-r from-violet-50 via-white to-emerald-50 px-4 py-4 sm:flex-row sm:px-5">
                <div className="text-center sm:text-left">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-700">Party full · choose your reward path</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">Recruit a new Pokémon and replace a partner, or develop someone already on your team.</p>
                </div>
                <button
                  type="button"
                  onClick={openPartyDevelopment}
                  disabled={developmentChoices.length === 0}
                  className="inline-flex min-w-48 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:hover:translate-y-0"
                >
                  <Zap className="h-4 w-4" /> {developmentChoices.length > 0 ? 'Develop party' : 'No developments'}
                </button>
              </div>
              <div className="border-t border-violet-100 bg-violet-50/60 px-4 py-2 text-center text-[10px] font-bold text-violet-800 sm:text-left">
                Choosing either path spends this stage reward. Recruit options remain available below.
              </div>
            </div>
          )}

          {phase === 'reward-draft' && (
            <div className="-mt-3 mb-5 flex flex-col items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/90 px-4 py-3 sm:flex-row">
              <div className="text-center sm:text-left">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-700">Recruitment control</p>
                <p className="mt-0.5 text-sm font-bold text-slate-700">Spend one Scout Pass to replace every option on this board.</p>
              </div>
              <button
                type="button"
                onClick={rerollDraft}
                disabled={scoutPasses < 1}
                className="group inline-flex min-w-48 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:hover:translate-y-0"
              >
                <RefreshCw className="h-4 w-4 transition duration-500 group-hover:rotate-180 group-disabled:rotate-0" />
                {scoutPasses > 0 ? `Reroll · ${scoutPasses} available` : 'No Scout Passes'}
              </button>
            </div>
          )}

          {draftChoices.length === 0 ? (
            <div className="flex items-center justify-center gap-3 py-20 font-bold text-slate-500"><Loader2 className="animate-spin" /> Scouting Pokémon…</div>
          ) : (
            <div className={`grid items-stretch gap-3 sm:gap-5 md:grid-cols-2 ${draftChoices.length >= 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {draftChoices.map(pokemon => (
                <DraftCard
                  key={pokemon.species}
                  pokemon={pokemon}
                  label={phase === 'starter-draft' ? 'Choose partner' : party.length >= 6 ? 'Recruit & replace' : 'Recruit to party'}
                  fit={phase === 'reward-draft' ? analyzeDraftFit(pokemon, party) : undefined}
                  recommended={recommendedDraft?.species === pokemon.species}
                  onChoose={() => phase === 'starter-draft' ? chooseStarter(pokemon) : chooseReward(pokemon)}
                />
              ))}
            </div>
          )}

          {phase === 'starter-draft' && (
            <details className="group mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white/80 sm:mt-7" open={undefined}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-black text-slate-800 [&::-webkit-details-marker]:hidden">
                How Battle Run works <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
              </summary>
              <div className="grid gap-px border-t border-slate-200 bg-slate-200 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white p-4 text-slate-600"><Compass className="mb-2 h-5 w-5 text-red-500" /><strong className="block text-slate-900">Choose the stakes</strong>Riskier routes strengthen opponents and multiply every reward.</div>
                <div className="bg-white p-4 text-slate-600"><Target className="mb-2 h-5 w-5 text-amber-600" /><strong className="block text-slate-900">Chain contracts</strong>Build a score multiplier and earn Scout Passes to redraw recruits.</div>
                <div className="bg-white p-4 text-slate-600"><Medal className="mb-2 h-5 w-5 text-violet-600" /><strong className="block text-slate-900">Earn run medals</strong>Complete multi-stage goals for major score and Scout Pass payouts.</div>
                <div className="bg-white p-4 text-slate-600"><Heart className="mb-2 h-5 w-5 text-pink-500" /><strong className="block text-slate-900">Faints are permanent</strong>Lose the whole party and the run ends.</div>
              </div>
            </details>
          )}
        </section>
      )}

      {phase === 'upgrade-draft' && <UpgradeDraftScreen />}
      {phase === 'lead-select' && <LeadSelectionScreen />}
      {phase === 'route-select' && <RouteSelectionScreen />}
      {phase === 'preparing-battle' && <VersusScreen />}
      {phase === 'battle' && <BattleArena />}
      {phase === 'replacement' && <ReplacementScreen />}
      {phase === 'party-development' && <PartyDevelopmentScreen />}

      {phase === 'run-complete' && (
        <RunCompleteScreen
          party={party}
          score={score}
          bestScore={bestScore}
          personalBestReached={personalBestReached}
          winStreak={winStreak}
          upgrades={upgrades}
          runStats={runStats}
          unlockedMilestoneIds={unlockedMilestoneIds}
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
          <div className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Final score</p>
              <p className="mt-1 text-xl font-black text-slate-900">{score.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Contract chain</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xl font-black text-slate-900"><Target className="h-5 w-5 text-red-500" /> x{contractStreak}</p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-violet-600">Run grade</p>
              <p className="mt-1 text-xl font-black text-violet-950">{runGrade.rank}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Run medals</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xl font-black text-amber-900"><Medal className="h-5 w-5" /> {unlockedMilestoneIds.length}/{RUN_MILESTONES.length}</p>
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
