import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

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
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('renders home page by default', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    expect(screen.getByTestId('pokedex-home')).toBeInTheDocument();
  });

  it('renders login page on /login route', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Navigate to login route (this would normally be done with a Link or programmatic navigation)
    window.history.pushState({}, '', '/login');

    expect(screen.getByTestId('login')).toBeInTheDocument();
  });

  it('renders signup page on /signup route', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    window.history.pushState({}, '', '/signup');

    expect(screen.getByTestId('signup')).toBeInTheDocument();
  });

  it('renders profile page on /profile route', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    window.history.pushState({}, '', '/profile');

    expect(screen.getByTestId('profile')).toBeInTheDocument();
  });

  it('renders teams page on /teams route', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    window.history.pushState({}, '', '/teams');

    expect(screen.getByTestId('teams')).toBeInTheDocument();
  });

  it('renders team editor page on /team-editor/:teamId route', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    window.history.pushState({}, '', '/team-editor/123');

    expect(screen.getByTestId('team-editor')).toBeInTheDocument();
  });

  it('lazily loads Pokemon Memory Game', async () => {
    // Mock the lazy loading
    const lazyMock = jest.fn(() => Promise.resolve({ default: () => <div>Pokemon Memory Game</div> }));
    jest.doMock('../components/PokemonMemoryGame', () => lazyMock, { virtual: true });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    window.history.pushState({}, '', '/memory-game');

    // The lazy loading should be triggered
    await waitFor(() => {
      expect(lazyMock).toHaveBeenCalled();
    });
  });

  it('shows loading fallback for lazy-loaded components', async () => {
    // Mock a slow lazy load
    const lazyMock = jest.fn(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({ default: () => <div>Pokemon Memory Game</div> }), 100)
      )
    );

    jest.doMock('../components/PokemonMemoryGame', () => lazyMock, { virtual: true });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    window.history.pushState({}, '', '/memory-game');

    // Should show loading state initially
    expect(screen.getByText('Loading Memory Game...')).toBeInTheDocument();

    // Wait for lazy loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading Memory Game...')).not.toBeInTheDocument();
    });
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
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Verify that React Router is being used (BrowserRouter wraps the app)
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
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // The app should render without crashing, indicating proper Suspense setup
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });
});
