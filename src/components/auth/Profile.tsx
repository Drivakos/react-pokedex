import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { TeamMember } from '../../lib/supabase';
import { friendsService, type Friend } from '../../services/friends.service';
import { FriendsModal } from '../friends';
import toast from 'react-hot-toast';
import { getPokemonImage } from '../../utils/helpers';

const Profile: React.FC = () => {
  const { user, profile, signOut, updateProfile, teams, favorites, getTeamMembers } = useAuth();
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [teamMembers, setTeamMembers] = useState<Record<number, TeamMember[]>>({});
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendCode, setFriendCode] = useState<string>('');
  const navigate = useNavigate();
  const favoritePokemonIds = user?.id ? (favorites ?? []).map(f => f.pokemon_id) : [];
  const userTeams = user?.id ? (teams ?? []) : [];

  const [formData, setFormData] = useState({ username: profile?.username || '' });

  useEffect(() => {
    if (profile && profile.username !== formData.username) {
      setFormData({ username: profile.username ?? '' });
    }
  }, [profile?.username]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (userTeams.length > 0) {
        const members: Record<number, TeamMember[]> = {};
        for (const team of userTeams.slice(0, 3)) {
          const teamMembersData = await getTeamMembers(team.id);
          members[team.id] = teamMembersData;
        }
        setTeamMembers(members);
      }
    };
    fetchTeamMembers();
  }, [userTeams, getTeamMembers]);

  // Load friends
  const loadFriends = async () => {
    if (user?.id) {
      setLoadingFriends(true);
      const friendsData = await friendsService.getFriends(user.id);
      setFriends(friendsData);
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, [user?.id]);

  // Load friend code
  useEffect(() => {
    const loadFriendCode = async () => {
      if (user?.id) {
        const code = await friendsService.getMyFriendCode();
        setFriendCode(code || friendsService.generateFriendCode(user.id));
      }
    };
    loadFriendCode();
  }, [user?.id]);

  const handleFriendsModalClose = () => {
    setShowFriendsModal(false);
    loadFriends();
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied!`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStatus({ type: null, message: '' });
      const { error } = await updateProfile({ username: formData.username });
      if (error) throw error;
      setStatus({ type: 'success', message: 'Profile updated!' });
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Profile</h2>
            <button onClick={handleSignOut} className="text-red-500 hover:text-red-700 text-sm font-medium">
              Sign Out
            </button>
          </div>

          {status.type && (
            <div className={`p-3 mb-4 rounded text-sm ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {status.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="text-center sm:text-left">
              <div className="w-20 h-20 mx-auto sm:mx-0 rounded-full overflow-hidden bg-gray-100">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" alt="Pokemon" className="w-14 h-14" />
                  </div>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-2">{user.email}</p>

              {/* Friend Code */}
              <button
                onClick={() => copyToClipboard(friendCode, 'Friend code')}
                className="mt-2 text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded font-mono"
                title="Click to copy"
              >
                Code: <span className="font-bold text-blue-600">{friendCode || '--------'}</span>
              </button>
            </div>

            {/* Form */}
            <div className="flex-1">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ username: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-medium"
                >
                  Save
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Favorites */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Favorites</h2>
          {favoritePokemonIds.length === 0 ? (
            <p className="text-gray-500 text-sm">No favorites yet. <button onClick={() => navigate('/')} className="text-blue-500 hover:underline">Browse Pokémon</button></p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {favoritePokemonIds.slice(0, 12).map((pokemonId) => (
                <button
                  key={pokemonId}
                  onClick={() => navigate(`/pokemon/${pokemonId}`)}
                  className="w-12 h-12 bg-gray-50 rounded border hover:bg-gray-100"
                >
                  <img
                    src={getPokemonImage(pokemonId)}
                    alt={`#${pokemonId}`}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
              {favoritePokemonIds.length > 12 && (
                <span className="text-sm text-gray-500 self-center ml-2">+{favoritePokemonIds.length - 12} more</span>
              )}
            </div>
          )}
        </div>

        {/* Friends */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Friends {friends.length > 0 && <span className="text-sm font-normal text-gray-500">({friends.length})</span>}
            </h2>
            <button
              onClick={() => setShowFriendsModal(true)}
              className="text-blue-500 hover:text-blue-600 text-sm font-medium"
            >
              Manage
            </button>
          </div>

          {loadingFriends ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : friends.length === 0 ? (
            <p className="text-gray-500 text-sm">No friends yet. <button onClick={() => setShowFriendsModal(true)} className="text-blue-500 hover:underline">Add friends</button></p>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => {
                const code = friendsService.generateFriendCode(friend.friend_id);
                return (
                  <div key={friend.friend_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                        {friend.friend_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{friend.friend_name}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(`${friend.friend_name} #${code}`, friend.friend_name)}
                      className="text-xs text-gray-500 hover:text-gray-700 font-mono"
                    >
                      #{code}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Teams */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Teams</h2>
            <button onClick={() => navigate('/teams')} className="text-blue-500 hover:text-blue-600 text-sm font-medium">
              Manage
            </button>
          </div>

          {userTeams.length === 0 ? (
            <p className="text-gray-500 text-sm">No teams yet. <button onClick={() => navigate('/teams')} className="text-blue-500 hover:underline">Create one</button></p>
          ) : (
            <div className="space-y-3">
              {userTeams.slice(0, 3).map((team: { id: number; name: string; description?: string }) => (
                <button
                  key={team.id}
                  onClick={() => navigate(`/team-editor/${team.id}`)}
                  className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">{team.name}</span>
                    <span className="text-gray-400 text-sm">→</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map((position) => {
                      const member = teamMembers[team.id]?.find(m => m.position === position);
                      return (
                        <div key={position} className="w-8 h-8 bg-gray-100 rounded border flex items-center justify-center">
                          {member ? (
                            <img
                              src={getPokemonImage(member.pokemon_id)}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-xs text-gray-300">{position}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </button>
              ))}
              {userTeams.length > 3 && (
                <button onClick={() => navigate('/teams')} className="text-sm text-blue-500 hover:underline">
                  View all {userTeams.length} teams
                </button>
              )}
            </div>
          )}
        </div>

        {/* Friends Modal */}
        <FriendsModal isOpen={showFriendsModal} onClose={handleFriendsModalClose} />
      </div>
    </div>
  );
};

export default Profile;
