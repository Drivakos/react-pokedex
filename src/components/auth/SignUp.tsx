import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      return 'Please fill in all fields';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setStatus({ type: 'error', message: validationError });
      return;
    }

    try {
      setLoading(true);
      setStatus({ type: null, message: '' });

      const { data, error } = await signUp(formData.email, formData.password);

      if (error) {
        let message = 'Failed to create account';
        if (error.message.includes('already registered')) {
          message = 'This email is already registered. Please sign in instead.';
        } else if (error.message.includes('valid email')) {
          message = 'Please enter a valid email address.';
        }
        setStatus({ type: 'error', message });
        return;
      }

      if (data?.user) {
        const message = data.user.identities?.length === 0
          ? 'This email is already registered but not confirmed. Please check your email for the confirmation link.'
          : 'Registration successful! Please check your email for verification.';

        setStatus({ type: 'success', message });
        setFormData({ email: '', password: '', confirmPassword: '' });
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Failed to create account' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      setStatus({ type: null, message: '' });

      const { error } = await signInWithGoogle();
      if (error) throw error;

      // Redirect happens automatically
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Google signup failed' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
          <p className="text-gray-600 mt-2">
            Already have an account? <Link to="/login" className="text-blue-500 hover:text-blue-600">Sign in</Link>
          </p>
        </div>
        {status.type && (
          <div className={`p-4 mb-6 rounded-md ${status.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className={`text-sm ${status.type === 'error' ? 'text-red-700' : 'text-green-700'}`}>
              {status.message}
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your password"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm your password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-md font-medium disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full mt-4 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-md font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
