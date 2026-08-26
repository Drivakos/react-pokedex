import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useVsMatchStore } from '../../store/vsMatchStore';
import { VsTeamPicker } from './VsTeamPicker';
import { resolveVsSelectedTeamId } from './vs-team-selection';
import { getVsTeamErrors } from './vs-team-validation';

export default function VsInvite() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { teams, teamsLoaded, fetchTeams } = useAuth();
  const { invitePreview, loading, error, inspectInvite, acceptInvite, clearError } = useVsMatchStore();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [teamErrors, setTeamErrors] = useState<string[]>([]);

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (!teamsLoaded) return;
    setSelectedTeamId(current => resolveVsSelectedTeamId(teams, current));
  }, [teams, teamsLoaded]);

  useEffect(() => {
    if (!token) return;
    void inspectInvite(token)
      .then(preview => {
        if (preview.isHost) navigate(`/vs/match/${preview.matchId}`, { replace: true });
      })
      .catch(() => undefined);
  }, [inspectInvite, navigate, token]);

  const handleAccept = async () => {
    clearError();
    setTeamErrors([]);
    const team = teams.find(entry => entry.id === selectedTeamId);
    if (!team) {
      setTeamErrors(['Choose a saved team first.']);
      return;
    }
    const issues = await getVsTeamErrors(team);
    if (issues.length > 0) {
      setTeamErrors(issues);
      return;
    }
    try {
      const match = await acceptInvite(token, team.id);
      navigate(`/vs/match/${match.id}`, { replace: true });
    } catch {
      // The store exposes the server message inline.
    }
  };

  const unavailable = invitePreview && invitePreview.status !== 'invited';

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white">
            <Swords aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Battle invitation</h1>
            {invitePreview && <p className="text-slate-600">{invitePreview.hostName} challenged you.</p>}
          </div>
        </div>

        {loading && !invitePreview && <p className="py-10 text-center text-slate-500">Checking invitation…</p>}

        {(error || unavailable) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error || `This invitation is ${invitePreview?.status}.`}
            <div className="mt-3"><Link to="/vs" className="font-bold underline">Create your own battle</Link></div>
          </div>
        )}

        {invitePreview && !unavailable && !invitePreview.isHost && (
          <>
            <div className="mb-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              Gen 9 Custom Game · All Pokémon are normalized to level 50 · Casual battle
            </div>
            <h2 className="mb-3 text-lg font-bold text-slate-900">Choose your team</h2>
            {!teamsLoaded ? (
              <p className="py-8 text-center text-slate-500">Loading your teams…</p>
            ) : (
              <VsTeamPicker
                teams={teams}
                selectedTeamId={selectedTeamId}
                onSelect={teamId => {
                  setSelectedTeamId(teamId);
                  setTeamErrors([]);
                  clearError();
                }}
                disabled={loading}
              />
            )}

            {teamErrors.length > 0 && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {teamErrors.map(message => <p key={message}>{message}</p>)}
              </div>
            )}

            <button
              type="button"
              disabled={loading || teams.length === 0}
              onClick={() => void handleAccept()}
              className="mt-6 w-full rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Joining lobby…' : 'Accept challenge'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
