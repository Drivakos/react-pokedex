import type { TeamWithJoinedMembers } from '../../lib/supabase';
import { RANDOM_VS_TEAM, type VsTeamSelection } from '../../types/vs';

export { RANDOM_VS_TEAM, type VsTeamSelection } from '../../types/vs';

export function resolveVsSelectedTeamId(
  teams: TeamWithJoinedMembers[],
  selectedTeamId: VsTeamSelection | null,
): VsTeamSelection | null {
  if (selectedTeamId === RANDOM_VS_TEAM) return selectedTeamId;
  if (teams.length === 1) return teams[0].id;
  if (selectedTeamId !== null && teams.some(team => team.id === selectedTeamId)) return selectedTeamId;
  return null;
}
