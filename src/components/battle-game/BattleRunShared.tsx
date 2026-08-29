import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, CheckCircle2, ChevronRight, Compass, Crown, Flag, Flame, Gauge, Heart, LockKeyhole, Medal, Package, RefreshCw, ShieldCheck, Star, Target, Trophy, XCircle, Zap } from 'lucide-react';
import type { BattleMoveChoice, OpponentTrainer, RunChallenge, RunChallengeProgress, RunMilestoneId, RunPokemon, RunRewardSummary, RunStats, RunUpgrade } from '../../types/battle-run';
import { RUN_MILESTONES, RUN_SECTORS, RUN_STAGE_LIMIT, getRecruitmentRewardProfile, getRunMilestoneProgress, getRunSector } from '../../utils/battle-run-rules';
import type { DraftFitAnalysis } from '../../utils/battle-run-draft';
import itemDescriptionsData from '../../data/battle-item-descriptions.json';
import { BattlePokemonImage } from './BattlePokemonImage';
import { TrainerImage } from './TrainerImage';
import { getEffectivenessPresentation, typeClasses } from './battle-run-presentation';

const itemDescriptions = itemDescriptionsData as Record<string, string>;

export function MoveCategoryBadge({
  category,
  compact = false,
}: {
  category: BattleMoveChoice['category'];
  compact?: boolean;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center"
      aria-label={`${category} move`}
      title={`${category} move`}
    >
      <img
        src={`/ps/sprites/categories/${category}.png`}
        alt=""
        className={compact ? 'h-2.5 w-6 object-contain sm:h-3.5 sm:w-8' : 'h-4 w-9 object-contain'}
        aria-hidden="true"
      />
    </span>
  );
}

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

export function TypeBadges({ types, compact = false }: { types: string[]; compact?: boolean }) {
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

export function HeldItemBadge({
  item,
  compact = false,
  className = '',
}: {
  item: string;
  compact?: boolean;
  className?: string;
}) {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const [tooltip, setTooltip] = useState<{
    left: number;
    top: number;
    placement: 'above' | 'below';
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const description = itemDescriptions[item] ?? 'This Pokémon is holding this item.';

  const showTooltip = () => {
    const badge = badgeRef.current;
    if (!badge) return;
    const bounds = badge.getBoundingClientRect();
    const tooltipHalfWidth = 128;
    setTooltip({
      left: Math.max(
        tooltipHalfWidth + 8,
        Math.min(window.innerWidth - tooltipHalfWidth - 8, bounds.left + bounds.width / 2),
      ),
      top: bounds.top > 140 ? bounds.top - 8 : bounds.bottom + 8,
      placement: bounds.top > 140 ? 'above' : 'below',
    });
  };

  const openItemDialog = () => {
    setTooltip(null);
    setDialogOpen(true);
  };

  return (
    <>
      <span
        ref={badgeRef}
        role="button"
        tabIndex={0}
        title={`${item}: ${description}`}
        aria-label={`Held item: ${item}. ${description}`}
        aria-haspopup="dialog"
        aria-expanded={dialogOpen}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltip(null)}
        onPointerDown={event => event.stopPropagation()}
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
          openItemDialog();
        }}
        onKeyDown={event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          openItemDialog();
        }}
        className={`inline-flex max-w-full cursor-help touch-manipulation items-center gap-1 rounded-md border border-amber-200 bg-amber-50 font-black text-amber-800 outline-none transition hover:border-amber-300 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-400 ${compact ? 'min-h-5 px-1.5 py-0.5 text-[9px]' : 'min-h-7 px-2 py-1 text-[10px] sm:text-xs'} ${className}`}
      >
        <Package className={compact ? 'h-2.5 w-2.5 shrink-0' : 'h-3 w-3 shrink-0'} aria-hidden="true" />
        <span className="truncate">{item}</span>
      </span>
      {tooltip && createPortal(
        <span
          role="tooltip"
          className={`pointer-events-none fixed z-[100] w-64 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-left text-white shadow-2xl ${
            tooltip.placement === 'above' ? '-translate-y-full' : ''
          }`}
          style={{ left: tooltip.left, top: tooltip.top }}
        >
          <strong className="block text-xs text-amber-300">{item}</strong>
          <span className="mt-1 block text-[11px] font-semibold leading-relaxed text-slate-200">{description}</span>
        </span>,
        document.body,
      )}
      {dialogOpen && createPortal(
        <span
          className="fixed inset-0 z-[110] flex items-end bg-slate-950/50 p-3 backdrop-blur-[2px] sm:items-center sm:justify-center"
          onPointerDown={event => event.stopPropagation()}
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            setDialogOpen(false);
          }}
        >
          <span
            role="dialog"
            aria-modal="true"
            aria-label={`${item} held item details`}
            className="block w-full rounded-2xl border border-white/20 bg-white p-4 text-left shadow-2xl sm:max-w-sm sm:p-5"
            onClick={event => event.stopPropagation()}
          >
            <span className="flex items-start justify-between gap-4">
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Package className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">Held item</span>
                  <strong className="block truncate text-lg text-slate-950">{item}</strong>
                </span>
              </span>
              <button
                type="button"
                aria-label="Close item details"
                onClick={event => {
                  event.preventDefault();
                  event.stopPropagation();
                  setDialogOpen(false);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </span>
            <span className="mt-4 block rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold leading-relaxed text-slate-600">
              {description}
            </span>
            <span className="mt-3 block text-center text-[10px] font-bold text-slate-400 sm:hidden">Tap outside to close</span>
          </span>
        </span>,
        document.body,
      )}
    </>
  );
}

export function MoveDetails({ move, opponent }: { move: BattleMoveChoice; opponent?: string }) {
  const effectiveness = getEffectivenessPresentation(move.effectiveness);

  return (
    <div
      id={`battle-move-details-${move.slot}`}
      role="tooltip"
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-xl sm:p-2.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm text-slate-950">{move.name}</strong>
            <span className={`${typeClasses[move.type] ?? 'bg-slate-400'} rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-white`}>{move.type}</span>
            <MoveCategoryBadge category={move.category} />
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${effectiveness.classes}`}
              title={effectiveness.label}
              aria-label={effectiveness.label}
            >
              {effectiveness.shortLabel}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:mt-1 sm:text-[11px]">{move.description || 'No move description is available.'}</p>
        </div>
        <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-400">
          vs {opponent ?? 'opponent'}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-5 gap-2 border-t border-slate-100 pt-2 text-[10px] sm:mt-1.5 sm:pt-1.5 sm:text-[9px]">
        <div><dt className="font-bold text-slate-400">Category</dt><dd className="font-black text-slate-700">{move.category}</dd></div>
        <div><dt className="font-bold text-slate-400">{move.category === 'Status' ? 'Effect' : 'Power'}</dt><dd className="font-black text-slate-700">{move.category === 'Status' ? 'Utility' : move.power || '—'}</dd></div>
        <div><dt className="font-bold text-slate-400">Accuracy</dt><dd className="font-black text-slate-700">{move.accuracy === true ? 'Always' : `${move.accuracy}%`}</dd></div>
        <div><dt className="font-bold text-slate-400">Priority</dt><dd className="font-black text-slate-700">{move.priority > 0 ? `+${move.priority}` : move.priority}</dd></div>
        <div><dt className="font-bold text-slate-400">PP</dt><dd className="font-black text-slate-700">{move.pp}/{move.maxpp}</dd></div>
      </dl>
    </div>
  );
}

export function StageMeter({ stage, complete = false }: { stage: number; complete?: boolean }) {
  const sector = getRunSector(stage);
  const nextBoss = RUN_SECTORS.find(runSector => runSector.endStage >= stage);
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`${sector.title}, stage ${Math.min(stage, RUN_STAGE_LIMIT)} of ${RUN_STAGE_LIMIT}. ${nextBoss ? `Next boss is ${nextBoss.bossTitle} at stage ${nextBoss.endStage}.` : 'All bosses cleared.'}`}
    >
      <span className="hidden text-[9px] font-black uppercase tracking-wider text-slate-400 xl:inline">{sector.title}</span>
      <div className="flex items-center gap-1">
        {RUN_SECTORS.map(runSector => (
          <div key={runSector.number} className="flex items-center gap-0.5">
            {Array.from({ length: runSector.endStage - runSector.startStage + 1 }, (_, index) => {
              const candidateStage = runSector.startStage + index;
              const cleared = candidateStage < stage || (complete && candidateStage <= stage);
              const current = candidateStage === stage && !complete;
              const boss = candidateStage === runSector.endStage;
              return (
                <span
                  key={candidateStage}
                  title={boss ? `Boss: ${runSector.bossTitle} · Stage ${candidateStage}` : `Stage ${candidateStage}`}
                  className={`rounded-full transition-all ${
                    boss
                      ? cleared
                        ? 'h-2.5 w-2.5 border-2 border-red-600 bg-red-600'
                        : current
                          ? 'h-3 w-3 border-2 border-amber-700 bg-amber-400 ring-2 ring-amber-200'
                          : 'h-2.5 w-2.5 border-2 border-amber-500 bg-amber-50'
                      : cleared
                        ? 'h-1.5 w-2 bg-red-500'
                        : current
                          ? 'h-1.5 w-3 bg-amber-400'
                          : 'h-1.5 w-1.5 bg-slate-200'
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <span className="text-[10px] font-black text-slate-500">{Math.min(stage, RUN_STAGE_LIMIT)}/{RUN_STAGE_LIMIT}</span>
      {nextBoss && !complete && (
        <span className="hidden items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-800 sm:flex">
          <Flag className="h-3 w-3" /> Boss {nextBoss.endStage}
        </span>
      )}
    </div>
  );
}

export function RunMilestoneBoard({
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

export function DraftCard({ pokemon, onChoose, label, fit, recommended = false }: {
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
      className="group grid h-full self-stretch grid-cols-[96px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-md transition-[border-color,box-shadow] duration-200 hover:border-red-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-red-200 sm:grid-cols-1 sm:grid-rows-[12rem_minmax(0,1fr)]"
    >
      <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-gradient-to-br from-sky-100 via-white to-emerald-100 sm:h-48 sm:min-h-0">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-[18px] border-white/50" />
        <div className="absolute bottom-3 h-5 w-24 rounded-[50%] bg-emerald-900/10 blur-sm sm:h-8 sm:w-40" />
        <BattlePokemonImage
          id={pokemon.id}
          species={pokemon.species}
          variant="artwork"
          className="relative z-10 h-24 w-24 drop-shadow-xl transition duration-300 group-hover:scale-105 sm:h-40 sm:w-40"
        />
        <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-black text-white backdrop-blur sm:left-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-xs">
          LV. {pokemon.level}
        </span>
        {pokemon.isMega && (
          <span className="absolute bottom-2 right-2 rounded-full bg-violet-600 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-white shadow-md sm:bottom-4 sm:right-4 sm:px-3 sm:text-[10px]">
            Rare Mega
          </span>
        )}
        {recommended && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-amber-950 shadow-md sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-[10px]">
            <Star className="h-3 w-3 fill-current sm:h-3.5 sm:w-3.5" /> Best fit
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col p-2.5 sm:p-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h3 className="min-w-0 flex-1 truncate text-lg font-black text-slate-950 sm:text-2xl">{pokemon.species}</h3>
          <div className="shrink-0"><TypeBadges types={pokemon.types} compact /></div>
        </div>
        <p className="text-xs font-bold text-slate-400 sm:text-sm">
          BST {pokemon.bst}{pokemon.buildName ? ` · ${pokemon.buildName}` : ''}
        </p>
        <div className="mt-1.5 rounded-xl bg-slate-50 p-2 sm:mt-3 sm:p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ability</p>
          <p className="mt-0.5 truncate text-xs font-extrabold text-slate-700 sm:text-sm">{pokemon.ability}</p>
          {pokemon.item && (
            <HeldItemBadge item={pokemon.item} compact className="mt-1.5" />
          )}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {pokemon.moves.slice(0, 4).map((move, index) => (
              <span key={move} className={`${index > 1 ? 'max-sm:hidden' : ''} truncate rounded-md bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500 shadow-sm sm:px-2 sm:py-1 sm:text-[11px]`}>{move}</span>
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
        <div className="mt-2 flex items-center justify-between rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white transition group-hover:bg-red-700 sm:mt-auto sm:px-4 sm:py-3 sm:text-sm">
          {label} <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </div>
      </div>
    </button>
  );
}

export function PartyStrip({ party }: { party: RunPokemon[] }) {
  return (
    <div className="flex max-w-full gap-1.5 overflow-x-auto">
      {party.map(pokemon => (
        <div key={pokemon.species} className="flex shrink-0 items-center gap-1.5 rounded-full border border-white bg-white/90 py-0.5 pl-0.5 pr-2.5 shadow-sm backdrop-blur">
          <div className="h-7 w-7 overflow-hidden rounded-full bg-sky-50">
            <BattlePokemonImage id={pokemon.id} species={pokemon.species} variant="icon" className="h-full w-full" />
          </div>
          <span className="text-[11px] font-black text-slate-700">{pokemon.species} <span className="text-slate-400">L{pokemon.level}</span></span>
          {pokemon.item && <HeldItemBadge item={pokemon.item} compact />}
        </div>
      ))}
    </div>
  );
}

export function ChallengeCard({ challenge, compact = false, progress, chainMultiplier = 1 }: {
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

export function RewardSummary({ reward, score, streak, upgrades, bestScore, personalBestReached, final = false }: {
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
    <div className="mb-3 overflow-hidden rounded-2xl border border-[var(--battle-panel-border)] bg-[var(--battle-panel-surface)] text-[var(--battle-panel-title)] shadow-xl shadow-slate-200/70 sm:mb-6">
      <div className="flex items-end justify-between gap-3 border-b border-[var(--battle-panel-border)] bg-gradient-to-r from-red-50 via-white to-sky-50 px-3 py-3 sm:items-center sm:px-5 sm:py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Stage {reward.stage} cleared</p>
          <p className="mt-0.5 text-base font-black sm:mt-1 sm:text-xl">Performance reward</p>
        </div>
        <div className="flex items-end gap-3 sm:gap-5">
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Earned</p>
            <p className="text-xl font-black text-amber-700 sm:text-2xl">+{reward.totalScore.toLocaleString()}</p>
          </div>
          <div className="max-sm:hidden text-right">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Run score</p>
            <p className="text-lg font-black">{score.toLocaleString()}</p>
          </div>
          <div className="max-sm:hidden text-right">
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
          <div key={label} className="flex items-center justify-between gap-2 bg-[var(--battle-panel-surface)] px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--battle-panel-copy)] sm:gap-2 sm:text-xs"><Icon className="h-3.5 w-3.5 text-[var(--battle-panel-muted)]" /> {label}</span>
            <strong className="text-xs text-[var(--battle-panel-title)] sm:text-sm">+{value}</strong>
          </div>
        ))}
      </div>
      {reward.challenge && (
        <div className={`flex items-center justify-between gap-2 border-t px-3 py-2 sm:gap-4 sm:px-5 sm:py-3 ${reward.challengeCompleted ? 'border-[var(--battle-contract-success-border)] bg-[var(--battle-contract-success-surface)]' : 'border-[var(--battle-contract-danger-border)] bg-[var(--battle-contract-danger-surface)]'}`}>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {reward.challengeCompleted
              ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--battle-contract-success)]" />
              : <XCircle className="h-5 w-5 shrink-0 text-[var(--battle-contract-danger)]" />}
            <div>
              <p className={`text-xs font-black uppercase tracking-wider ${reward.challengeCompleted ? 'text-[var(--battle-contract-success)]' : 'text-[var(--battle-contract-danger)]'}`}>
                {reward.challengeCompleted ? `Contract cleared · ${reward.contractStreak} chain` : 'Contract missed · chain reset'}
              </p>
              <p className="truncate text-xs font-bold text-[var(--battle-contract-title)] sm:text-sm">{reward.challenge.title}</p>
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
        <div className="flex items-center justify-between gap-3 border-t border-amber-200 bg-amber-50 px-3 py-2 sm:gap-4 sm:px-5 sm:py-3">
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
        <div className="flex items-center justify-between gap-2 border-t border-indigo-200 bg-indigo-50 px-3 py-2 sm:gap-4 sm:px-5 sm:py-3">
          <span className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700"><Medal className="h-4 w-4" /></span>
            <span>
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-indigo-700">{reward.route.title} spoils secured</span>
              <strong className="block truncate text-xs text-indigo-950 sm:text-sm">Level {recruitmentReward.level} recruitment pool</strong>
            </span>
          </span>
          <span className="text-right text-xs font-black text-indigo-700">
            {recruitmentReward.choiceCount} choices
            {reward.route.recruitmentChoiceBonus > 0 && <span className="block text-[9px] uppercase tracking-wider text-indigo-600">+{reward.route.recruitmentChoiceBonus} route bonus</span>}
          </span>
        </div>
      )}
      <div className="border-t border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 sm:px-5 sm:py-2.5 sm:text-xs">
        {final ? 'Final checkpoint secured. The challenge is complete.' : `Surviving Pokémon gained ${reward.levelsGained} levels.`}
      </div>
    </div>
  );
}

export function TrainerCard({ trainer, stage }: {
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
