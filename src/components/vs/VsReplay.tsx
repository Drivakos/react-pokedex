import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, RotateCcw, Swords, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getVsChoicePairs, getVsMatch } from '../../services/vs-match.service';
import { VsReplaySession } from '../../services/vs-replay-session';
import { useBattleEngineStore } from '../../store/battleEngineStore';
import type { BattleResult } from '../../types/battle-run';
import type { VsChoicePair, VsMatch } from '../../types/vs';
import { toVsRunPokemon } from '../../utils/vs-battle';
import { isShowdownMuted, setShowdownMuted } from '../battle-game/showdown-client';
import { ShowdownStage } from '../battle-game/ShowdownStage';

export default function VsReplay() {
  const { matchId = '' } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const [match, setMatch] = useState<VsMatch | null>(null);
  const [choicePairs, setChoicePairs] = useState<VsChoicePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([getVsMatch(matchId), getVsChoicePairs(matchId)])
      .then(([loadedMatch, loadedPairs]) => {
        if (!active) return;
        if (loadedMatch.status !== 'finished') throw new Error('Only completed matches can be replayed.');
        if (!loadedMatch.battle_seed || !loadedMatch.guest_team_snapshot) throw new Error('This match is missing replay data.');
        setMatch(loadedMatch);
        setChoicePairs(loadedPairs);
      })
      .catch(loadError => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'The replay could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [matchId]);

  if (loading) return <main className="min-h-screen bg-slate-100 py-20 text-center text-slate-600">Loading replay…</main>;
  if (!match || !user || error) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-16">
        <div className="mx-auto max-w-lg rounded-xl bg-white p-6 text-center shadow">
          <p className="font-semibold text-red-700">{error || 'Replay not found.'}</p>
          <Link to="/vs" className="mt-4 inline-block font-bold text-red-600">Back to VS</Link>
        </div>
      </main>
    );
  }

  return <VsReplayPlayer match={match} choicePairs={choicePairs} userId={user.id} />;
}

function VsReplayPlayer({ match, choicePairs, userId }: { match: VsMatch; choicePairs: VsChoicePair[]; userId: string }) {
  const isHost = match.host_user_id === userId;
  const playerTeam = isHost ? match.host_team_snapshot : match.guest_team_snapshot!;
  const opponentTeam = isHost ? match.guest_team_snapshot! : match.host_team_snapshot;
  const playerName = isHost ? match.hostName || 'Host' : match.guestName || 'Challenger';
  const opponentName = isHost ? match.guestName || 'Challenger' : match.hostName || 'Host';
  const startBattle = useBattleEngineStore(state => state.startBattle);
  const resetBattle = useBattleEngineStore(state => state.resetBattle);
  const snapshot = useBattleEngineStore(state => state.snapshot);
  const engineStatus = useBattleEngineStore(state => state.status);
  const engineError = useBattleEngineStore(state => state.error);
  const visualEvents = useBattleEngineStore(state => state.visualEvents);
  const consumeVisualEvent = useBattleEngineStore(state => state.consumeVisualEvent);
  const [logEl, setLogEl] = useState<HTMLDivElement | null>(null);
  const [rendererFailed, setRendererFailed] = useState(false);
  const [muted, setMuted] = useState(() => isShowdownMuted());
  const [replayRun, setReplayRun] = useState(0);
  const [completed, setCompleted] = useState(false);

  const playerParty = useMemo(() => playerTeam.members.map(toVsRunPokemon), [playerTeam]);
  const opponentParty = useMemo(() => opponentTeam.members.map(toVsRunPokemon), [opponentTeam]);
  const recordedResult = useMemo<BattleResult>(() => ({
    winner: match.winner_user_id === null ? 'tie' : match.winner_user_id === userId ? 'player' : 'opponent',
    faintedPlayerSpecies: [],
  }), [match.winner_user_id, userId]);

  useEffect(() => {
    setCompleted(false);
    startBattle({
      playerParty,
      enemyParty: opponentParty,
      level: 50,
      introLog: [`Replay: ${playerName} vs ${opponentName}`],
      sessionFactory: ({ callbacks }) => new VsReplaySession({
        isHost,
        playerParty,
        opponentParty,
        battleSeed: match.battle_seed!,
        playerName,
        opponentName,
        choicePairs,
        recordedResult,
        callbacks,
      }),
      onEnd: () => setCompleted(true),
    });
    return resetBattle;
  }, [choicePairs, isHost, match.battle_seed, opponentName, opponentParty, playerName, playerParty, recordedResult, replayRun, resetBattle, startBattle]);

  useEffect(() => {
    if (!rendererFailed) return;
    for (const event of visualEvents) consumeVisualEvent(event.id);
  }, [consumeVisualEvent, rendererFailed, visualEvents]);

  const toggleMuted = () => {
    const next = !muted;
    setShowdownMuted(next);
    setMuted(next);
  };

  const resultLabel = recordedResult.winner === 'tie' ? 'The match ended in a tie.' : recordedResult.winner === 'player' ? 'You won this match.' : `${opponentName} won this match.`;

  return (
    <main className="battle-run-theme min-h-[calc(100svh-4rem)] bg-gradient-to-br from-slate-100 via-indigo-50 to-red-50 px-3 py-4 sm:px-6">
      <header className="mx-auto mb-4 flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-white bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><Play size={18} fill="currentColor" /></span>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-slate-950">{playerName} <span className="text-slate-400">vs</span> {opponentName}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Battle replay · Turn {snapshot?.turn ?? 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleMuted} aria-label={muted ? 'Unmute replay sound' : 'Mute replay sound'} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700">
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <button type="button" onClick={() => setReplayRun(run => run + 1)} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">
            <RotateCcw size={16} /> Replay again
          </button>
          <Link to={`/vs/match/${match.id}`} className="rounded-lg px-3 py-2 text-sm font-bold text-red-600">Match result</Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden border border-slate-200 bg-white shadow-xl">
          <div className="battle-stage relative h-[min(62svh,560px)] min-h-[360px] overflow-hidden bg-slate-950">
            {!rendererFailed && <ShowdownStage logEl={logEl} onLoadError={() => setRendererFailed(true)} />}
            {rendererFailed && <div className="flex h-full items-center justify-center px-6 text-center font-semibold text-slate-300">The animated replay renderer could not load. The recorded result is still available below.</div>}
          </div>
          <div className="border-t border-slate-200 bg-white p-4 text-center">
            {engineError ? (
              <p className="font-semibold text-red-700">{engineError}</p>
            ) : completed ? (
              <p className="flex items-center justify-center gap-2 font-black text-slate-900"><Swords size={18} className="text-red-600" /> {resultLabel}</p>
            ) : (
              <p className="font-semibold text-slate-500">{engineStatus === 'starting' ? 'Preparing the replay…' : 'Playing recorded battle…'}</p>
            )}
          </div>
        </section>
        <aside className="showdown-log-col min-h-[420px] overflow-hidden border border-slate-200 bg-white shadow-xl">
          <div ref={setLogEl} className="showdown-log battle-log h-full" />
        </aside>
      </div>
    </main>
  );
}
