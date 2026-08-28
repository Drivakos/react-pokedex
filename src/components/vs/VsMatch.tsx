import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Copy, Link2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { getSavedInviteToken } from '../../services/vs-match.service';
import { useVsMatchStore } from '../../store/vsMatchStore';
import { VsBattle } from './VsBattle';

export default function VsMatch() {
  const { matchId = '' } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { match, loading, error, loadMatch, setReady, cancelInvite, subscribe } = useVsMatchStore();
  const [loadedMatchId, setLoadedMatchId] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;
    let active = true;
    void loadMatch(matchId)
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoadedMatchId(matchId);
      });
    const unsubscribe = subscribe(matchId);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadMatch, matchId, subscribe]);

  const isHost = match?.host_user_id === user?.id;
  const localReady = isHost ? match?.host_ready : match?.guest_ready;
  const token = match ? getSavedInviteToken(match.id) : null;
  const inviteUrl = useMemo(() => token ? `${window.location.origin}/vs/invite/${token}` : null, [token]);

  const copyInvite = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied');
    } catch {
      toast.error('The invite link could not be copied. Select it and copy it manually.');
    }
  }, [inviteUrl]);

  const handleCancel = async () => {
    try {
      await cancelInvite();
      navigate('/vs');
    } catch {
      // Store error is rendered inline.
    }
  };

  if (loadedMatchId !== matchId || (!match && loading)) {
    return <main className="min-h-screen bg-slate-100 py-20 text-center text-slate-600">Loading VS lobby…</main>;
  }

  if (!match || match.id !== matchId) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-16">
        <div className="mx-auto max-w-lg rounded-xl bg-white p-6 text-center shadow">
          <p className="text-red-700">{error || 'Match not found.'}</p>
          <Link to="/vs" className="mt-4 inline-block font-bold text-red-600">Back to VS</Link>
        </div>
      </main>
    );
  }

  if (match.status === 'active') {
    return user ? <VsBattle match={match} userId={user.id} /> : null;
  }

  if (['cancelled', 'expired', 'finished', 'desynced'].includes(match.status)) {
    const isTie = match.status === 'finished' && match.winner_user_id === null;
    const localWon = match.status === 'finished' && match.winner_user_id === user?.id;
    const title = match.status === 'desynced'
      ? 'Battle interrupted'
      : match.status === 'finished'
        ? isTie ? 'Battle tied' : localWon ? 'You won!' : 'You lost'
        : match.status === 'expired'
          ? 'Invite expired'
          : 'Match cancelled';
    const detail = match.status === 'desynced'
      ? 'The two battle simulations disagreed, so no winner was recorded.'
      : match.finish_reason === 'forfeit'
        ? localWon ? 'Your opponent forfeited the match.' : 'The match ended by forfeit.'
        : match.status === 'finished'
          ? 'The final result has been confirmed by both trainers.'
          : null;
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-16">
        <div className="mx-auto max-w-lg rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-black text-slate-900">{title}</h1>
          {detail && <p className="mt-2 text-sm text-slate-600">{detail}</p>}
          <Link to="/vs" className="mt-5 inline-block rounded-lg bg-red-600 px-5 py-2 font-bold text-white">Back to VS</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-black text-slate-900">VS Lobby</h1>
          <p className="mt-1 text-slate-600">Teams are locked. Start when both trainers are ready.</p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <TrainerCard
              name={match.hostName || 'Host'}
              teamName={match.host_team_snapshot.name}
              count={match.host_team_snapshot.members.length}
              ready={match.host_ready}
              waitingLabel="Host"
            />
            <TrainerCard
              name={match.guestName || (match.invitedName ? `Waiting for ${match.invitedName}…` : 'Waiting for a friend…')}
              teamName={match.guest_team_snapshot?.name}
              count={match.guest_team_snapshot?.members.length}
              ready={match.guest_ready}
              waitingLabel="Challenger"
            />
          </div>

          {match.status === 'invited' && isHost && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Link2 size={18} />
                {match.invitedName ? `Challenge sent to ${match.invitedName}` : 'Invite your friend'}
              </div>
              {match.invitedName && (
                <p className="mt-1 text-sm text-green-700">They can open the invitation from their notifications.</p>
              )}
              {inviteUrl ? (
                <div className="mt-3 flex gap-2">
                  <input readOnly value={inviteUrl} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  <button type="button" onClick={() => void copyInvite()} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-bold text-white">
                    <Copy size={16} /> {match.invitedName ? 'Copy link' : 'Copy'}
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-amber-700">This tab no longer has the invite secret. Cancel and create a new invite to share another link.</p>
              )}
            </div>
          )}

          {match.status === 'lobby' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void setReady(!localReady).catch(() => undefined)}
              className={`mt-6 w-full rounded-xl px-5 py-3 font-bold text-white transition disabled:opacity-50 ${localReady ? 'bg-slate-600 hover:bg-slate-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {localReady ? 'Not ready' : 'Ready to battle'}
            </button>
          )}

          {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

          {isHost && (
            <button type="button" disabled={loading} onClick={() => void handleCancel()} className="mt-4 w-full text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">
              Cancel match
            </button>
          )}
        </section>
      </div>
    </main>
  );
}

function TrainerCard({
  name,
  teamName,
  count,
  ready,
  waitingLabel,
}: {
  name: string;
  teamName?: string;
  count?: number;
  ready: boolean;
  waitingLabel: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{waitingLabel}</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{name}</h2>
          {teamName && <p className="mt-1 text-sm text-slate-500">{teamName} · {count} Pokémon</p>}
        </div>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${ready ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
          {ready ? <Check size={18} /> : <X size={18} />}
        </span>
      </div>
    </div>
  );
}
