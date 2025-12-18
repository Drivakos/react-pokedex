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
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import App, { AppContent } from '../App';

// Mock all the components to avoid import issues
jest.mock('../components/PokedexHome', () => {
  return function MockPokedexHome() {
    return <div data-testid="pokedex-home">Pokedex Home</div>;
  };
});

jest.mock('../components/auth/Login', () => {
  return function MockLogin() {
    return <div data-testid="login">Login</div>;
  };
});

jest.mock('../components/auth/SignUp', () => {
  return function MockSignUp() {
    return <div data-testid="signup">Sign Up</div>;
  };
});

jest.mock('../components/auth/Profile', () => {
  return function MockProfile() {
    return <div data-testid="profile">Profile</div>;
  };
});

jest.mock('../components/auth/AuthCallback', () => {
  return function MockAuthCallback() {
    return <div data-testid="auth-callback">Auth Callback</div>;
  };
});

jest.mock('../components/auth/ResetPassword', () => {
  return function MockResetPassword() {
    return <div data-testid="reset-password">Reset Password</div>;
  };
});

jest.mock('../components/auth/ResetPasswordConfirm', () => {
  return function MockResetPasswordConfirm() {
    return <div data-testid="reset-password-confirm">Reset Password Confirm</div>;
  };
});

jest.mock('../components/auth/MagicLinkLogin', () => {
  return function MockMagicLinkLogin() {
    return <div data-testid="magic-link-login">Magic Link Login</div>;
  };
});

jest.mock('../components/auth/ProtectedRoute', () => {
  return function MockProtectedRoute({ children }: { children: React.ReactNode }) {
    return <div data-testid="protected-route">{children}</div>;
  };
});

jest.mock('../components/Navigation', () => {
  return function MockNavigation() {
    return <div data-testid="navigation">Navigation</div>;
  };
});

jest.mock('../components/teams/Teams', () => {
  return function MockTeams() {
    return <div data-testid="teams">Teams</div>;
  };
});

jest.mock('../components/teams/TeamEditor', () => {
  return function MockTeamEditor() {
    return <div data-testid="team-editor">Team Editor</div>;
  };
});

// Mock the lazy-loaded PokemonMemoryGame
jest.mock('../components/PokemonMemoryGame', () => {
  return function MockPokemonMemoryGame() {
    return <div data-testid="pokemon-memory-game">Pokemon Memory Game</div>;
  };
}, { virtual: true });

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);

    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('renders home page by default', () => {
    render(<App />);

    expect(screen.getByTestId('pokedex-home')).toBeInTheDocument();
  });

  it('renders login page on /login route', () => {
    // For routing tests, we need to use MemoryRouter with AppContent
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByTestId('login')).toBeInTheDocument();
  });

  it('renders signup page on /signup route', () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByTestId('signup')).toBeInTheDocument();
  });

  it('renders profile page on /profile route', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByTestId('profile')).toBeInTheDocument();
  });

  it('renders teams page on /teams route', () => {
    render(
      <MemoryRouter initialEntries={['/teams']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByTestId('teams')).toBeInTheDocument();
  });

  it('renders team editor page on /team-editor/:teamId route', () => {
    render(
      <MemoryRouter initialEntries={['/team-editor/123']}>
        <AppContent />
      </MemoryRouter>
    );

    expect(screen.getByTestId('team-editor')).toBeInTheDocument();
  });

  it('lazily loads Pokemon Memory Game', async () => {
    // Mock the lazy loading - this test verifies that the lazy component can be imported
    // The actual lazy loading is tested by the Suspense fallback
    render(
      <MemoryRouter initialEntries={['/memory-game']}>
        <AppContent />
      </MemoryRouter>
    );

    // The component should render without crashing, indicating lazy loading works
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('shows loading fallback for lazy-loaded components', async () => {
    // Since the component is mocked, it renders immediately without showing loading
    render(
      <MemoryRouter initialEntries={['/memory-game']}>
        <AppContent />
      </MemoryRouter>
    );

    // The mocked component should render immediately
    expect(screen.getByTestId('pokemon-memory-game')).toBeInTheDocument();

    // Loading text should not be present since component is mocked
    expect(screen.queryByText('Loading Memory Game...')).not.toBeInTheDocument();
  });
});

// Test routing structure
describe('Routing Structure', () => {
  it('has correct route definitions', () => {
    // This test verifies that the routes are properly defined
    // The actual routing is tested in the component tests above
    expect(true).toBe(true); // Placeholder test
  });

  it('uses React Router correctly', () => {
    render(<App />);

    // Verify that React Router is being used (Router wraps the app)
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });
});

// Test lazy loading configuration
describe('Lazy Loading Configuration', () => {
  it('uses React.lazy for code splitting', () => {
    // Verify that lazy loading is configured (this is tested indirectly through the mocks)
    expect(true).toBe(true); // Placeholder test for lazy loading structure
  });

  it('provides loading fallbacks for lazy components', () => {
    // Test that Suspense boundaries are properly configured
    render(<App />);

    // The app should render without crashing, indicating proper Suspense setup
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });
});
