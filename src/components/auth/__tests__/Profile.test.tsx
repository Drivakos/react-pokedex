import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, useLocation } from 'react-router-dom';

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'ash@example.com' },
    profile: { username: 'Ash' },
    signOut: jest.fn(),
    updateProfile: jest.fn(),
    teams: [],
    favorites: [],
  }),
}));

jest.mock('../../../services/friends.service', () => ({
  friendsService: {
    getFriends: jest.fn().mockResolvedValue([]),
    getMyFriendCode: jest.fn().mockResolvedValue('ABC12345'),
    generateFriendCode: jest.fn().mockReturnValue('ABC12345'),
  },
}));

jest.mock('../../friends', () => ({
  FriendsModal: () => null,
}));

jest.mock('../profile/ProfileCard', () => ({
  ProfileCard: () => <div>Profile settings panel</div>,
}));

jest.mock('../profile/ProfileFavorites', () => ({
  ProfileFavorites: () => <div>Favorites panel</div>,
}));

jest.mock('../profile/ProfileFriends', () => ({
  ProfileFriends: () => <div>Friends panel</div>,
}));

jest.mock('../profile/ProfileTeams', () => ({
  ProfileTeams: () => <div>Teams panel</div>,
}));

jest.mock('../../vs/VsMatchHistory', () => ({
  VsMatchHistory: ({ embedded }: { embedded?: boolean }) => <div>Match history panel {embedded ? 'embedded' : ''}</div>,
}));

import Profile from '../Profile';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}{location.search}</span>;
}

function renderProfile(path = '/profile') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Profile />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('Profile tabs', () => {
  it('shows a tidy tab list with profile selected by default', async () => {
    renderProfile();

    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Collection' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Friends' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Match History' })).toBeInTheDocument();
    expect(screen.getByText('Profile settings panel')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('0 friends')).toBeInTheDocument());
  });

  it('switches panels and stores the active tab in the URL', () => {
    renderProfile();

    fireEvent.click(screen.getByRole('tab', { name: 'Collection' }));
    expect(screen.getByText('Favorites panel')).toBeInTheDocument();
    expect(screen.getByText('Teams panel')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/profile?tab=collection');

    fireEvent.click(screen.getByRole('tab', { name: 'Friends' }));
    expect(screen.getByText('Friends panel')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/profile?tab=friends');
  });

  it('opens match history directly from a profile URL', () => {
    renderProfile('/profile?tab=history');

    expect(screen.getByRole('tab', { name: 'Match History' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Match history panel embedded')).toBeInTheDocument();
  });
});
