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
        
        if (errorParam) {
          setError(`Authentication failed: ${errorDescription || errorParam}`);
          toast.error(`Login failed: ${errorDescription || errorParam}`);
          setTimeout(() => navigate('/login', { replace: true }), 1500);
          return;
        }
        
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            setError('Authentication failed');
            toast.error(exchangeError.message || 'Failed to authenticate');
            setTimeout(() => navigate('/login', { replace: true }), 1500);
            return;
          }
          
          if (data?.session) {
            setIsProcessing(false);
            setTimeout(() => navigate('/profile', { replace: true }), 1000);
            return;
          }
        }
        
        setError('Authentication failed');
        toast.error('Authentication process failed');
        setTimeout(() => navigate('/login', { replace: true }), 1500);
      } catch (err) {
        setError('Authentication error');
        toast.error('An unexpected error occurred');
        setTimeout(() => navigate('/login', { replace: true }), 1500);
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
