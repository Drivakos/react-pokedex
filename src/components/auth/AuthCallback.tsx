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
        const errorParam = queryParams.get('error');
        const errorDescription = queryParams.get('error_description');
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

        // With detectSessionInUrl: true, Supabase automatically handles:
        // - PKCE code exchange (when code parameter is present)
        // - Implicit flow tokens (when access_token/refresh_token in hash)
        // - Magic link/signup sessions

        // The auth state change listener in AuthProvider will handle the session setup
        // We just need to wait a moment for the automatic processing to complete

        setTimeout(async () => {
          const session = await authService.getSession();
          if (session) {
            await refreshSession();
            // Redirect to stored destination or home page
            const intendedPath = localStorage.getItem('auth_redirect') || '/';
            localStorage.removeItem('auth_redirect'); // Clean up
            navigate(intendedPath, { replace: true });
          } else {
            // No session found, redirect to login
            navigate('/login', { replace: true });
          }
        }, 1000); // Give Supabase time to process the callback

      } catch {
        setError('An unexpected error occurred');
        toast.error('Authentication failed. Please try again.');

        await authService.signOut();
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams, refreshSession]);

  // Show minimal loading state, then redirect immediately
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
