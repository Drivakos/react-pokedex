import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Navigation from '../Navigation';

const mockUseAuth = jest.fn();

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../NotificationBell', () => ({
  NotificationBell: () => <button type="button" aria-label="Notifications" />,
}));

jest.mock('../friends', () => ({
  FriendsModal: () => null,
}));

describe('Navigation', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        email: 'misty@example.com',
        user_metadata: { full_name: 'Misty' },
      },
      signOut: jest.fn(),
    });
  });

  it('keeps game and account actions in both responsive layouts', () => {
    const { container } = render(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('button', { name: 'Games menu' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /Misty|Profile/ })).toHaveLength(2);

    const desktopActions = container.querySelector('.navigation-desktop-actions');
    const mobileActions = container.querySelector('.navigation-mobile-actions');

    expect(desktopActions).toBeInTheDocument();
    expect(desktopActions).not.toHaveClass('hidden', 'sm:flex');
    expect(mobileActions).toBeInTheDocument();
    expect(mobileActions).not.toHaveClass('sm:hidden');
  });
});
