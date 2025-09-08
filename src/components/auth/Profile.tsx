import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user, profile, signOut, updateProfile, teams, favorites } = useAuth();
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // No loading states needed - data is already available from useAuth
  const navigate = useNavigate();

  // Simple data access - no complex memoization needed
  const favoritePokemonIds = user?.id ? (favorites ?? []).map(f => f.pokemon_id) : [];
  const userTeams = user?.id ? (teams ?? []) : [];

  // Controlled form with local state for editing (React best practice)
  const [formData, setFormData] = useState({ username: profile?.username || '' });

  // Update local state when profile changes
  useEffect(() => {
      if (profile && profile.username !== formData.username) {
        setFormData({ username: profile.username ?? '' });
      }
    }, [profile?.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setStatus({ type: null, message: '' });

      const { error } = await updateProfile({ username: formData.username });
      if (error) throw error;

      setStatus({ type: 'success', message: 'Profile updated successfully!' });
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Failed to update profile' });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Failed to sign out' });
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

  // Status notification component
  const StatusMessage = () => {
    if (!status.type) return null;

    const isError = status.type === 'error';
    return (
      <div className={`p-4 mb-6 rounded-md ${isError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <p className={`text-sm ${isError ? 'text-red-700' : 'text-green-700'}`}>
          {status.message}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
            <button onClick={handleSignOut} className="text-red-500 hover:text-red-700 font-medium">
              Sign Out
            </button>
          </div>

          <StatusMessage />

          <div className="grid md:grid-cols-3 gap-8">
            {/* Avatar Section */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-50">
                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" alt="Pokemon" className="w-20 h-20" />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-semibold">{profile?.username || 'Trainer'}</h3>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>

            {/* Profile Form */}
            <div className="md:col-span-2">
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ username: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={false}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-md font-medium disabled:opacity-50"
                >
                  Update Profile
                </button>
              </form>
            </div>
          </div>
        </div>
        
        {/* Favorites Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Favorite Pokémon</h2>

          {favoritePokemonIds.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No favorites yet</p>
              <button onClick={() => navigate('/')} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                Browse Pokémon
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {favoritePokemonIds.map((pokemonId) => (
                <div
                  key={pokemonId}
                  onClick={() => navigate(`/pokemon/${pokemonId}`)}
                  className="bg-gray-50 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`}
                    alt={`Pokemon ${pokemonId}`}
                    className="w-16 h-16 mx-auto mb-2"
                  />
                  <p className="text-sm font-medium">#{pokemonId}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Teams Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Pokémon Teams</h2>
            <button onClick={() => navigate('/teams')} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
              Manage Teams
            </button>
          </div>

          {userTeams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You haven't created any teams yet.</p>
              <button onClick={() => navigate('/teams')} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                Create Your First Team
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {userTeams.slice(0, 3).map((team: { id: number; name: string; description?: string; created_at: string }) => (
                <div key={team.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{team.name}</h3>
                      {team.description && (
                        <p className="text-sm text-gray-600 mt-1">{team.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/team-editor/${team.id}`)}
                      className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                    >
                      View Team →
                    </button>
                  </div>

                  {/* Team preview - show Pokemon in team */}
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6].map((position) => {
                      return (
                        <div
                          key={position}
                          className="w-10 h-10 bg-gray-100 rounded border-2 border-gray-200 flex items-center justify-center overflow-hidden"
                          title={`Position ${position}: Empty`}
                        >
                          <span className="text-xs text-gray-400">{position}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                    <span>Team Preview</span>
                    <span>Created {new Date(team.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}

              {userTeams.length > 3 && (
                <div className="text-center pt-4 border-t border-gray-200">
                  <button
                    onClick={() => navigate('/teams')}
                    className="text-blue-500 hover:text-blue-600 font-medium"
                  >
                    View all {userTeams.length} teams →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
