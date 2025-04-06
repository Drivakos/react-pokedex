import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  
  // Check for existing lockout in localStorage on component mount
  useEffect(() => {
    const storedLockout = localStorage.getItem('auth_lockout');
    if (storedLockout) {
      const lockoutData = JSON.parse(storedLockout);
      const now = Date.now();
      
      if (lockoutData.until > now) {
        setLockoutUntil(lockoutData.until);
        setLoginAttempts(lockoutData.attempts);
      } else {
        // Lockout expired, clear it
        localStorage.removeItem('auth_lockout');
      }
    }
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if account is locked out
    if (lockoutUntil && lockoutUntil > Date.now()) {
      const waitMinutes = Math.ceil((lockoutUntil - Date.now()) / 60000);
      setError(`Too many failed login attempts. Please try again in ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}`);
      return;
    }
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      setError(null);
      setLoading(true);
      
      const { error } = await signIn(email, password);
      
      if (error) {
        // Increment login attempts on failure
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        // Implement exponential backoff for lockouts
        if (newAttempts >= 5) {
          const lockoutDuration = Math.min(Math.pow(2, newAttempts - 5) * 60000, 30 * 60000); // Max 30 minutes
          const lockoutTime = Date.now() + lockoutDuration;
          setLockoutUntil(lockoutTime);
          
          // Store lockout in localStorage for persistence
          localStorage.setItem('auth_lockout', JSON.stringify({
            until: lockoutTime,
            attempts: newAttempts
          }));
          
          const waitMinutes = Math.ceil(lockoutDuration / 60000);
          setError(`Too many failed login attempts. Please try again in ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}`);
        } else {
          throw error;
        }
      } else {
        // Reset attempts on successful login
        setLoginAttempts(0);
        localStorage.removeItem('auth_lockout');
        navigate('/profile');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const { error } = await signInWithGoogle();
      
      if (error) {
        throw error;
      }
      
      // The redirect will happen automatically
    } catch (error: any) {
      setError(error.message || 'Failed to sign in with Google');
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
            Trainer Login
          </h2>
          <p className="mt-2 text-center text-sm text-white">
            New to Pokémon?{' '}
            <Link to="/signup" className="font-medium text-white hover:text-gray-200 underline">
              Register here
            </Link>
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
        
          <form className="space-y-6" onSubmit={handleEmailLogin}>
            <input type="hidden" name="remember" defaultValue="true" />
            <div className="space-y-4">
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
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border-2 border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link to="/magic-link" className="font-medium text-red-600 hover:text-red-500">
                  Use magic link
                </Link>
              </div>
              <div className="text-sm">
                <Link to="/reset-password" className="font-medium text-red-600 hover:text-red-500">
                  Forgot your password?
                </Link>
              </div>
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
                {loading ? 'Signing in...' : 'Login as Trainer'}
              </button>
            </div>
        </form>
        
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-700 font-medium">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium rounded-full text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 disabled:opacity-50 shadow-md transition-all duration-200 transform hover:scale-105"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" width="24" height="24">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                  </g>
                </svg>
                Login with Google
              </button>
            </div>
            
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
    </div>
  );
};

export default Login;
