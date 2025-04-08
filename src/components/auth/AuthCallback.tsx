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
        const errorParam = queryParams.get('error');
        const errorDescription = queryParams.get('error_description');
        
        if (errorParam) {
          console.error(`Auth provider returned error: ${errorParam}`, errorDescription);
          setError(`Authentication failed: ${errorDescription || errorParam}`);
          toast.error(`Login failed: ${errorDescription || errorParam}`);
          setTimeout(() => navigate('/login', { replace: true }), 1500);
          return;
        }
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error retrieving session during auth callback:', error);
          setError('Unable to authenticate');
          toast.error('Authentication failed: ' + error.message);
          setTimeout(() => navigate('/login?error=Unable to authenticate', { replace: true }), 1500);
          return;
        }
        
        if (data.session) {
          console.log('Auth callback successful, session found:', { 
            user_id: data.session.user.id,
            provider: data.session.user.app_metadata?.provider || 'unknown',
            expires_at: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'unknown'
          });
          
          setIsProcessing(false);
          
          try {
            await supabase.auth.refreshSession();
            console.log('Session refreshed successfully');
          } catch (refreshError) {
            console.warn('Session refresh warning (non-critical):', refreshError);
          }
          
          setTimeout(() => {
            navigate('/profile', { replace: true });
          }, 1000);
        } else {
          console.error('No session found during auth callback despite successful redirect');
          setError('Authentication failed');
          toast.error('No active session found');
          setTimeout(() => navigate('/login?error=Authentication failed', { replace: true }), 1500);
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
        setError('Authentication error');
        toast.error('An unexpected error occurred');
        setTimeout(() => navigate('/login?error=Authentication error', { replace: true }), 1500);
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
