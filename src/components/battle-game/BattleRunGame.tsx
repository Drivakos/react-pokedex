import { useEffect } from 'react';
import { ChevronRight, Compass, Crown, Heart, Loader2, Medal, RefreshCw, RotateCcw, Shield, ShieldCheck, Target, Trophy, Users, Zap } from 'lucide-react';
import { useBattleRunStore } from '../../store/battleRunStore';
import {
  disposePrewarmedShowdownBattleWorker,
  prewarmShowdownBattleWorker,
} from '../../services/showdown-battle-worker.service';
import {
  RUN_MILESTONES,
  getRunGrade,
  getRunSector,
  isCheckpointStage,
  isFinalStage,
} from '../../utils/battle-run-rules';
import { loadShowdownClient } from './showdown-client';
import { preloadMoveAnimationAssets } from './move-animation-recipes';
import { analyzeDraftFit, getRecommendedDraftChoice } from '../../utils/battle-run-draft';
import { getPartyDevelopmentChoices } from '../../services/battle-content.service';
import { BattleArena } from './BattleArena';
import { DraftCard, PartyStrip, RewardSummary, StageMeter } from './BattleRunShared';
import {
  LeadSelectionScreen,
  RouteSelectionScreen,
  VersusScreen,
} from './BattleRunPreparationScreens';
import {
  PartyDevelopmentScreen,
  ReplacementScreen,
  ResumeRunScreen,
  RunCompleteScreen,
  UpgradeDraftScreen,
} from './BattleRunProgressionScreens';

export default function BattleRunGame() {
  // Warm the Showdown client bundle while the player is still on the draft/route
  // screens, so the first battle streams live instead of buffering a cold load.
  useEffect(() => {
    void loadShowdownClient().catch(() => undefined);
  }, []);
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
  const resumeAvailable = useBattleRunStore(state => state.resumeAvailable);
  const savedRunSummary = useBattleRunStore(state => state.savedRunSummary);
  const startRun = useBattleRunStore(state => state.startRun);
  const resumeRun = useBattleRunStore(state => state.resumeRun);
  const chooseStarter = useBattleRunStore(state => state.chooseStarter);
  const chooseReward = useBattleRunStore(state => state.chooseReward);
  const openPartyDevelopment = useBattleRunStore(state => state.openPartyDevelopment);
  const rerollDraft = useBattleRunStore(state => state.rerollDraft);

  useEffect(() => {
    if (!seed && !resumeAvailable) startRun();
    if (!seed && resumeAvailable && savedRunSummary?.party.length === 0) resumeRun();
  }, [resumeAvailable, resumeRun, savedRunSummary, seed, startRun]);

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
  const isBattleSimulation = phase === 'preparing-battle' || phase === 'battle';
  const runGrade = getRunGrade(score, winStreak);
  const sector = getRunSector(stage);
  const recommendedDraft = phase === 'reward-draft'
    ? getRecommendedDraftChoice(draftChoices, party)
    : null;
  const developmentChoices = party.length >= 6 ? getPartyDevelopmentChoices(party) : [];

  if (!seed && resumeAvailable && savedRunSummary) {
    return (
      <ResumeRunScreen
        summary={savedRunSummary}
        onResume={resumeRun}
        onStartNew={startRun}
      />
    );
  }

  return (
    <main className={`battle-run-theme relative min-h-[calc(100svh-4rem)] overflow-hidden bg-slate-50 px-2 sm:bg-gradient-to-br sm:from-red-50 sm:via-sky-50 sm:to-emerald-50 sm:px-6 sm:py-4 ${isBattleSimulation ? 'py-1.5' : 'py-2'}`}>
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-red-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-64 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />

      <header className={`relative mx-auto max-w-7xl border border-slate-200 bg-white shadow-sm sm:mb-4 sm:rounded-2xl sm:border-white/80 sm:bg-white/75 sm:px-4 sm:py-2.5 sm:backdrop-blur ${
        isBattleSimulation ? 'mb-1.5 rounded-lg px-2 py-1' : 'mb-2 rounded-lg px-2 py-1'
      }`}>
        <div className="flex h-8 items-center justify-between gap-2 sm:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm shadow-red-200">
              <Trophy className="h-3.5 w-3.5" />
            </span>
            <strong className="truncate text-xs text-slate-950">Battle Run</strong>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black text-white ${
              phase === 'run-complete' ? 'bg-emerald-600' : isCheckpointStage(stage) ? 'bg-amber-600' : 'bg-slate-950'
            }`}>
              {phase === 'run-complete' ? 'COMPLETE' : isFinalStage(stage) ? 'FINAL' : isCheckpointStage(stage) ? `BOSS ${stage}` : `STAGE ${stage}`}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 text-[10px] font-black text-slate-600">
            <span className="flex items-center gap-1" title="Current score">
              <Trophy className="h-3 w-3 text-amber-500" /> {score.toLocaleString()}
            </span>
            <span className="flex items-center gap-1" title="Active party">
              <Users className="h-3 w-3 text-sky-600" /> {party.length}/6
            </span>
          </div>
        </div>
        <div className="max-sm:hidden flex flex-col justify-between gap-2 lg:flex-row lg:items-center">
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
          <div className="mb-3 text-center sm:mb-7">
            <h2 className="text-2xl font-black text-slate-950 sm:text-4xl">
              {phase === 'starter-draft' ? 'Choose your first partner' : 'Victory reward'}
            </h2>
            <p className="mx-auto mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-base">
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
