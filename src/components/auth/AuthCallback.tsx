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
        // Get the current session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error during auth callback:', error);
          setError('Unable to authenticate');
          toast.error('Authentication failed: ' + error.message);
          setTimeout(() => navigate('/login?error=Unable to authenticate'), 1500);
          return;
        }
        
        // Check if we have a valid session
        if (data.session) {
          console.log('Auth callback successful, redirecting to profile');
          setIsProcessing(false);
          
          // Force refresh auth state and redirect
          await supabase.auth.refreshSession();
          
          // Add a delay to ensure state is updated before redirect
          setTimeout(() => {
            navigate('/profile', { replace: true });
          }, 1000);
        } else {
          console.error('No session found during auth callback');
          setError('Authentication failed');
          toast.error('No active session found');
          setTimeout(() => navigate('/login?error=Authentication failed'), 1500);
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
        setError('Authentication error');
        toast.error('An unexpected error occurred');
        setTimeout(() => navigate('/login?error=Authentication error'), 1500);
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
