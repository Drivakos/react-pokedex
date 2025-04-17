import React, { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, profile, signOut, updateProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username || '');
  const [loading, setLoading] = useState(false);
  const [fetchingFavorites, setFetchingFavorites] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const navigate = useNavigate();

  const fetchFavorites = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID available for fetching favorites');
      setFetchingFavorites(false);
      return;
    }

    try {
      setFetchingFavorites(true);
      console.log('Fetching favorites for user ID:', user.id);
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
        console.log('Favorites fetched successfully:', data.length);
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
      console.log('Profile component: calling fetchFavorites');
      fetchFavorites();
    } else if (!user?.id) {
      setFetchingFavorites(false);
    }
  }, [user?.id, fetchFavorites, loading]);

  const removeFavorite = async (pokemonId: number) => {
    if (!user?.id) {
      toast.error('You must be logged in to remove favorites');
      return;
    }

    try {
      // Optimistically update the UI
      setFavorites(prev => prev.filter(id => id !== pokemonId));
      
      // Delete from database
      const { error } = await supabase
        .from('favorites')
        .delete()
        .match({ user_id: user.id, pokemon_id: pokemonId });
      
      if (error) {
        console.error('Error removing favorite:', error);
        // Restore the favorite if there was an error
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
    
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      
      const { error: updateError } = await updateProfile({ username });
      
      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      if (avatar) {
        try {
          const fileExt = avatar.name.split('.').pop()?.toLowerCase();
          const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
          
          if (!fileExt || !validExtensions.includes(fileExt)) {
            throw new Error('Invalid file extension');
          }
          
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 10);
          const fileName = `${user?.id}-${timestamp}-${randomString}.${fileExt}`;
          const filePath = `avatars/${fileName}`;
          const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, avatar, {
              contentType,
              cacheControl: '3600',
              upsert: false
            });
            
          if (uploadError) {
            throw uploadError;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
            
          const { error: avatarUpdateError } = await updateProfile({ avatar_url: publicUrl });
          
          if (avatarUpdateError) {
            throw avatarUpdateError;
          }
        } catch (err: any) {
          throw new Error(`Avatar upload failed: ${err.message}`);
        }
      }
      
      setMessage('Profile updated successfully!');
    } catch (error: any) {
      console.error('Profile update failed:', error);
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
        return;
      }
      
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        setError('File is too large. Maximum size is 2MB.');
        return;
      }
      
      if (error) setError(null);
      
      setAvatar(file);
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
                      <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
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
                  
                  <div className="mb-6">
                    <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 mb-1">
                      Profile Picture
                    </label>
                    <input
                      type="file"
                      id="avatar"
                      accept="image/*"
                      onChange={handleAvatarChange}
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
                      className="w-20 h-20 flex items-center justify-center cursor-pointer"
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
