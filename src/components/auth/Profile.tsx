import React, { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Team } from '../../lib/supabase';

const Profile: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [username, setUsername] = useState(profile?.username || '');
  const [loading, setLoading] = useState(false);
  const [fetchingFavorites, setFetchingFavorites] = useState(true);
  const [fetchingTeams, setFetchingTeams] = useState(true); // Added missing state
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const navigate = useNavigate();

  const fetchTeams = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID available, will fetch teams when ID is available');
      setTeams([]);
      setFetchingTeams(false);
      return;
    }

    try {
      console.log('Fetching teams for user ID:', user.id);
      setFetchingTeams(true);
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching teams:', error);
        setTeams([]);
        setFetchingTeams(false);
        return;
      }

      console.log('Teams fetched successfully:', data?.length || 0, 'teams found');
      setTeams(data || []);
      setFetchingTeams(false);
    } catch (err) {
      console.error('Exception fetching teams:', err);
      setTeams([]);
      setFetchingTeams(false);
    }
  }, [user?.id]);

  const fetchFavorites = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID available, will fetch favorites when ID is available');
      setFavorites([]);
      setFetchingFavorites(false);
      return;
    }
    
    console.log('Fetching favorites for user ID:', user.id);

    try {
      setFetchingFavorites(true);
      const { data, error } = await supabase
        .from('favorites')
        .select('pokemon_id')
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Supabase error fetching favorites:', error);
        setFetchingFavorites(false);
        return;
      }
      
      if (data) {
        setFavorites(data.map(item => item.pokemon_id));
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
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
      setFavorites([]);
      setTeams([]);
    }
  }, [user?.id, fetchFavorites, loading]);

  React.useEffect(() => {
    console.log('Profile component: User state changed, current user ID:', user?.id);
    
    // Only attempt to fetch data if we have a valid user ID
    if (user?.id) {
      console.log('Valid user ID detected, fetching profile data...');
      fetchFavorites();
      fetchTeams();
    } else {
      // Reset states if no user
      console.log('No valid user ID, resetting state');
      setFavorites([]);
      setTeams([]);
      setFetchingFavorites(false);
      setFetchingTeams(false);
    }
  }, [user?.id, fetchFavorites, fetchTeams]);
  
  React.useEffect(() => {
    if (!user?.id) return;
    
    console.log('Setting up real-time subscription for teams');
    const subscription = supabase
      .channel('public:teams')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'teams',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Team change detected:', payload);
        // Refresh teams when changes are detected
        fetchTeams();
      })
      .subscribe();
      
    return () => {
      console.log('Cleaning up team subscription');
      supabase.removeChannel(subscription);
    };
  }, [user?.id, fetchTeams]);

  const removeFavorite = async (pokemonId: number) => {
    if (!user?.id) {
      toast.error('You must be logged in to remove favorites');
      return;
    }

    try {
      setFavorites(prev => prev.filter(id => id !== pokemonId));
      
      const { error } = await supabase
        .from('favorites')
        .delete()
        .match({ user_id: user.id, pokemon_id: pokemonId });
      
      if (error) {
        console.error('Error removing favorite:', error);
        setFavorites(prev => [...prev, pokemonId]);
        toast.error('Failed to remove from favorites');
        return;
      }
      
      toast.success('Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Something went wrong');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    
    if (profile && profile.username === username) {
      setMessage('No changes to update');
      setLoading(false);
      return;
    }
    
    if (username && (!profile || profile.username !== username)) {
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user?.id)
          .maybeSingle();
        
        let updateResult;
        
        if (existingProfile) {
          updateResult = await supabase
            .from('profiles')
            .update({ username })
            .eq('id', user?.id);
        } else {
          updateResult = await supabase
            .from('profiles')
            .insert({ id: user?.id, username });
        }
        
        if (updateResult.error) {
          console.error('Profile update error:', updateResult.error);
          setError(`Profile update failed: ${updateResult.error.message || 'Unknown error'}`);
          setLoading(false);
          return;
        }
        
        setMessage('Profile updated successfully!');
      } catch (err: any) {
        console.error('Username update exception:', err);
        setError(`Username update exception: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    } else {
      setMessage('No changes to update');
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
                    <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
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
                <div className="col-span-full mb-2 pb-2 border-b border-gray-200">
                  <p className="text-gray-700 text-sm">These are your favorite Pokémon. Click on any card to view details or remove favorites with the X button.</p>
                </div>
                {favorites.map((pokemonId) => (
                  <div 
                    key={pokemonId}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col items-center relative"
                  >
                    {/* Remove favorite button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(pokemonId);
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                      aria-label="Remove from favorites"
                    >
                      <X size={14} />
                    </button>
                    
                    {/* Pokemon image (clickable to navigate) */}
                    <div 
                      className="w-20 h-20 flex items-center justify-center cursor-pointer relative"
                      onClick={() => navigate(`/pokemon/${pokemonId}`)}
                    >
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
            {fetchingTeams ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Loading your teams...</p>
              </div>
            ) : teams.length === 0 ? (
              <div>
                <p className="text-gray-600 mb-4">You haven't created any teams yet. Start building your perfect lineup!</p>
                <div className="flex justify-center">
                  <button
                    onClick={() => navigate('/teams')}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-md flex items-center justify-center w-full max-w-md"
                  >
                    Go to Team Builder
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {teams.map((team) => (
                    <div 
                      key={team.id} 
                      onClick={() => navigate(`/teams?teamId=${team.id}`)}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <h3 className="font-bold text-lg mb-2">{team.name}</h3>
                      <p className="text-gray-600 text-sm mb-3">{team.description || 'No description'}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Created: {team.created_at ? new Date(team.created_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => navigate('/teams')}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-md flex items-center justify-center w-full max-w-md"
                  >
                    Go to Team Builder
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
