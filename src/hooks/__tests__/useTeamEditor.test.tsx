import { act, renderHook, waitFor } from '@testing-library/react';
import type { Team, TeamMember } from '../../lib/supabase';

const mockGetTeamMembers = jest.fn();
const mockAddPokemonToTeam = jest.fn();
const mockRemovePokemonFromTeam = jest.fn();
const mockUpdateTeamMemberBuild = jest.fn();
const mockReorderTeamMembers = jest.fn();
const mockGetBatch = jest.fn();

let mockTeams: Team[] = [];

jest.mock('../useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    teams: mockTeams,
    teamsLoaded: true,
    getTeamMembers: mockGetTeamMembers,
    addPokemonToTeam: mockAddPokemonToTeam,
    removePokemonFromTeam: mockRemovePokemonFromTeam,
    updateTeamMemberBuild: mockUpdateTeamMemberBuild,
    reorderTeamMembers: mockReorderTeamMembers,
  }),
}));

jest.mock('../../services/pokemon.service', () => ({
  PokemonService: { getBatch: (...args: unknown[]) => mockGetBatch(...args) },
}));

jest.mock('../../services/api', () => ({ fetchPokemonData: jest.fn() }));
jest.mock('react-hot-toast', () => ({ error: jest.fn(), success: jest.fn() }));

import { useTeamEditor } from '../useTeamEditor';

const team = (id: number): Team => ({ id, user_id: 'user-1', name: `Team ${id}` });
const member = (id: number, teamId: number, pokemonId: number): TeamMember => ({
  id,
  team_id: teamId,
  pokemon_id: pokemonId,
  position: 1,
});

function pokemon(id: number) {
  return {
    id,
    name: `pokemon-${id}`,
    sprites: {
      front_default: `${id}.png`,
      official_artwork: `${id}-art.png`,
      back_default: '',
      front_shiny: '',
      back_shiny: '',
    },
    types: ['normal'],
    moves: [],
    generation: 'generation-i',
    has_evolutions: false,
    is_default: true,
    base_experience: 0,
    height: 1,
    weight: 1,
    stats: { hp: 1, attack: 1, defense: 1, 'special-attack': 1, 'special-defense': 1, speed: 1 },
  };
}

describe('useTeamEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTeams = [team(1), team(2)];
    mockGetBatch.mockImplementation(async (ids: number[]) => ids.map(pokemon));
  });

  it('ignores a slow response from a previously opened team', async () => {
    let resolveFirst: (members: TeamMember[]) => void = () => undefined;
    let resolveSecond: (members: TeamMember[]) => void = () => undefined;
    mockGetTeamMembers.mockImplementation((teamId: number) => new Promise<TeamMember[]>(resolve => {
      if (teamId === 1) resolveFirst = resolve;
      else resolveSecond = resolve;
    }));

    const { result, rerender } = renderHook(({ teamId }) => useTeamEditor(teamId), {
      initialProps: { teamId: 1 },
    });
    rerender({ teamId: 2 });

    await act(async () => resolveSecond([member(2, 2, 4)]));
    await waitFor(() => expect(result.current.teamMembers[0]?.id).toBe(2));

    await act(async () => resolveFirst([member(1, 1, 25)]));
    await act(async () => Promise.resolve());

    expect(result.current.currentTeam?.id).toBe(2);
    expect(result.current.teamMembers.map(entry => entry.id)).toEqual([2]);
  });

  it('keeps the search open and does not refresh members when an add fails', async () => {
    mockGetTeamMembers.mockResolvedValue([]);
    mockAddPokemonToTeam.mockResolvedValue(false);
    const { result } = renderHook(() => useTeamEditor(1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setShowPokemonSearch(true));
    let added: TeamMember | null = null;
    await act(async () => {
      added = await result.current.addPokemon({
        id: 25,
        name: 'pikachu',
        sprites: { front_default: '', other: { 'official-artwork': { front_default: '' } } },
        types: [{ type: { name: 'electric' } }],
        stats: [],
        abilities: [],
      });
    });

    expect(added).toBeNull();
    expect(result.current.showPokemonSearch).toBe(true);
    expect(mockGetTeamMembers).toHaveBeenCalledTimes(1);
  });

  it('applies the confirmed added row without refetching the roster', async () => {
    mockGetTeamMembers.mockResolvedValue([]);
    const addedMember = member(3, 1, 25);
    mockAddPokemonToTeam.mockResolvedValue(addedMember);
    const { result } = renderHook(() => useTeamEditor(1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const automaticBuild: Partial<TeamMember> = {
      ability: 'static',
      moves: ['thunderbolt'],
    };

    act(() => result.current.setShowPokemonSearch(true));
    await act(async () => {
      await result.current.addPokemon({
        id: 25,
        name: 'pikachu',
        sprites: { front_default: '', other: { 'official-artwork': { front_default: '' } } },
        types: [{ type: { name: 'electric' } }],
        stats: [],
        abilities: [],
      }, automaticBuild);
    });

    expect(mockAddPokemonToTeam).toHaveBeenCalledWith(1, 25, 1, automaticBuild);
    expect(mockUpdateTeamMemberBuild).not.toHaveBeenCalled();
    expect(result.current.teamMembers).toEqual([addedMember]);
    expect(result.current.showPokemonSearch).toBe(false);
    expect(mockGetTeamMembers).toHaveBeenCalledTimes(1);
  });
});
