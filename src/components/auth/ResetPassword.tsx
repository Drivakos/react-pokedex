import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    try {
      setError(null);
      setMessage(null);
      setLoading(true);
      
      const { error } = await resetPassword(email);
      
      if (error) {
        throw error;
      }
      
      setMessage('Password reset email sent! Check your inbox for further instructions.');
      setEmail('');
    } catch (error: any) {
      setError(error.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 px-6 py-8">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-400 rounded-full border-2 border-white shadow-md animate-pulse mr-2"></div>
            <div className="w-6 h-6 bg-red-400 rounded-full border-2 border-white shadow-md mr-2"></div>
            <div className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-white shadow-md"></div>
          </div>
          
          <h2 className="text-center text-3xl font-extrabold text-white">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-white">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        
        {/* Black divider */}
        <div className="h-3 bg-black w-full relative">
          <div className="absolute right-6 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white rounded-full border-4 border-black flex items-center justify-center">
            <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
          </div>
        </div>
        
        <div className="px-6 pt-6">
        
          {error && (
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{message}</p>
                </div>
              </div>
            </div>
          )}
        
          <form className="space-y-6" onSubmit={handleResetPassword}>
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border-2 border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                placeholder="trainer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 text-sm font-bold rounded-full text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 shadow-md transition-all duration-200 transform hover:scale-105"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="2" />
                  <path d="M2 12H22" stroke="white" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4" fill="white" />
                </svg>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
            
            <div className="flex justify-center mt-6">
              <Link to="/login" className="font-medium text-red-600 hover:text-red-500">
                Back to login
              </Link>
            </div>
          </form>
          
          <div className="flex justify-center mt-8 mb-6">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
