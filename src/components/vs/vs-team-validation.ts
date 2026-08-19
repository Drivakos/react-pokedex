import type { TeamWithJoinedMembers } from '../../lib/supabase';

export async function getVsTeamErrors(team: TeamWithJoinedMembers): Promise<string[]> {
  const members = team.team_members ?? [];
  if (members.length === 0) return ['Add at least one Pokémon to this team.'];
  if (members.length > 6) return ['A battle team can contain at most six Pokémon.'];

  const errors = new Set<string>();
  for (const member of members) {
    if (!member.ability?.trim()) errors.add(`Pokémon in position ${member.position} needs an ability.`);
    const moves = member.moves?.filter(move => move.trim()) ?? [];
    if (moves.length < 1 || moves.length > 4) {
      errors.add(`Pokémon in position ${member.position} needs between one and four moves.`);
    }
    const level = member.level ?? 50;
    if (!Number.isInteger(level) || level < 1 || level > 100) {
      errors.add(`Pokémon in position ${member.position} has an invalid level.`);
    }

    const evs = member.evs ? Object.values(member.evs) : [];
    if (evs.some(value => !Number.isInteger(value) || value < 0 || value > 252)) {
      errors.add(`Pokémon in position ${member.position} has invalid EVs.`);
    } else if (evs.reduce((total, value) => total + value, 0) > 510) {
      errors.add(`Pokémon in position ${member.position} has more than 510 total EVs.`);
    }

    const ivs = member.ivs ? Object.values(member.ivs) : [];
    if (ivs.some(value => !Number.isInteger(value) || value < 0 || value > 31)) {
      errors.add(`Pokémon in position ${member.position} has invalid IVs.`);
    }
  }
  return [...errors];
}
