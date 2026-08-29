import { useState } from 'react';
import { ArrowLeftRight, CheckCircle2, ChevronRight, Compass, Crown, Heart, Medal, Play, RotateCcw, Save, ShieldCheck, Target, Trophy, Users, Zap } from 'lucide-react';
import { type SavedBattleRunSummary, useBattleRunStore } from '../../store/battleRunStore';
import type { RunMilestoneId, RunPokemon, RunRewardSummary, RunStats, RunUpgrade } from '../../types/battle-run';
import { PARTY_LIMIT, RUN_SECTORS, RUN_STAGE_LIMIT, getRunGrade, getRunSector } from '../../utils/battle-run-rules';
import { analyzeReplacementImpact } from '../../utils/battle-run-draft';
import { getPartyDevelopmentChoices } from '../../services/battle-content.service';
import { BattlePokemonImage } from './BattlePokemonImage';
import { HeldItemBadge, RewardSummary, RunMilestoneBoard, TypeBadges } from './BattleRunShared';
export function UpgradeDraftScreen() {
  const stage = useBattleRunStore(state => state.stage);
  const score = useBattleRunStore(state => state.score);
  const party = useBattleRunStore(state => state.party);
  const upgradeChoices = useBattleRunStore(state => state.upgradeChoices);
  const chooseUpgrade = useBattleRunStore(state => state.chooseUpgrade);
  const developmentCount = getPartyDevelopmentChoices(party)
    .reduce((total, choice) => total + choice.options.length, 0);

  return (
    <section className="relative mx-auto max-w-6xl">
      <div className="mb-3 text-center sm:mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">Checkpoint cleared</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-4xl">Choose your checkpoint reward</h2>
        <p className="mx-auto mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-base">
          Stage {stage} secured. Instant rewards change your party now; permanent rewards show exactly how they improve every future clear.
        </p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-900 sm:mt-3 sm:px-4 sm:py-2 sm:text-xs">
          <Trophy className="h-3.5 w-3.5 text-amber-600" /> Current score {score.toLocaleString()}
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        {upgradeChoices.map(upgrade => {
          const Icon = upgrade.id === 'veteran-training'
            ? Crown
            : upgrade.id === 'full-roster'
              ? Users
              : upgrade.id === 'evolution-catalyst'
                ? Zap
            : upgrade.id === 'expanded-scouting'
              ? Users
              : upgrade.id === 'contract-ledger'
                ? Target
                : upgrade.id === 'route-dividend'
                  ? Compass
                  : upgrade.id === 'flawless-standard'
                    ? ShieldCheck
                    : Heart;
          const impact = upgrade.id === 'full-roster'
            ? `Adds ${Math.max(0, PARTY_LIMIT - party.length)} random, stage-scaled Pokémon now: ${party.length} → ${PARTY_LIMIT} party members.`
            : upgrade.id === 'evolution-catalyst'
              ? `Choose 1 of ${developmentCount} available evolutions or Mega Evolutions now. The selected partner keeps its current level.`
              : upgrade.impact;
          return (
            <button
              key={upgrade.id}
              type="button"
              onClick={() => chooseUpgrade(upgrade.id)}
              className="group flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-md transition duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-amber-200 sm:min-h-64 sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 sm:h-12 sm:w-12 sm:rounded-2xl">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                  upgrade.effect === 'persistent'
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {upgrade.effect === 'persistent' ? 'Every future round' : 'Applies immediately'}
                </span>
              </div>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 sm:mt-5">{upgrade.label}</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">{upgrade.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-sm">{upgrade.description}</p>
              <div className="mt-2 flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-emerald-950 sm:mt-4 sm:py-3">
                <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">Visible impact</span>
                <strong className="mt-1 block text-xs leading-relaxed">{impact}</strong>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-600 px-3 py-2.5 text-sm font-black text-white shadow-sm shadow-amber-200 transition-colors group-hover:bg-amber-700 sm:mt-5 sm:px-4 sm:py-3">
                {upgrade.effect === 'persistent' ? 'Activate reward' : 'Apply reward now'} <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ReplacementScreen() {
  const party = useBattleRunStore(state => state.party);
  const recruit = useBattleRunStore(state => state.pendingRecruit);
  const cancel = useBattleRunStore(state => state.cancelReplacement);
  const replace = useBattleRunStore(state => state.replacePartyMember);
  if (!recruit) return null;

  return (
    <section className="mx-auto max-w-6xl text-center">
      <div className="mb-4 flex justify-start">
        <button
          type="button"
          onClick={cancel}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
        >
          <RotateCcw className="h-4 w-4" /> Back to recruit options
        </button>
      </div>
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
                {pokemon.item && <HeldItemBadge item={pokemon.item} compact className="mt-1" />}
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

export function PartyDevelopmentScreen() {
  const party = useBattleRunStore(state => state.party);
  const developmentRewardPending = useBattleRunStore(state => state.developmentRewardPending);
  const develop = useBattleRunStore(state => state.developPartyMember);
  const close = useBattleRunStore(state => state.closePartyDevelopment);
  const choices = getPartyDevelopmentChoices(party);
  const hasMega = party.some(pokemon => pokemon.isMega);

  return (
    <section className="relative mx-auto max-w-6xl">
      <div className="text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 sm:h-16 sm:w-16 sm:rounded-2xl">
          <Zap className="h-6 w-6 sm:h-8 sm:w-8" />
        </div>
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">
          {developmentRewardPending ? 'Evolution catalyst reward' : 'Party development'}
        </p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-4xl">
          {developmentRewardPending ? 'Transform one partner now' : 'Evolve a current partner'}
        </h2>
        <p className="mx-auto mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-base">
          {developmentRewardPending
            ? 'This checkpoint reward must be used on one eligible partner. Choose an evolution or use your one available Mega slot.'
            : 'Spend this stage reward to evolve one partner. Fully evolved Pokémon with a Mega form can permanently Mega Evolve for the rest of the run.'}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[9px] font-black sm:mt-3 sm:gap-2 sm:text-[10px]">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Level is preserved</span>
          <span className={`rounded-full px-3 py-1 ${hasMega ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-600'}`}>
            {hasMega ? 'Mega slot already used' : 'One Mega per party'}
          </span>
        </div>
      </div>

      {choices.length > 0 ? (
        <div className="mt-4 space-y-3 sm:mt-8 sm:space-y-4">
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
                  {choice.current.item && <HeldItemBadge item={choice.current.item} compact className="mt-1" />}
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
                        {option.pokemon.item && <HeldItemBadge item={option.pokemon.item} compact className="mt-1" />}
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

      {!developmentRewardPending && <div className="mt-5 text-center">
        <button
          type="button"
          onClick={close}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" /> Back to recruits
        </button>
      </div>}
    </section>
  );
}

export function RunCompleteScreen({
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
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-emerald-50 px-4 py-6 text-center text-slate-950 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute inset-x-24 top-0 h-40 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-amber-200 bg-amber-100 text-amber-700 sm:h-16 sm:w-16 sm:rounded-2xl">
          <Medal className="h-6 w-6 sm:h-8 sm:w-8" />
        </div>
        <p className="relative mt-3 text-[9px] font-black uppercase tracking-[0.22em] text-amber-700 sm:mt-5 sm:text-[10px] sm:tracking-[0.28em]">15-stage challenge complete</p>
        <h2 className="relative mt-1 text-3xl font-black sm:mt-2 sm:text-5xl">Battle Run conquered</h2>
        <p className="relative mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-slate-600 sm:mt-3 sm:text-base">
          You cleared every circuit, survived all three checkpoint bosses, and defeated the Run Champion.
        </p>

        <div className="relative mx-auto mt-4 grid max-w-3xl gap-1.5 sm:mt-7 sm:grid-cols-3 sm:gap-2">
          {RUN_SECTORS.map(sector => (
            <div key={sector.number} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 text-left shadow-sm sm:gap-3 sm:px-4 sm:py-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>
                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Sector {sector.number}</span>
                <strong className="block text-sm text-slate-900">{sector.title}</strong>
              </span>
            </div>
          ))}
        </div>

        <div className="relative mx-auto mt-4 grid max-w-xl grid-cols-3 gap-1.5 sm:mt-7 sm:gap-2">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-2 sm:p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Final score</p>
            <p className="mt-1 text-xl font-black text-slate-900">{score.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-2 sm:p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Survivors</p>
            <p className="mt-1 text-xl font-black text-slate-900">{party.length}/6</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-100 p-2 sm:p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-amber-700">Run grade</p>
            <p className="mt-1 text-xl font-black text-amber-900">{grade.rank}</p>
          </div>
        </div>
        <p className="relative mt-3 text-xs font-bold text-slate-500">{grade.title} · {grade.description}</p>
      </div>

      <div className="p-3 sm:p-8">
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
                    {pokemon.item && <HeldItemBadge item={pokemon.item} compact className="mt-1" />}
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

export function ResumeRunScreen({
  summary,
  onResume,
  onStartNew,
}: {
  summary: SavedBattleRunSummary;
  onResume: () => void;
  onStartNew: () => void;
}) {
  const [confirmNewRun, setConfirmNewRun] = useState(false);
  const sector = getRunSector(summary.stage);
  const progress = Math.max(0, Math.min(100, (summary.stage / RUN_STAGE_LIMIT) * 100));
  const savedLabel = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(summary.savedAt));

  return (
    <main className="battle-run-theme relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden bg-slate-950 px-3 py-3 sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_42%)]" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-run-title"
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl shadow-black/40 sm:rounded-[1.75rem]"
      >
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-amber-400 to-sky-500" />
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-md">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Battle Run</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                    <Save className="h-3 w-3" /> Autosaved
                  </span>
                </div>
                <h1 id="resume-run-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Continue your run
                </h1>
                <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
                  Resume exactly where you left off in the {sector.title}.
                </p>
              </div>
            </div>
            <span className="max-sm:hidden shrink-0 text-right text-[10px] font-bold text-slate-400">
              Last saved<br /><strong className="text-slate-600">{savedLabel}</strong>
            </span>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-7 sm:py-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Run progress</p>
                <p className="mt-1 text-lg font-black text-slate-950">Stage {summary.stage} of {RUN_STAGE_LIMIT}</p>
              </div>
              <p className="text-right text-xs font-bold text-slate-500">{sector.title}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-wider text-amber-700">Current score</p>
              <p className="mt-0.5 text-xl font-black tabular-nums text-amber-950">{summary.score.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-sky-200/70 bg-sky-50 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-wider text-sky-700">Active roster</p>
              <p className="mt-0.5 text-xl font-black text-sky-950">{summary.party.length} <span className="text-sm text-sky-600">of 6</span></p>
            </div>
          </div>

          <div className="mt-3 sm:mt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Your team</p>
              <p className="text-[10px] font-bold text-slate-400 sm:hidden">{savedLabel}</p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {summary.party.map(pokemon => (
                <div key={pokemon.species} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                  <BattlePokemonImage id={pokemon.id} species={pokemon.species} variant="icon" className="h-10 w-10 shrink-0" />
                  <span className="min-w-0">
                    <strong className="block truncate text-xs text-slate-900">{pokemon.species}</strong>
                    <span className="block text-[10px] font-bold text-slate-400">Level {pokemon.level}</span>
                    {pokemon.item && <HeldItemBadge item={pokemon.item} compact className="mt-1" />}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {!confirmNewRun ? (
            <div className="mt-4 grid gap-2.5 sm:mt-6 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                onClick={onResume}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 font-black text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
              >
                <Play className="h-4 w-4 fill-current" /> Continue stage {summary.stage}
              </button>
              <button
                type="button"
                onClick={() => setConfirmNewRun(true)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-slate-500 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
              >
                <RotateCcw className="h-4 w-4" /> Start new
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div>
                <p className="text-sm font-black text-red-950">Replace this saved run?</p>
                <p className="mt-0.5 text-xs font-semibold text-red-700">Your current Stage {summary.stage} checkpoint will be permanently replaced.</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:flex">
                <button
                  type="button"
                  onClick={() => setConfirmNewRun(false)}
                  className="min-h-10 rounded-lg border border-red-200 bg-white px-4 text-xs font-black text-slate-700 hover:bg-slate-50"
                >
                  Keep save
                </button>
                <button
                  type="button"
                  onClick={onStartNew}
                  className="min-h-10 rounded-lg bg-red-600 px-4 text-xs font-black text-white shadow-sm hover:bg-red-700"
                >
                  Replace & start
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
