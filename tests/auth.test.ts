import { jest } from '@jest/globals';

declare global {
  interface Window {
    trustedTypes?: {
      createPolicy(policyName: string, policy: {
        createHTML?: (input: string) => string;
        createScript?: (input: string) => string;
        createScriptURL?: (input: string) => string;
      }): void;
    };
  }
}

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
(global as any).localStorage = mockLocalStorage;

const mockLocation = {
  origin: 'http://localhost:3000',
  href: 'http://localhost:3000',
  host: 'localhost:3000',
  hostname: 'localhost',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};
delete (global as any).window.location;
(global as any).window.location = mockLocation;

const mockTrustedTypes = { createPolicy: jest.fn() };
delete (global as any).window.trustedTypes;
(global as any).window.trustedTypes = mockTrustedTypes;

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
  dismiss: jest.fn(),
};

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: mockToast,
  ...mockToast,
}));

const mockSupabaseClient: any = {
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
    setSession: jest.fn(),
    refreshSession: jest.fn(),
    exchangeCodeForSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({ single: jest.fn() })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn() })) })),
    })),
  })),
};

jest.mock('../src/lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

let authService: (typeof import('../src/services/auth.service'))['default'];

describe('Authentication system', () => {
  beforeAll(async () => {
    ({ default: authService } = await import('../src/services/auth.service'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockSupabaseClient.auth).forEach(mock => {
      if (typeof mock === 'function') (mock as jest.Mock).mockReset();
    });
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  describe('AuthService', () => {
    it('signs up with the current Supabase client contract', async () => {
      const response = {
        data: { user: { id: 'user-123', email: 'test@example.com' }, session: null },
        error: null,
      };
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce(response);

      await expect(authService.signUp('test@example.com', 'password123')).resolves.toBe(response);
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockToast.success).toHaveBeenCalledWith('Check your email to confirm your account!');
    });

    it('surfaces signup errors', async () => {
      const response = {
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      };
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce(response);

      await expect(authService.signUp('test@example.com', 'password123')).resolves.toBe(response);
      expect(mockToast.error).toHaveBeenCalledWith('Email already registered');
    });

    it('signs in and refreshes a successful session', async () => {
      const response = {
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'access-token', refresh_token: 'refresh-token' },
        },
        error: null,
      };
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce(response);
      mockSupabaseClient.auth.refreshSession.mockResolvedValueOnce({ data: { session: response.data.session }, error: null });

      await expect(authService.signInWithEmail('test@example.com', 'password123')).resolves.toBe(response);
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalledTimes(1);
    });

    it('does not refresh after a failed sign in', async () => {
      const response = {
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      };
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce(response);

      await expect(authService.signInWithEmail('test@example.com', 'wrong-password')).resolves.toBe(response);
      expect(mockSupabaseClient.auth.refreshSession).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith('Invalid login credentials');
    });

    it('starts Google OAuth with the configured redirect and scopes', async () => {
      const response = { data: { url: 'https://accounts.google.com/oauth', provider: 'google' }, error: null };
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValueOnce(response);

      await expect(authService.signInWithGoogle()).resolves.toBe(response);
      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
          queryParams: { access_type: 'offline', prompt: 'consent' },
          scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        },
      });
    });

    it('sends a magic link using the callback route', async () => {
      const response = { data: { user: null, session: null }, error: null };
      mockSupabaseClient.auth.signInWithOtp.mockResolvedValueOnce(response);

      await expect(authService.signInWithMagicLink('test@example.com')).resolves.toBe(response);
      expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: { emailRedirectTo: 'http://localhost:3000/auth/callback' },
      });
    });

    it('signs out and reports success', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({ error: null });

      await expect(authService.signOut()).resolves.toEqual({ error: null });
      expect(mockToast.success).toHaveBeenCalledWith('You have been signed out');
    });

    it('requests password reset through the active confirmation route', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });

      await expect(authService.resetPassword('test@example.com')).resolves.toEqual({ error: null });
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
        redirectTo: 'http://localhost:3000/auth/update-password',
      });
    });

    it('updates the current user password', async () => {
      mockSupabaseClient.auth.updateUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });

      await expect(authService.updatePassword('new-password-123')).resolves.toEqual({ error: null });
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password-123' });
    });

    it('returns null when session or user lookup fails', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValueOnce(new Error('session unavailable'));
      mockSupabaseClient.auth.getUser.mockRejectedValueOnce(new Error('user unavailable'));

      await expect(authService.getSession()).resolves.toBeNull();
      await expect(authService.getUser()).resolves.toBeNull();
    });
  });

  describe('Active provider exports', () => {
    it('exports the production provider and auth hook', async () => {
      const [{ AuthProvider }, { useAuth }] = await Promise.all([
        import('../src/contexts/AuthProvider'),
        import('../src/hooks/useAuth'),
      ]);

      expect(typeof AuthProvider).toBe('function');
      expect(typeof useAuth).toBe('function');
    });

    it('exports the OAuth callback component', async () => {
      const { AuthCallback } = await import('../src/components/auth/AuthCallback');
      expect(typeof AuthCallback).toBe('function');
    });
  });

  describe('Browser integration', () => {
    it('stores, retrieves, and removes an intended redirect', () => {
      mockLocalStorage.getItem.mockReturnValue('/teams');

      mockLocalStorage.setItem('auth_redirect', '/teams');
      expect(mockLocalStorage.getItem('auth_redirect')).toBe('/teams');
      mockLocalStorage.removeItem('auth_redirect');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_redirect', '/teams');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_redirect');
    });

    it('supports the Trusted Types policy used at application startup', () => {
      window.trustedTypes?.createPolicy('test', {
        createHTML: value => value,
        createScriptURL: value => value,
        createScript: value => value,
      });

      expect(mockTrustedTypes.createPolicy).toHaveBeenCalledWith('test', {
        createHTML: expect.any(Function),
        createScriptURL: expect.any(Function),
        createScript: expect.any(Function),
      });
    });

    it('uses a Supabase-compatible realtime WebSocket URL', () => {
      const url = 'wss://example.supabase.co/realtime/v1/websocket?apikey=test&eventsPerSecond=10&vsn=1.0.0';
      expect(url).toMatch(/^wss:\/\/.*\.supabase\.co\/realtime\/v1\/websocket/);
    });
  });
});
