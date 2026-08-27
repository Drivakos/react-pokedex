import type { TeamMember, TeamWithJoinedMembers } from '../lib/supabase';
import { sortTeamMembers } from './team-builder';

function updateTeamMembers(
  teams: TeamWithJoinedMembers[],
  teamId: number,
  update: (members: TeamMember[]) => TeamMember[],
): TeamWithJoinedMembers[] {
  return teams.map(team => team.id === teamId
    ? { ...team, team_members: sortTeamMembers(update(team.team_members ?? [])) }
    : team);
}

export function addTeamMemberToCollection(
  teams: TeamWithJoinedMembers[],
  member: TeamMember,
): TeamWithJoinedMembers[] {
  return updateTeamMembers(teams, member.team_id, members => [
    ...members.filter(existing => existing.id !== member.id && existing.position !== member.position),
    member,
  ]);
}

export function updateTeamMemberInCollection(
  teams: TeamWithJoinedMembers[],
  member: TeamMember,
): TeamWithJoinedMembers[] {
  return updateTeamMembers(teams, member.team_id, members =>
    members.map(existing => existing.id === member.id ? member : existing));
}

export function removeTeamMemberFromCollection(
  teams: TeamWithJoinedMembers[],
  teamId: number,
  position: number,
): TeamWithJoinedMembers[] {
  return updateTeamMembers(teams, teamId, members =>
    members.filter(member => member.position !== position));
}

export function reorderTeamMembersInCollection(
  teams: TeamWithJoinedMembers[],
  teamId: number,
  memberIds: number[],
): TeamWithJoinedMembers[] {
  const positionByMemberId = new Map(memberIds.map((memberId, index) => [memberId, index + 1]));
  return updateTeamMembers(teams, teamId, members => members.map(member => ({
    ...member,
    position: positionByMemberId.get(member.id) ?? member.position,
  })));
}
