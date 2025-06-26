import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import authService from '../../services/auth.service';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refreshSession } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');
        const errorParam = queryParams.get('error');
        const errorDescription = queryParams.get('error_description');

        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        // Check for type parameter first to determine the flow type
        const type = searchParams.get('type');
        
        // Handle error cases first
        if (errorParam) {
          const errorMessage = `Authentication failed: ${errorDescription || errorParam}`;
          setError(errorMessage);
          toast.error(`Login failed: ${errorDescription || errorParam}`);
          navigate('/login', { replace: true });
          return;
        }

        // Handle password recovery FIRST - before any session checks
        if (type === 'recovery') {
          navigate('/reset-password/confirm', { replace: true });
          return;
        }

        // PKCE Flow - code parameter in query string
        if (code) {
          const { data, error: exchangeError } = await authService.exchangeCodeForSession(code);

          if (exchangeError) {
            setError('Authentication failed - could not exchange code');
            toast.error(exchangeError.message || 'Failed to authenticate');
            navigate('/login', { replace: true });
            return;
          }

          if (data?.session) {
            // Regular authentication flow
            await refreshSession();
            toast.success('Successfully signed in!');
            navigate('/', { replace: true });
            return;
          }
        }

        // Implicit Flow - access_token and refresh_token in hash
        if (accessToken && refreshToken) {
          try {
            const { data, error } = await authService.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (error) {
              throw error;
            }

            if (data.session) {
              // Regular authentication flow
              await refreshSession();
              toast.success('Successfully signed in!');
              navigate('/', { replace: true });
              return;
            }
          } catch (sessionError) {
            setError('Failed to set authentication session');
            toast.error('Authentication failed');
            navigate('/login', { replace: true });
            return;
          }
        }

        // Handle specific type-based flows (magiclink, signup)
        if (type === 'magiclink' || type === 'signup') {
          const session = await authService.getSession();

          if (session) {
            await refreshSession();

            const username = session.user?.user_metadata?.full_name ||
                            session.user?.user_metadata?.name ||
                            session.user?.email?.split('@')[0] ||
                            'User';

            toast.success(`Welcome, ${username}!`);
            navigate('/');
          } else {
            // No session found, redirect to login
            toast.error('Authentication session not found');
            navigate('/login', { replace: true });
          }
          return;
        }

        // If no specific handling matched, check for any valid session
        const session = await authService.getSession();
        if (session) {
          await refreshSession();
          toast.success('Successfully signed in!');
          navigate('/', { replace: true });
        } else {
          // No session found, redirect to login
          navigate('/login', { replace: true });
        }

      } catch (err) {
        setError('An unexpected error occurred');
        toast.error('Authentication failed. Please try again.');

        await authService.signOut();
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {loading ? (
          <>
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Completing authentication...</p>
          </>
        ) : error ? (
          <>
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-gray-600 mt-2">Redirecting to login page...</p>
          </>
        ) : (
          <>
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <p className="text-green-600 font-medium">Authentication successful!</p>
            <p className="text-gray-600 mt-2">Redirecting to your profile...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
