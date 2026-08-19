import type { TeamWithJoinedMembers } from '../../../lib/supabase';
import { getVsTeamErrors } from '../vs-team-validation';

const validTeam: TeamWithJoinedMembers = {
  id: 1,
  user_id: 'user-1',
  name: 'Valid team',
  team_members: [{
    id: 1,
    team_id: 1,
    pokemon_id: 25,
    position: 1,
    ability: 'Static',
    moves: ['thunderbolt'],
    level: 50,
    evs: { hp: 4, attack: 0, defense: 0, 'special-attack': 252, 'special-defense': 0, speed: 252 },
    ivs: { hp: 31, attack: 0, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
  }],
};

describe('VS lobby team validation', () => {
  it('accepts a structurally complete team without loading simulator data', async () => {
    await expect(getVsTeamErrors(validTeam)).resolves.toEqual([]);
  });

  it('returns actionable build errors', async () => {
    const errors = await getVsTeamErrors({
      ...validTeam,
      team_members: [{
        ...validTeam.team_members![0],
        ability: '',
        moves: [],
        evs: { hp: 252, attack: 252, defense: 252, 'special-attack': 0, 'special-defense': 0, speed: 0 },
        ivs: { hp: 32, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
      }],
    });

    expect(errors).toEqual(expect.arrayContaining([
      'Pokémon in position 1 needs an ability.',
      'Pokémon in position 1 needs between one and four moves.',
      'Pokémon in position 1 has more than 510 total EVs.',
      'Pokémon in position 1 has invalid IVs.',
    ]));
  });
});
