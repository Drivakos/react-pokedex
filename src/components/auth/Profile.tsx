import React, { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const Profile: React.FC = () => {
  const { user, profile, signOut, updateProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username || '');
  const [loading, setLoading] = useState(false);
  const [fetchingFavorites, setFetchingFavorites] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const navigate = useNavigate();

  const fetchFavorites = useCallback(async () => {
    if (!user?.id) {
      setFetchingFavorites(false);
      return;
    }

    try {
      setFetchingFavorites(true);
      const { data, error } = await supabase
        .from('favorites')
        .select('pokemon_id')
        .eq('user_id', user.id);
        
      if (error) {
        setError(error.message || 'Failed to fetch favorites');
        setFetchingFavorites(false);
        return;
      }
      
      if (data) {
        setFavorites(data.map(item => item.pokemon_id));
      }
    } catch (error) {
      setError(error.message || 'Failed to fetch favorites');
    } finally {
      setFetchingFavorites(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    if (profile?.username) {
      setUsername(profile.username);
    }
  }, [profile]);
  
  React.useEffect(() => {
    if (user?.id && !loading) {
      fetchFavorites();
    } else if (!user?.id) {
      setFetchingFavorites(false);
    }
  }, [user?.id, fetchFavorites, loading]);



  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      
      const { error: updateError } = await updateProfile({ username });
      
      if (updateError) {
        throw updateError;
      }

      setMessage('Profile updated successfully!');
    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error: any) {
      setError(error.message || 'Failed to sign out');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">You are not logged in</h2>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
              <button
                onClick={handleSignOut}
                className="text-red-500 hover:text-red-700 font-medium"
              >
                Sign Out
              </button>
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
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
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1">
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 mb-4">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.username || 'User avatar'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50">
                        <img 
                          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/65.png"
                          alt="Pokemon Trainer Avatar"
                          className="w-24 h-24 object-contain"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <p className="text-xl font-semibold text-gray-900">{profile?.username || 'User'}</p>
                    <p className="text-gray-500">{user.email}</p>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <form onSubmit={handleUpdateProfile}>
                  <div className="mb-6">
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loading ? 'Updating...' : 'Update Profile'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Favorite Pokémon</h2>
            </div>
            
            {fetchingFavorites ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Loading your favorites...</p>
              </div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You haven't added any Pokémon to your favorites yet.</p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md"
                >
                  Browse Pokémon
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {favorites.map((pokemonId) => (
                  <div 
                    key={pokemonId}
                    onClick={() => navigate(`/pokemon/${pokemonId}`)}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col items-center cursor-pointer"
                  >
                    <div className="w-20 h-20 flex items-center justify-center">
                      <img 
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`}
                        alt={`Pokémon #${pokemonId}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-sm font-medium text-gray-900">#{pokemonId}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-8 bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Pokémon Teams</h2>
              <button
                onClick={() => navigate('/teams')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md flex items-center"
              >
                Manage Teams
              </button>
            </div>
            <p className="text-gray-600 mb-4">Create and manage your Pokémon teams to build the perfect lineup.</p>
            <div className="flex justify-center">
              <button
                onClick={() => navigate('/teams')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-md flex items-center justify-center w-full max-w-md"
              >
                Go to Team Builder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
