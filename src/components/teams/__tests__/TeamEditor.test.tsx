import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TeamMember } from '../../../lib/supabase';
import type { TeamPokemonData } from '../../../types/team-builder';

const mockNavigate = jest.fn();
const mockUpdateTeam = jest.fn();
const mockFetchAutomaticPokemonBuild = jest.fn();
const mockToastError = jest.fn();

const testPokemon: TeamPokemonData = {
  id: 1,
  name: 'bulbasaur',
  sprites: {
    front_default: 'bulbasaur.png',
    other: { 'official-artwork': { front_default: 'bulbasaur-art.png' } },
  },
  types: [{ type: { name: 'grass' } }, { type: { name: 'poison' } }],
  stats: [],
  abilities: [],
};

const addedMember: TeamMember = {
  id: 99,
  team_id: 5,
  pokemon_id: testPokemon.id,
  position: 1,
};

const mockEditor = {
  currentTeam: { id: 5, user_id: 'user-1', name: 'Test team' },
  teamMembers: [] as TeamMember[],
  pokemonData: {} as Record<number, TeamPokemonData>,
  selectedMember: null as TeamMember | null,
  loading: false,
  error: null,
  showPokemonSearch: true,
  showMovesetEditor: false,
  searchQuery: '',
  searchResults: [testPokemon],
  searching: false,
  setSearchQuery: jest.fn(),
  setShowPokemonSearch: jest.fn(),
  addPokemon: jest.fn(),
  removePokemon: jest.fn(),
  updateMemberBuild: jest.fn(),
  movePokemon: jest.fn(),
  editMember: jest.fn(),
  closeMovesetEditor: jest.fn(),
  closePokemonSearch: jest.fn(),
};

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ teamId: '5' }),
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    updateTeam: mockUpdateTeam,
  }),
}));

jest.mock('../../../hooks/useTeamEditor', () => ({
  useTeamEditor: () => mockEditor,
}));

jest.mock('../../../services/premade-builds.service', () => ({
  fetchAutomaticPokemonBuild: (...args: unknown[]) => mockFetchAutomaticPokemonBuild(...args),
}));

jest.mock('react-hot-toast', () => ({
  error: (...args: unknown[]) => mockToastError(...args),
  success: jest.fn(),
}));

jest.mock('../editor/TeamEditorHeader', () => ({
  TeamEditorHeader: () => <div>Team editor header</div>,
}));

jest.mock('../editor/TeamMemberTabs', () => ({
  TeamMemberTabs: () => <div>Team member tabs</div>,
}));

jest.mock('../editor/PokemonSearchModal', () => ({
  PokemonSearchModal: ({
    onAddPokemon,
    searchResults,
  }: {
    onAddPokemon: (pokemon: TeamPokemonData) => Promise<void>;
    searchResults: TeamPokemonData[];
  }) => (
    <button onClick={() => void onAddPokemon(searchResults[0])}>
      Add test Pokémon
    </button>
  ),
}));

jest.mock('../MovesetEditor', () => () => <div>Moveset editor</div>);

import TeamEditor from '../TeamEditor';

describe('TeamEditor automatic builds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEditor.addPokemon.mockResolvedValue(addedMember);
  });

  it('adds the Pokémon and generated build in one editor call', async () => {
    const automaticBuild: Partial<TeamMember> = {
      ability: 'overgrow',
      moves: ['giga-drain', 'sludge-bomb'],
      item: 'black-sludge',
    };
    mockFetchAutomaticPokemonBuild.mockResolvedValue(automaticBuild);

    render(<TeamEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Add test Pokémon' }));

    await waitFor(() => expect(mockEditor.addPokemon).toHaveBeenCalledWith(testPokemon, automaticBuild));
    expect(mockEditor.addPokemon).toHaveBeenCalledTimes(1);
    expect(mockEditor.editMember).toHaveBeenCalledWith(addedMember);
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('adds the Pokémon without a build when automatic generation fails', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockFetchAutomaticPokemonBuild.mockRejectedValue(new Error('build service unavailable'));

    render(<TeamEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Add test Pokémon' }));

    await waitFor(() => expect(mockEditor.addPokemon).toHaveBeenCalledWith(testPokemon, undefined));
    expect(mockEditor.addPokemon).toHaveBeenCalledTimes(1);
    expect(mockEditor.editMember).toHaveBeenCalledWith(addedMember);
    expect(mockToastError).toHaveBeenCalledWith(
      'Pokémon added without an automatic build. Please configure it manually.',
    );
    warning.mockRestore();
  });
});
