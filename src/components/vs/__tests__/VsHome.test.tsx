import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { AnchorHTMLAttributes } from 'react';
import type { VsFriendPresence } from '../../../services/presence.service';
import VsHome from '../VsHome';

const mockGetVsFriendsPresence = jest.fn<Promise<VsFriendPresence[]>, []>();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    teams: [],
    teamsLoaded: true,
    teamsError: null,
    fetchTeams: jest.fn(),
  }),
}));

jest.mock('../../../services/presence.service', () => ({
  getVsFriendsPresence: () => mockGetVsFriendsPresence(),
}));

jest.mock('../../../store/vsMatchStore', () => ({
  useVsMatchStore: () => ({
    createInvite: jest.fn(),
    createFriendInvite: jest.fn(),
    loading: false,
    error: null,
    clearError: jest.fn(),
  }),
}));

describe('VsHome online friend challenge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides the challenge section when every friend is offline', async () => {
    mockGetVsFriendsPresence.mockResolvedValue([{
      friend_id: 'friend-1',
      friend_name: 'Brock',
      last_seen_at: '2026-08-28T10:00:00Z',
      is_online: false,
    }]);

    render(<VsHome />);

    await waitFor(() => expect(mockGetVsFriendsPresence).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: 'Challenge an online friend' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Challenge selected friend' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create invite link' })).toBeInTheDocument();
  });

  it('shows the challenge section when at least one friend is online', async () => {
    mockGetVsFriendsPresence.mockResolvedValue([{
      friend_id: 'friend-1',
      friend_name: 'Misty',
      last_seen_at: '2026-08-28T12:00:00Z',
      is_online: true,
    }]);

    render(<VsHome />);

    expect(await screen.findByRole('heading', { name: 'Challenge an online friend' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Misty Online/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Challenge selected friend' })).toBeInTheDocument();
  });
});
