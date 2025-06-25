import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const ResetPasswordConfirm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validResetLink, setValidResetLink] = useState(false);
  const { updatePassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkResetToken = async () => {
      try {
        // Check both query params and hash params for recovery type
        const searchParams = new URLSearchParams(location.search);
        const hashParams = new URLSearchParams(location.hash.substring(1));
        
        const queryType = searchParams.get('type');
        const hashType = hashParams.get('type');
        const type = queryType || hashType;
        
        // Check if we have a valid session (meaning user came from auth callback or direct email link)
        const { data: { session } } = await supabase.auth.getSession();
        
        // Handle different scenarios for password reset access
        if (type === 'recovery' && session) {
          setValidResetLink(true);
        } else if (type === 'recovery' && !session) {
          setError('Password reset session has expired. Please request a new reset link.');
        } else if (location.pathname === '/auth/update-password' && session) {
          // Direct access from Supabase email link
          setValidResetLink(true);
        } else if (location.pathname === '/auth/update-password' && !session) {
          setError('Password reset session has expired. Please request a new reset link.');
        } else if (type === 'signup' || type === 'magiclink') {
          navigate('/', { replace: true });
        } else if (user && session) {
          // User is already logged in and has a valid session
          setValidResetLink(true);
        } else {
          setError('Password reset link is invalid or has expired. Please request a new one.');
        }
      } catch (err) {
        setError('Error processing reset password link. Please request a new one.');
      }
    };
    
    checkResetToken();
  }, [location.search, location.hash, location.pathname, user, navigate]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/.test(password);
    
    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return;
    }
    
    if (!hasSpecialChar) {
      setError('Password must contain at least one special character');
      return;
    }
    
    try {
      setError(null);
      setMessage(null);
      setLoading(true);
      
      const { error } = await updatePassword(password);
      
      if (error) {
        setError(error.message || 'Failed to update password');
        return;
      }
      
      setMessage('Password updated successfully! Redirecting to login...');
      toast.success('Password has been reset successfully!');
      
      navigate('/login', { replace: true });
    } catch (error: any) {
      setError(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {message && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{message}</p>
              </div>
            </div>
          </div>
        )}
        
        {validResetLink ? (
          <form className="mt-8 space-y-6" onSubmit={handlePasswordUpdate}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="password" className="sr-only">New password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="sr-only">Confirm new password</label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/reset-password')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Request a new reset link
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordConfirm;
