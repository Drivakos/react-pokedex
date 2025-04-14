import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const type = hashParams.get('type');
        
        console.log('Auth callback received:', { 
          code: code ? 'present' : 'absent',
          type,
          accessToken: accessToken ? 'present' : 'absent',
          error: errorParam
        });
        
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
            console.log('Successfully authenticated with session');
            setIsProcessing(false);
            toast.success('Successfully signed in!');
            navigate('/', { replace: true });
            return;
          }
        }
        
        if (type === 'recovery' || type === 'magiclink' || type === 'signup') {
          console.log(`Processing ${type} authentication`);
          setIsProcessing(false);
          
          if (type === 'recovery') {
            return;
          } else {
            toast.success('Successfully signed in!');
            navigate('/', { replace: true });
            return;
          }
        }
        
        console.error('Authentication process failed - no valid auth method detected');
        setError('Authentication failed - no valid method detected');
        toast.error('Authentication process failed');
        navigate('/login', { replace: true });
      } catch (err) {
        console.error('Authentication callback error:', err);
        setError('Authentication error');
        toast.error('An unexpected error occurred during authentication');
        navigate('/login', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {isProcessing ? (
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
