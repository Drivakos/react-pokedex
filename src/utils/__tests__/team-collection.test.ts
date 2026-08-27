import type { TeamMember, TeamWithJoinedMembers } from '../../lib/supabase';
import {
  addTeamMemberToCollection,
  removeTeamMemberFromCollection,
  reorderTeamMembersInCollection,
  updateTeamMemberInCollection,
} from '../team-collection';

const member = (id: number, position: number, overrides: Partial<TeamMember> = {}): TeamMember => ({
  id,
  team_id: 1,
  pokemon_id: id * 10,
  position,
  ...overrides,
});

const collection = (members: TeamMember[]): TeamWithJoinedMembers[] => [{
  id: 1,
  user_id: 'user-1',
  name: 'Team One',
  team_members: members,
}, {
  id: 2,
  user_id: 'user-1',
  name: 'Team Two',
  team_members: [],
}];

describe('team collection updates', () => {
  it('adds a confirmed member in position order without mutating the source', () => {
    const source = collection([member(1, 1), member(3, 3)]);
    const result = addTeamMemberToCollection(source, member(2, 2));

    expect(result[0].team_members?.map(entry => entry.id)).toEqual([1, 2, 3]);
    expect(source[0].team_members?.map(entry => entry.id)).toEqual([1, 3]);
    expect(result[1]).toBe(source[1]);
  });

  it('updates and removes only the confirmed member', () => {
    const source = collection([member(1, 1), member(2, 2)]);
    const updated = updateTeamMemberInCollection(source, member(2, 2, { ability: 'static' }));
    const removed = removeTeamMemberFromCollection(updated, 1, 1);

    expect(updated[0].team_members?.[1].ability).toBe('static');
    expect(removed[0].team_members?.map(entry => entry.id)).toEqual([2]);
  });

  it('applies an atomic server-confirmed roster order locally', () => {
    const source = collection([member(1, 1), member(2, 2), member(3, 3)]);
    const result = reorderTeamMembersInCollection(source, 1, [3, 1, 2]);

    expect(result[0].team_members?.map(entry => [entry.id, entry.position])).toEqual([
      [3, 1],
      [1, 2],
      [2, 3],
    ]);
  });
});
