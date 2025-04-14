import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { User, LogOut } from 'lucide-react';

const Navigation: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-red-600 to-red-700 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-white font-bold text-xl flex items-center">
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3" fill="white" />
                  <line x1="2" y1="12" x2="8" y2="12" stroke="white" strokeWidth="2" />
                  <line x1="16" y1="12" x2="22" y2="12" stroke="white" strokeWidth="2" />
                </svg>
                Pokédex
              </Link>
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/profile" 
                  className="text-white hover:bg-white/20 px-3 py-2 rounded-full text-sm font-medium flex items-center transition-colors duration-200"
                >
                  <User className="h-4 w-4 mr-1" />
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Profile'}
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="text-white hover:bg-white/20 px-3 py-2 rounded-full text-sm font-medium flex items-center transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center">
                <Link 
                  to="/login" 
                  className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-red-700 focus:outline-none"
                  title="Sign In"
                >
                  <User className="h-6 w-6" />
                </Link>
              </div>
            )}
          </div>
          
          <div className="flex items-center sm:hidden">
            {user ? (
              <Link 
                to="/profile" 
                className="inline-flex items-center justify-center p-2 rounded-full text-white hover:bg-white/20 focus:outline-none transition-colors duration-200"
                title="Profile"
              >
                <User className="h-6 w-6" />
              </Link>
            ) : (
              <Link 
                to="/login" 
                className="inline-flex items-center justify-center p-2 rounded-full text-white hover:bg-white/20 focus:outline-none transition-colors duration-200"
                title="Sign In"
              >
                <User className="h-6 w-6" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
