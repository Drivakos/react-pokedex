import { ArrowLeftRight, Bot, ChevronRight, Compass, Crown, Flag, Loader2, Medal, Shield, ShieldCheck, Swords, Target } from 'lucide-react';
import { useBattleRunStore } from '../../store/battleRunStore';
import { RUN_ROUTES, RUN_SECTORS, getBossModifier, getContractChainMultiplier, getRecruitmentRewardProfile, getRunSector, isCheckpointStage, isFinalStage } from '../../utils/battle-run-rules';
import { getBattleAiProfile } from '../../utils/battle-ai-profile';
import { BattlePokemonImage } from './BattlePokemonImage';
import { TrainerImage } from './TrainerImage';
import { ChallengeCard, HeldItemBadge, PartyStrip, RunMilestoneBoard, TypeBadges } from './BattleRunShared';

export function VersusScreen() {
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
  const aiProfile = getBattleAiProfile(stage, activeRoute?.difficulty);
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
            <div
              key={pokemon.species}
              className="h-14 w-14 rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm"
              title={`${pokemon.species}${pokemon.item ? ` · Holding ${pokemon.item}` : ''}`}
            >
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

export function LeadSelectionScreen() {
  const stage = useBattleRunStore(state => state.stage);
  const party = useBattleRunStore(state => state.party);
  const chooseLead = useBattleRunStore(state => state.chooseLead);
  const sector = getRunSector(stage);

  return (
    <section className="relative mx-auto max-w-5xl">
      <div className="mb-3 text-center sm:mb-7">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">Stage {stage} formation</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-4xl">Choose your lead Pokémon</h2>
        <p className="mx-auto mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-base">
          Pick who enters battle first. The rest of your team keeps its current rotation, and opponent scouting opens after your lead is locked in.
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/90 px-2.5 py-2 text-blue-950 shadow-sm sm:mb-5 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-200 sm:h-10 sm:w-10 sm:rounded-xl">
            <ArrowLeftRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <span>
            <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">Rotation order</span>
            <strong className="block text-xs sm:text-base">Lead selection comes before route and opponent selection</strong>
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
            className="group grid grid-cols-[96px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-md transition duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 sm:block"
          >
            <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-gradient-to-br from-blue-100 via-white to-emerald-100 sm:h-40 sm:min-h-0">
              <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                Slot {index + 1}
              </span>
              {index === 0 && (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-white shadow-sm sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-wider">
                  <span className="sm:hidden">Lead</span>
                  <span className="max-sm:hidden">Current lead</span>
                </span>
              )}
              <BattlePokemonImage
                id={pokemon.id}
                species={pokemon.species}
                variant="artwork"
                className="h-24 w-24 drop-shadow-xl transition duration-200 group-hover:scale-105 sm:h-36 sm:w-36"
              />
            </div>
            <div className="min-w-0 p-2.5 sm:p-4">
              <div className="min-w-0">
                <strong className="block truncate text-lg text-slate-950 sm:text-xl">{pokemon.species}</strong>
                <span className="text-xs font-black text-slate-400">LV. {pokemon.level} · BST {pokemon.bst}</span>
                {pokemon.buildName && (
                  <span className="mt-0.5 block truncate text-[10px] font-black text-slate-500">{pokemon.buildName}</span>
                )}
                {pokemon.item && <HeldItemBadge item={pokemon.item} compact className="mt-1" />}
              </div>

              <div className="mt-2">
                <TypeBadges types={pokemon.types} />
              </div>

              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:mt-3 sm:p-2.5">
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
              <div className="mt-2 flex items-center justify-between rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition-colors group-hover:bg-blue-700 sm:mt-3 sm:px-3.5 sm:py-2.5 sm:text-sm">
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

export function RouteSelectionScreen() {
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
  const availableRoutes = checkpoint ? [RUN_ROUTES[2]] : RUN_ROUTES;

  return (
    <section className="relative mx-auto max-w-6xl">
      <div className="mb-3 text-center sm:mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-600">Sector {sector.number} of {RUN_SECTORS.length} · {sector.title}</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-4xl">
          {checkpoint ? (finalStage ? 'Challenge the Run Champion' : `Challenge the ${sector.bossTitle}`) : `Choose a difficulty for stage ${stage}`}
        </h2>
        <p className="mx-auto mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-base">
          {checkpoint
            ? `${sector.objective} Bosses use a fixed elite roster, gain four levels, and always fight with perfect decision-making.`
            : `${sector.objective} Easy, Medium, and Hard now scale roster power, levels, team size, and trainer decision-making.`}
        </p>
      </div>

      {party[0] && (
        <div className="mx-auto mb-3 flex max-w-4xl items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/90 px-3 py-2 text-blue-950 shadow-sm sm:mb-4 sm:rounded-2xl sm:px-4 sm:py-3">
          <span className="flex min-w-0 items-center gap-3">
            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white shadow-sm sm:h-12 sm:w-12">
              <BattlePokemonImage id={party[0].id} species={party[0].species} variant="icon" className="h-full w-full" />
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">Lead locked</span>
              <strong className="block truncate text-sm sm:text-base">{party[0].species} will enter first</strong>
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
                  : `Clear this objective for x${chainMultiplier.toFixed(2)} contract score and a Scout Pass. Hard awards two; a miss resets the chain.`}
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

      <div className={`grid gap-3 sm:gap-4 ${checkpoint ? 'mx-auto max-w-xl' : 'lg:grid-cols-3'}`}>
        {availableRoutes.map((route, index) => {
          const preview = routePreviews[route.id];
          const recruitmentReward = getRecruitmentRewardProfile(stage + 1, route, upgrades);
          const routeDescription = checkpoint
            ? `This boss cannot be weakened: every opponent is ${bossModifier?.levelBonus ?? 0} levels above the stage curve, uses a competitive build, and carries ${bossModifier?.item ?? 'a boss item'}.`
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
              <div className={`flex items-center justify-between border-b p-2.5 sm:p-4 ${accent}`}>
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 sm:h-10 sm:w-10"><Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" /></span>
                  <span>
                    <span className="block text-[9px] font-black uppercase tracking-[0.2em]">{checkpoint ? 'Mandatory boss encounter' : `Difficulty ${index + 1}`}</span>
                    <strong className="block text-lg text-slate-950">{checkpoint ? sector.bossTitle : route.title}</strong>
                  </span>
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black text-slate-800 shadow-sm">
                  {checkpoint ? `Stage ${stage}` : `x${route.scoreMultiplier}`}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-2.5 sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{checkpoint ? 'One fixed opponent · no difficulty choice' : route.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-sm lg:min-h-[7.5rem]">{routeDescription}</p>

                {finalStage ? (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-950 sm:mt-4 sm:px-3 sm:py-2.5">
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
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-indigo-950 sm:mt-4 sm:px-3 sm:py-2.5">
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

                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:mt-4 sm:p-3">
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
                          {pokemon.item && <HeldItemBadge item={pokemon.item} compact className="mt-1" />}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-3 gap-2 pt-2 text-center sm:pt-5">
                  <div className="rounded-xl bg-slate-50 p-1.5 sm:p-2">
                    <span className="block text-[9px] font-black uppercase text-slate-400">Level</span>
                    <strong className="text-sm text-slate-800">{preview[0] ? `L${preview[0].level}` : '—'}</strong>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-1.5 sm:p-2">
                    <span className="block text-[9px] font-black uppercase text-slate-400">Roster</span>
                    <strong className="text-sm text-slate-800">{preview.length}</strong>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-1.5 sm:p-2">
                    <span className="block text-[9px] font-black uppercase text-slate-400">Score</span>
                    <strong className="text-sm text-slate-800">x{route.scoreMultiplier}</strong>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-xl bg-red-600 px-3 py-2.5 text-sm font-black text-white shadow-sm shadow-red-200 transition-colors group-hover:bg-red-700 sm:mt-4 sm:px-4 sm:py-3">
                  {checkpoint ? `Challenge ${sector.bossTitle}` : 'Take this route'} <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
