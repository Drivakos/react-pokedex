import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { User, LogOut, Gamepad2, ChevronDown } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { FriendsModal } from './friends';

const Navigation: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [gamesMenuOpen, setGamesMenuOpen] = useState(false);
  const [friendsModalOpen, setFriendsModalOpen] = useState(false);
  const [friendsModalInitialTab, setFriendsModalInitialTab] = useState<'friends' | 'requests' | 'add'>('friends');


  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleOpenFriendsModal = (initialTab: 'friends' | 'requests' | 'add' = 'friends') => {
    setFriendsModalInitialTab(initialTab);
    setFriendsModalOpen(true);
  };

  const handleCloseFriendsModal = () => {
    setFriendsModalOpen(false);
  };

  React.useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Element;
      if (gamesMenuOpen && !target.closest('.games-menu')) {
        setGamesMenuOpen(false);
      }
    };

    const handleScroll = () => {
      if (gamesMenuOpen) {
        setGamesMenuOpen(false);
      }
    };

    // Handle both mouse and touch events for better mobile support
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    // Close dropdown on scroll for better UX
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [gamesMenuOpen]);

  return (
    <nav className="bg-gradient-to-r from-red-600 to-red-700 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-white font-bold text-xl flex items-center">
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"></circle>
                  <circle cx="12" cy="12" r="3" fill="white"></circle>
                  <line x1="2" y1="12" x2="8" y2="12" stroke="white" strokeWidth="2"></line>
                  <line x1="16" y1="12" x2="22" y2="12" stroke="white" strokeWidth="2"></line>
                </svg>
                Pokédex
              </Link>
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {/* Games Menu */}
            <div className="relative mr-4 games-menu">
              <button
                onClick={() => setGamesMenuOpen(!gamesMenuOpen)}
                className="text-white hover:bg-white/20 active:bg-white/30 px-3 py-2 rounded-full text-sm font-medium flex items-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Games menu"
                aria-expanded={gamesMenuOpen}
                aria-haspopup="true"
              >
                <Gamepad2 className="h-4 w-4 mr-1" />
                Games
                <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${gamesMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {gamesMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-[60]">
                  <Link
                    to="/memory-game"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    onClick={() => setGamesMenuOpen(false)}
                  >
                    Memory Match
                  </Link>
                  <Link
                    to="/pkmn-grid-challenge"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    onClick={() => setGamesMenuOpen(false)}
                  >
                    Pokemon Grid Challenge
                  </Link>
                  <div className="border-t border-gray-200 my-1"></div>
                  <span className="block px-4 py-2 text-xs text-gray-500 italic">
                    More games coming soon!
                  </span>
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center space-x-4">
                <NotificationBell onOpenFriendsModal={handleOpenFriendsModal} />
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
            {/* Mobile Games Menu */}
            <div className="relative mr-2 games-menu">
              <button
                onClick={() => setGamesMenuOpen(!gamesMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-full text-white hover:bg-white/20 active:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors duration-200 touch-manipulation select-none"
                title="Games"
                aria-label="Games menu"
                aria-expanded={gamesMenuOpen}
                aria-haspopup="true"
              >
                <Gamepad2 className="h-6 w-6" />
              </button>

              {gamesMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-[60]">
                  <Link
                    to="/memory-game"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    onClick={() => setGamesMenuOpen(false)}
                  >
                    Memory Match
                  </Link>
                  <Link
                    to="/pkmn-grid-challenge"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    onClick={() => setGamesMenuOpen(false)}
                  >
                    Pokemon Grid Challenge
                  </Link>
                  <div className="border-t border-gray-200 my-1"></div>
                  <span className="block px-4 py-2 text-xs text-gray-500 italic">
                    More games coming soon!
                  </span>
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center space-x-1">
                <NotificationBell onOpenFriendsModal={handleOpenFriendsModal} />
                <Link
                  to="/profile"
                  className="inline-flex items-center justify-center p-2 rounded-full text-white hover:bg-white/20 focus:outline-none transition-colors duration-200"
                  title="Profile"
                >
                  <User className="h-6 w-6" />
                </Link>
              </div>
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

      {/* Friends Modal */}
      <FriendsModal
        isOpen={friendsModalOpen}
        onClose={handleCloseFriendsModal}
        initialTab={friendsModalInitialTab}
      />
    </nav>
  );
};

export default Navigation;
