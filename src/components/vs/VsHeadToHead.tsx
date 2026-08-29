import { Minus, Trophy } from 'lucide-react';
import type { VsHeadToHeadRecord } from '../../types/vs';

export function VsHeadToHead({ record }: { record: VsHeadToHeadRecord }) {
  const hasBattled = record.totalBattles > 0;

  return (
    <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4" aria-label={`Record against ${record.opponentName}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-indigo-500">Head-to-head</p>
          <h2 className="mt-0.5 font-black text-slate-900">You vs {record.opponentName}</h2>
        </div>
        <Trophy className="text-indigo-500" size={22} aria-hidden="true" />
      </div>

      {hasBattled ? (
        <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-lg border border-indigo-100 bg-white text-center">
          <RecordStat label="Battles" value={record.totalBattles} />
          <RecordStat label="Wins" value={record.userWins} tone="win" />
          <RecordStat label="Losses" value={record.opponentWins} tone="loss" />
          <RecordStat label="Ties" value={record.ties} />
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-600">
          <Minus size={16} aria-hidden="true" /> This will be your first recorded battle together.
        </p>
      )}
    </section>
  );
}

function RecordStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'win' | 'loss';
}) {
  const valueClass = tone === 'win' ? 'text-emerald-600' : tone === 'loss' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="border-l border-indigo-100 px-2 py-2.5 first:border-l-0">
      <strong className={`block text-lg ${valueClass}`}>{value}</strong>
      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}
