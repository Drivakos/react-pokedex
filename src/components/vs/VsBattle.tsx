import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Info, Loader2, LockKeyhole, LogOut, Swords, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { forfeitVsMatch, reportVsResult } from '../../services/vs-match.service';
import { VsBattleSession } from '../../services/vs-battle-session';
import { useBattleEngineStore } from '../../store/battleEngineStore';
import { useVsMatchStore } from '../../store/vsMatchStore';
import type { BattleMoveChoice, BattleResult, PokemonStatSpread, RunPokemon } from '../../types/battle-run';
import type { VsCanonicalResult, VsMatch, VsTeamSnapshotMember } from '../../types/vs';
import { isShowdownMuted, setShowdownMuted } from '../battle-game/showdown-client';
import { BattlePokemonImage } from '../battle-game/BattlePokemonImage';
import { ShowdownStage } from '../battle-game/ShowdownStage';

const typeClasses: Record<string, string> = {
  Bug: 'bg-lime-600', Dark: 'bg-slate-700', Dragon: 'bg-indigo-600', Electric: 'bg-yellow-500',
  Fairy: 'bg-pink-400', Fighting: 'bg-red-700', Fire: 'bg-orange-500', Flying: 'bg-sky-400',
  Ghost: 'bg-purple-700', Grass: 'bg-green-600', Ground: 'bg-amber-700', Ice: 'bg-cyan-500',
  Normal: 'bg-stone-400', Poison: 'bg-violet-600', Psychic: 'bg-pink-600', Rock: 'bg-yellow-800',
  Steel: 'bg-slate-500', Water: 'bg-blue-600',
};

function MoveCategoryBadge({ category }: { category: BattleMoveChoice['category'] }) {
  return (
    <span className="inline-flex shrink-0 items-center" aria-label={`${category} move`} title={`${category} move`}>
      <img src={`/ps/sprites/categories/${category}.png`} alt="" className="h-2.5 w-6 object-contain sm:h-3.5 sm:w-8" aria-hidden="true" />
    </span>
  );
}

function effectivenessPresentation(effectiveness: number | null) {
  if (effectiveness === null) return { label: '—', classes: 'border-slate-200 bg-slate-100 text-slate-600' };
  if (effectiveness === 0) return { label: 'x0', classes: 'border-slate-300 bg-slate-200 text-slate-700' };
  if (effectiveness > 1) return { label: `x${effectiveness}`, classes: 'border-emerald-200 bg-emerald-100 text-emerald-800' };
  if (effectiveness < 1) return { label: `x${effectiveness}`, classes: 'border-amber-200 bg-amber-100 text-amber-800' };
  return { label: 'x1', classes: 'border-blue-200 bg-blue-50 text-blue-700' };
}

const STAT_KEYS: Array<keyof PokemonStatSpread> = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

function statSpread(values: Record<string, number>, fallback: number): PokemonStatSpread {
  return Object.fromEntries(STAT_KEYS.map(stat => [stat, values[stat] ?? fallback])) as unknown as PokemonStatSpread;
}

function toRunPokemon(member: VsTeamSnapshotMember): RunPokemon {
  return {
    id: member.pokemonId,
    species: member.species,
    types: member.types,
    level: member.level,
    ability: member.ability,
    moves: member.moves,
    item: member.item,
    nature: member.nature,
    evs: statSpread(member.evs, 0),
    ivs: statSpread(member.ivs, 31),
    gender: member.gender === 'M' || member.gender === 'F' || member.gender === 'N' ? member.gender : undefined,
    teraType: member.teraType,
    shiny: member.isShiny,
    nickname: member.nickname,
    bst: 0,
  };
}

function canonicalResult(result: BattleResult, isHost: boolean): VsCanonicalResult {
  if (result.winner === 'tie') return 'tie';
  if (result.winner === 'player') return isHost ? 'host' : 'guest';
  return isHost ? 'guest' : 'host';
}

export function VsBattle({ match, userId }: { match: VsMatch; userId: string }) {
  const isHost = match.host_user_id === userId;
  const playerTeam = isHost ? match.host_team_snapshot : match.guest_team_snapshot;
  const opponentTeam = isHost ? match.guest_team_snapshot : match.host_team_snapshot;
  const playerName = isHost ? match.hostName || 'Host' : match.guestName || 'Challenger';
  const opponentName = isHost ? match.guestName || 'Challenger' : match.hostName || 'Host';
  const loadMatch = useVsMatchStore(state => state.loadMatch);
  const snapshot = useBattleEngineStore(state => state.snapshot);
  const decision = useBattleEngineStore(state => state.decision);
  const engineStatus = useBattleEngineStore(state => state.status);
  const engineError = useBattleEngineStore(state => state.error);
  const battleLog = useBattleEngineStore(state => state.battleLog);
  const chooseMove = useBattleEngineStore(state => state.chooseMove);
  const chooseSwitch = useBattleEngineStore(state => state.chooseSwitch);
  const startBattle = useBattleEngineStore(state => state.startBattle);
  const resetBattle = useBattleEngineStore(state => state.resetBattle);
  const [logEl, setLogEl] = useState<HTMLDivElement | null>(null);
  const [showdownFailed, setShowdownFailed] = useState(false);
  const [muted, setMuted] = useState(() => isShowdownMuted());
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [forfeitArmed, setForfeitArmed] = useState(false);
  const [submittingChoice, setSubmittingChoice] = useState(false);
  const [inspectedMoveSlot, setInspectedMoveSlot] = useState<number | null>(null);

  const playerParty = useMemo(() => playerTeam?.members.map(toRunPokemon) ?? [], [playerTeam]);
  const opponentParty = useMemo(() => opponentTeam?.members.map(toRunPokemon) ?? [], [opponentTeam]);

  const handleEnd = useCallback((result: BattleResult) => {
    const won = result.winner === 'player';
    setResultMessage(result.winner === 'tie' ? 'The battle ended in a tie.' : won ? 'You won the battle!' : 'You lost the battle.');
    void reportVsResult(match.id, canonicalResult(result, isHost))
      .then(() => loadMatch(match.id))
      .catch(() => undefined);
  }, [isHost, loadMatch, match.id]);

  useEffect(() => {
    if (!playerTeam || !opponentTeam || !match.battle_seed) return undefined;
    startBattle({
      playerParty,
      enemyParty: opponentParty,
      level: 50,
      introLog: [`${playerName} challenged ${opponentName}!`],
      sessionFactory: ({ callbacks }) => new VsBattleSession({
        matchId: match.id,
        isHost,
        playerParty,
        opponentParty,
        battleSeed: match.battle_seed as [number, number, number, number],
        playerName,
        opponentName,
        callbacks,
      }),
      onEnd: handleEnd,
    });
    return resetBattle;
  }, [handleEnd, isHost, match.battle_seed, match.id, opponentName, opponentParty, opponentTeam, playerName, playerParty, playerTeam, resetBattle, startBattle]);

  const toggleMuted = () => {
    const next = !muted;
    setShowdownMuted(next);
    setMuted(next);
  };

  const handleForfeit = async () => {
    if (!forfeitArmed) {
      setForfeitArmed(true);
      return;
    }
    try {
      resetBattle();
      await forfeitVsMatch(match.id);
      await loadMatch(match.id);
    } catch {
      setForfeitArmed(false);
    }
  };

  useEffect(() => {
    if (decision.kind !== 'wait') setSubmittingChoice(false);
  }, [decision.kind]);

  useEffect(() => {
    if (decision.kind !== 'move') setInspectedMoveSlot(null);
  }, [decision.kind]);

  const handleMove = (slot: number) => {
    setSubmittingChoice(true);
    chooseMove(slot);
  };

  const handleSwitch = (slot: number) => {
    setSubmittingChoice(true);
    chooseSwitch(slot);
  };

  if (!playerTeam || !opponentTeam || !match.battle_seed) {
    return <p className="py-16 text-center text-red-700">This match is missing its locked battle data.</p>;
  }

  const switches = decision.switches.filter(choice => !choice.active && !choice.fainted);
  const inspectedMove = decision.kind === 'move'
    ? decision.moves.find(move => move.slot === inspectedMoveSlot)
    : undefined;
  const recentLog = battleLog.slice(-6);

  return (
    <main className="battle-run-theme relative min-h-[calc(100svh-4rem)] overflow-hidden bg-slate-50 px-2 py-1.5 sm:bg-gradient-to-br sm:from-red-50 sm:via-sky-50 sm:to-emerald-50 sm:px-6 sm:py-4">
      <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-red-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />

      <header className="relative mx-auto mb-1.5 flex max-w-7xl items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm sm:mb-4 sm:rounded-2xl sm:border-white/80 sm:bg-white/75 sm:px-4 sm:py-2.5 sm:backdrop-blur">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm"><Swords size={18} /></span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-black text-slate-950 sm:text-lg">{playerName} <span className="text-slate-400">vs</span> {opponentName}</p>
              <span className="hidden items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black text-emerald-700 sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE</span>
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-red-600 sm:text-[11px]">Synchronized VS Battle</p>
          </div>
        </div>
        <div className="shrink-0 text-right text-[10px] font-black text-slate-500 sm:text-xs">
          <p className="text-slate-900">Turn {snapshot?.turn ?? 0}</p>
          <p>{snapshot?.playerRemaining ?? playerParty.length}–{snapshot?.opponentRemaining ?? opponentParty.length} remaining</p>
        </div>
      </header>

      <div className="relative mx-auto grid w-full max-w-7xl gap-3 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-5">
          <section className="overflow-hidden border border-slate-200/80 bg-white shadow-lg sm:shadow-2xl">
            <div className="battle-stage relative h-[min(46svh,360px)] min-h-[310px] overflow-hidden bg-slate-950 sm:h-[clamp(430px,52svh,500px)]">
              {!showdownFailed && <ShowdownStage logEl={logEl} onLoadError={() => setShowdownFailed(true)} />}
              {showdownFailed && (
                <div className="flex h-full items-center justify-center px-6 text-center text-slate-300">
                  The animated field could not load. Battle controls remain available.
                </div>
              )}
              {!showdownFailed && (
                <button type="button" onClick={toggleMuted} aria-label={muted ? 'Unmute battle sound' : 'Mute battle sound'} className="absolute bottom-3 left-3 z-20 rounded-full bg-white/95 p-2 text-slate-900 shadow">
                  {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
              )}
            </div>

            <div className="relative border-t border-slate-200 bg-slate-50 p-1.5 sm:p-6">
              {engineError && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{engineError}</p>}
              {resultMessage ? (
                <div className="py-5 text-center text-slate-900">
                  <Swords className="mx-auto mb-2 text-red-600" />
                  <p className="text-lg font-black">{resultMessage}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Confirming the result with your opponent…</p>
                </div>
              ) : submittingChoice || decision.kind === 'wait' ? (
                <div className="flex min-h-24 items-center justify-center gap-3 text-sm font-black text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-red-500" />
                  {engineStatus === 'starting' ? 'Starting battle…' : 'Waiting for your opponent…'}
                </div>
              ) : decision.kind === 'move' ? (
                <div>
                  {inspectedMove && (
                    <div id={`vs-move-details-${inspectedMove.slot}`} className="absolute inset-x-2 bottom-full z-40 mb-2 rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-xl sm:left-1/2 sm:right-auto sm:w-[min(680px,calc(100%-2rem))] sm:-translate-x-1/2">
                      <div className="flex items-center gap-2"><strong className="text-sm text-slate-950">{inspectedMove.name}</strong><span className={`${typeClasses[inspectedMove.type] ?? 'bg-slate-400'} rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-white`}>{inspectedMove.type}</span><MoveCategoryBadge category={inspectedMove.category} /></div>
                      <p className="mt-1.5 text-xs leading-relaxed">{inspectedMove.description || 'No move description is available.'}</p>
                    </div>
                  )}
                  <div className="mb-2 hidden items-center justify-end sm:flex">
                    {decision.switchingBlocked ? <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800"><LockKeyhole className="h-3.5 w-3.5" /> Active Pokémon is trapped</span> : <span className="text-xs font-bold text-slate-400">Hover or focus a move for details</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-1 sm:gap-2 xl:grid-cols-4">
                    {decision.moves.map(move => {
                      const effectiveness = effectivenessPresentation(move.effectiveness);
                      return (
                        <div key={move.slot} className="relative flex min-w-0 flex-col">
                          <button type="button" disabled={move.disabled} onClick={() => handleMove(move.slot)} onMouseEnter={() => setInspectedMoveSlot(move.slot)} onMouseLeave={() => setInspectedMoveSlot(current => current === move.slot ? null : current)} onFocus={() => setInspectedMoveSlot(move.slot)} onBlur={() => setInspectedMoveSlot(current => current === move.slot ? null : current)} className="group relative min-h-[70px] w-full touch-manipulation overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 text-left transition active:scale-[0.98] hover:border-red-300 hover:shadow-md focus-visible:border-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-[92px] sm:rounded-2xl sm:p-3 xl:min-h-[108px]">
                            <span className={`absolute inset-y-0 left-0 w-1 sm:w-1.5 ${typeClasses[move.type] ?? 'bg-slate-400'}`} />
                            <span className="flex items-start justify-between gap-1 pl-1.5 sm:gap-3 sm:pl-2"><span className="min-w-0"><span className="block truncate text-[11px] font-black leading-tight text-slate-900 sm:text-base">{move.name}</span><span className="mt-0.5 flex items-center gap-0.5 text-[8px] font-bold text-slate-500 sm:mt-1 sm:gap-1 sm:text-[11px]"><span className={`${typeClasses[move.type] ?? 'bg-slate-400'} rounded px-1 py-0.5 text-[7px] uppercase text-white sm:px-1.5 sm:text-[9px]`}>{move.type}</span><MoveCategoryBadge category={move.category} /></span></span><span className="shrink-0 text-right text-[9px] font-black leading-none text-slate-500 sm:text-[11px] sm:leading-normal">{move.pp}/{move.maxpp}<span className="ml-0.5 font-bold text-slate-400 sm:ml-0 sm:block">PP</span></span></span>
                            <span className="mt-1 flex items-center justify-between gap-1 pl-1.5 pr-7 text-[8px] font-bold sm:mt-2 sm:pl-2 sm:pr-0 sm:text-[10px]"><span className="truncate text-slate-400">{move.category === 'Status' ? 'Effect move' : `${move.power || '—'} power · ${move.accuracy === true ? 'Always hits' : `${move.accuracy}%`}`}</span><span className={`shrink-0 rounded-full border px-1 py-0.5 font-black sm:px-1.5 ${effectiveness.classes}`}>{effectiveness.label}</span></span>
                          </button>
                          <button type="button" onClick={() => setInspectedMoveSlot(current => current === move.slot ? null : move.slot)} aria-label={`Inspect ${move.name}`} className="absolute bottom-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600 shadow-sm sm:hidden"><Info className="h-3 w-3" /></button>
                        </div>
                      );
                    })}
                  </div>
                  {decision.switchingBlocked && <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-amber-100 px-2 py-1.5 text-[10px] font-black text-amber-800 sm:hidden"><LockKeyhole className="h-3 w-3" /> Active Pokémon is trapped and cannot switch</div>}
                  {switches.length > 0 && !decision.switchingBlocked && <details className="mt-1 rounded-lg border border-blue-100 bg-blue-50/70 px-2 py-1.5 sm:mt-3 sm:rounded-xl sm:p-3"><summary className="cursor-pointer text-[10px] font-black text-blue-800 sm:text-sm">Switch Pokémon instead</summary><div className="mt-2 grid gap-2 sm:grid-cols-2">{switches.map(choice => <button key={choice.slot} type="button" onClick={() => handleSwitch(choice.slot)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50 hover:shadow"><BattlePokemonImage id={choice.id} species={choice.species} variant="icon" className="h-12 w-12" /><span><strong className="block text-sm text-slate-800">{choice.species}</strong><span className="text-[11px] font-bold text-slate-500">{choice.condition}</span></span></button>)}</div></details>}
                </div>
              ) : decision.kind === 'switch' ? (
                <div>
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Choose your next Pokémon</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {switches.map(choice => (
                      <button key={choice.slot} type="button" onClick={() => handleSwitch(choice.slot)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50 hover:shadow"><BattlePokemonImage id={choice.id} species={choice.species} variant="icon" className="h-12 w-12" /><span><strong className="block text-sm text-slate-800">{choice.species}</strong><span className="text-[11px] font-bold text-slate-500">{choice.condition}</span></span></button>
                    ))}
                  </div>
                </div>
              ) : null}

              <button type="button" onClick={() => void handleForfeit()} className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-1.5 text-[10px] font-bold transition sm:mt-4 sm:py-2 sm:text-xs ${forfeitArmed ? 'bg-red-700 text-white' : 'text-slate-400 hover:bg-red-50 hover:text-red-700'}`}>
                <LogOut size={15} /> {forfeitArmed ? 'Click again to confirm forfeit' : 'Forfeit battle'}
              </button>
            </div>
          </section>

          <aside className="showdown-log-col h-full min-h-0 overflow-hidden border border-slate-200/80 bg-white text-slate-900 shadow-lg sm:shadow-2xl">
            {!showdownFailed ? <div className="relative h-full w-full"><div ref={setLogEl} className="showdown-log battle-log" /></div> : (
              <div className="p-5 text-sm text-slate-500">Battle log unavailable.</div>
            )}
          </aside>

          <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden"><span className="flex min-w-0 items-center gap-2.5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"><Swords className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-black text-slate-900">{opponentName}</span><span className="block truncate text-[10px] font-bold text-slate-500">Turn {snapshot?.turn ?? 0} · Battle details</span></span></span><span className="flex items-center gap-1 text-xs font-black text-slate-500">View <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" /></span></summary>
            <div className="border-t border-slate-200 bg-slate-50 p-3"><div className="rounded-xl border border-slate-200 bg-white p-3"><div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs font-black text-slate-900"><Swords className="h-3.5 w-3.5 text-red-600" /> Recent turns</span><span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Live</span></div><div className="space-y-1.5 text-xs leading-relaxed text-slate-600" aria-live="polite">{recentLog.map((message, index) => <p key={`${battleLog.length - recentLog.length + index}-${message}`} className="border-t border-slate-100 pt-1.5 first:border-0 first:pt-0">{message}</p>)}</div></div></div>
          </details>
      </div>

      <div className="relative mt-3 text-center"><Link to="/vs" className="text-xs font-bold text-slate-500 hover:text-red-700">Leave battle screen</Link></div>
    </main>
  );
}
