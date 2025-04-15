import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const type = searchParams.get('type');
    const handleAuthCallback = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');
        const errorParam = queryParams.get('error');
        const errorDescription = queryParams.get('error_description');

        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (errorParam) {
          const errorMessage = `Authentication failed: ${errorDescription || errorParam}`;
          console.error(errorMessage);
          setError(errorMessage);
          toast.error(`Login failed: ${errorDescription || errorParam}`);
          navigate('/login', { replace: true });
          return;
        }

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            setError('Authentication failed - could not exchange code');
            toast.error(exchangeError.message || 'Failed to authenticate');
            navigate('/login', { replace: true });
            return;
          }

          if (data?.session) {
            console.log('Successfully authenticated with code');
            localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
            toast.success('Successfully signed in!');
            navigate('/', { replace: true });
            return;
          }
        }

        if (accessToken && refreshToken) {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (error) {
              console.error('Error setting session:', error);
              throw error;
            }

            if (data.session) {
              console.log('Successfully set session from hash params');
              localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
              toast.success('Successfully signed in!');
              navigate('/', { replace: true });
              return;
            }
          } catch (sessionError) {
            console.error('Session setting error:', sessionError);
            setError('Failed to set authentication session');
            toast.error('Authentication failed');
            navigate('/login', { replace: true });
            return;
          }
        }

        if (type === 'recovery' || type === 'magiclink' || type === 'signup') {
          console.log(`Processing ${type} authentication`);

          if (type === 'recovery') {
            navigate('/reset-password/confirm');
            return;
          }

          const { data } = await supabase.auth.getSession();

          if (data.session) {
            console.log('Session exists, setting in context:', data.session.user?.email);
            
            localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));

            const username = data.session.user?.user_metadata?.full_name ||
                             data.session.user?.user_metadata?.name ||
                             data.session.user?.email?.split('@')[0] ||
                             'User';

            toast.success(`Welcome, ${username}!`);
            navigate('/');
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('An unexpected error occurred');
        toast.error('Authentication failed. Please try again.');

        await supabase.auth.signOut();
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

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
