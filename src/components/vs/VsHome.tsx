import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Link2, Swords } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useVsMatchStore } from '../../store/vsMatchStore';
import { VsTeamPicker } from './VsTeamPicker';
import { resolveVsSelectedTeamId } from './vs-team-selection';
import { getVsTeamErrors } from './vs-team-validation';

export default function VsHome() {
  const navigate = useNavigate();
  const { teams, teamsLoaded, teamsError, fetchTeams } = useAuth();
  const { createInvite, loading, error, clearError } = useVsMatchStore();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [teamErrors, setTeamErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!teamsLoaded) void fetchTeams();
  }, [fetchTeams, teamsLoaded]);

  useEffect(() => {
    if (!teamsLoaded) return;
    setSelectedTeamId(current => resolveVsSelectedTeamId(teams, current));
  }, [teams, teamsLoaded]);

  const handleCreate = async () => {
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
      const match = await createInvite(team.id);
      navigate(`/vs/match/${match.id}`);
    } catch {
      // The store exposes the server message inline.
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
            <Swords aria-hidden="true" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">VS Battle</h1>
          <p className="mt-2 text-slate-600">Choose a saved team and invite a friend to battle.</p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Choose your team</h2>
              <p className="text-sm text-slate-500">Teams are copied and locked when the invite is created.</p>
            </div>
            <Link to="/teams" className="shrink-0 text-sm font-semibold text-red-600 hover:text-red-700">
              Manage teams
            </Link>
          </div>

          {teamsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-800">
              <p>{teamsError}</p>
              <button className="mt-2 font-bold underline" onClick={() => void fetchTeams()}>Try again</button>
            </div>
          ) : !teamsLoaded ? (
            <div className="py-10 text-center text-slate-500">Loading your teams…</div>
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

          {(teamErrors.length > 0 || error) && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error && <p>{error}</p>}
              {teamErrors.map(message => <p key={message}>{message}</p>)}
            </div>
          )}

          <button
            type="button"
            disabled={loading || !teamsLoaded || Boolean(teamsError) || teams.length === 0}
            onClick={() => void handleCreate()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Link2 size={18} aria-hidden="true" />
            {loading ? 'Creating invite…' : 'Create invite link'}
          </button>
        </section>
      </div>
    </main>
  );
}
