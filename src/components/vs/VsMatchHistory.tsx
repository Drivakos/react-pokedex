import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Play, RefreshCw } from 'lucide-react';
import { getVsMatchHistory } from '../../services/vs-match.service';
import type { VsMatchHistoryItem } from '../../types/vs';

export function VsMatchHistory({ userId, embedded = false }: { userId: string; embedded?: boolean }) {
  const [matches, setMatches] = useState<VsMatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      setMatches(await getVsMatchHistory());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Battle history could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  return (
    <section className={`${embedded ? '' : 'mt-8'} rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8`} aria-labelledby="vs-history-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="vs-history-title" className="flex items-center gap-2 text-xl font-black text-slate-900">
            <History size={20} className="text-red-600" aria-hidden="true" /> VS match history
          </h2>
          <p className="mt-1 text-sm text-slate-500">Completed matches are saved and can be watched again.</p>
        </div>
        <button type="button" onClick={() => void loadHistory()} disabled={loading} aria-label="Refresh battle history" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && matches.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading battle history…</p>
      ) : error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
      ) : matches.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500">Your completed VS battles will appear here.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {matches.map(match => {
            const tied = match.winnerUserId === null;
            const won = match.winnerUserId === userId;
            const result = tied ? 'Tie' : won ? 'Win' : 'Loss';
            const resultClass = tied ? 'bg-slate-100 text-slate-700' : won ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
            return (
              <article key={match.matchId} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${resultClass}`}>{result}</span>
                    <h3 className="truncate font-black text-slate-900">vs {match.opponentName}</h3>
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                    {match.userTeamName} vs {match.opponentTeamName} · {new Date(match.finishedAt).toLocaleDateString()}
                    {match.finishReason === 'forfeit' ? ' · Forfeit' : ''}
                  </p>
                </div>
                <Link to={`/vs/replay/${match.matchId}`} className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700">
                  <Play size={15} fill="currentColor" aria-hidden="true" /> Watch replay
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
