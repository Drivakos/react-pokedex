import type { TeamWithJoinedMembers } from '../../lib/supabase';
import { TeamRosterPreview } from '../teams/TeamRosterPreview';

export function VsTeamPicker({
  teams,
  selectedTeamId,
  onSelect,
  disabled = false,
}: {
  teams: TeamWithJoinedMembers[];
  selectedTeamId: number | null;
  onSelect: (teamId: number) => void;
  disabled?: boolean;
}) {
  if (teams.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
        You do not have a saved team yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {teams.map(team => {
        const count = team.team_members?.length ?? 0;
        const selected = selectedTeamId === team.id;
        return (
          <button
            key={team.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(team.id)}
            className={`rounded-xl border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
              selected
                ? 'border-red-500 bg-red-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <span className="block font-bold text-slate-900">{team.name}</span>
            <span className="mt-1 block text-sm text-slate-500">
              {count} Pokémon · Level 50 rules
            </span>
            <TeamRosterPreview members={team.team_members} />
          </button>
        );
      })}
    </div>
  );
}
