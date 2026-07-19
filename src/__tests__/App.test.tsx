// Mock Supabase before any imports
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
      signInWithOtp: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      setSession: jest.fn(),
      refreshSession: jest.fn()
    }
  }
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import App, { AppContent } from '../App';

// Mock all the components to avoid import issues
jest.mock('../components/PokedexHome', () => () => <div data-testid="pokedex-home-content">Pokedex Home</div>);
jest.mock('../components/auth/Login', () => () => <div data-testid="login-content">Login</div>);
jest.mock('../components/auth/SignUp', () => () => <div data-testid="signup-content">Sign Up</div>);
jest.mock('../components/auth/Profile', () => () => <div data-testid="profile-content">Profile</div>);
jest.mock('../components/auth/AuthCallback', () => () => <div data-testid="auth-callback">Auth Callback</div>);
jest.mock('../components/auth/ResetPassword', () => () => <div data-testid="reset-password">Reset Password</div>);
jest.mock('../components/auth/ResetPasswordConfirm', () => () => <div data-testid="reset-password-confirm">Reset Password Confirm</div>);
jest.mock('../components/auth/MagicLinkLogin', () => () => <div data-testid="magic-link-login">Magic Link Login</div>);
jest.mock('../components/auth/ProtectedRoute', () => ({ children }: { children: React.ReactNode }) => <div data-testid="protected-route">{children}</div>);
jest.mock('../components/Navigation', () => () => <div data-testid="navigation">Navigation</div>);
jest.mock('../components/teams/Teams', () => () => <div data-testid="teams-content">Teams</div>);
jest.mock('../components/teams/TeamEditor', () => () => <div data-testid="team-editor-content">Team Editor</div>);
jest.mock('../components/PokéGridChallenge', () => () => <div data-testid="pokegrid-challenge-content">PokeGrid</div>);

describe('App Routing', () => {
  it('renders home page by default', async () => {
    render(<App />);
    expect(await screen.findByTestId('pokedex-home')).toBeInTheDocument();
  });

  it('renders login page on /login route', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppContent />
      </MemoryRouter>
    );
    expect(await screen.findByTestId('login')).toBeInTheDocument();
  });

  it('renders signup page on /signup route', async () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <AppContent />
      </MemoryRouter>
    );
    expect(await screen.findByTestId('signup')).toBeInTheDocument();
  });

  it('renders profile page on /profile route', async () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppContent />
      </MemoryRouter>
    );
    expect(await screen.findByTestId('profile')).toBeInTheDocument();
  });

  it('renders teams page on /teams route', async () => {
    render(
      <MemoryRouter initialEntries={['/teams']}>
        <AppContent />
      </MemoryRouter>
    );
    expect(await screen.findByTestId('teams')).toBeInTheDocument();
  });

  it('renders team editor page on /team-editor/:teamId route', async () => {
    render(
      <MemoryRouter initialEntries={['/team-editor/123']}>
        <AppContent />
      </MemoryRouter>
    );
    expect(await screen.findByTestId('team-editor')).toBeInTheDocument();
  });
});
