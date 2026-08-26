import type { TeamWithJoinedMembers } from '../../../lib/supabase';
import { resolveVsSelectedTeamId } from '../vs-team-selection';

const team = (id: number): TeamWithJoinedMembers => ({
  id,
  user_id: 'user-1',
  name: `Team ${id}`,
  team_members: [],
});

describe('VS team selection', () => {
  it('automatically selects the only available team', () => {
    expect(resolveVsSelectedTeamId([team(7)], null)).toBe(7);
  });

  it('does not choose for the player when multiple teams are available', () => {
    expect(resolveVsSelectedTeamId([team(1), team(2)], null)).toBeNull();
  });

  it('preserves a valid manual selection and clears a removed team', () => {
    const teams = [team(1), team(2)];
    expect(resolveVsSelectedTeamId(teams, 2)).toBe(2);
    expect(resolveVsSelectedTeamId(teams, 3)).toBeNull();
  });
});
