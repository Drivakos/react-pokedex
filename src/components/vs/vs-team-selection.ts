import type { TeamWithJoinedMembers } from '../../lib/supabase';

export function resolveVsSelectedTeamId(
  teams: TeamWithJoinedMembers[],
  selectedTeamId: number | null,
): number | null {
  if (teams.length === 1) return teams[0].id;
  if (selectedTeamId !== null && teams.some(team => team.id === selectedTeamId)) return selectedTeamId;
  return null;
}
