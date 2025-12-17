import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { TeamMember, supabase } from '../../lib/supabase';
import { friendsService, type FriendWithDetails } from '../../services/friends.service';
import { FriendsModal } from '../friends';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, profile, signOut, updateProfile, teams, favorites, getTeamMembers } = useAuth();
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [teamMembers, setTeamMembers] = useState<Record<number, TeamMember[]>>({});
  const [friendsWithDetails, setFriendsWithDetails] = useState<FriendWithDetails[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendCode, setFriendCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFriendCodes, setCopiedFriendCodes] = useState<Set<string>>(new Set());
  const [friendProfiles, setFriendProfiles] = useState<Record<string, { avatar_url?: string }>>({});
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

  // Fetch friend profiles
  const fetchFriendProfiles = async (friends: FriendWithDetails[]) => {
    const profiles: Record<string, { avatar_url?: string }> = {};

    for (const friend of friends) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', friend.friend_id)
          .single();

        if (data) {
          profiles[friend.friend_id] = data;
        }
      } catch (error) {
        console.error(`Error fetching profile for ${friend.friend_name}:`, error);
      }
    }

    setFriendProfiles(profiles);
  };

  // Load friends with details
  const loadFriends = async () => {
    if (user?.id) {
      setLoadingFriends(true);
      const friends = await friendsService.getFriendsWithDetails(user.id);
      setFriendsWithDetails(friends);
      await fetchFriendProfiles(friends);
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
        if (code) {
          setFriendCode(code);
        } else {
          // Fallback to generating from UUID
          setFriendCode(friendsService.generateFriendCode(user.id));
        }
      }
    };

    loadFriendCode();
  }, [user?.id]);

  // Reload friends when modal closes (in case changes were made)
  const handleFriendsModalClose = () => {
    setShowFriendsModal(false);
    loadFriends(); // Refresh friends list
  };

  // Copy friend code to clipboard
  const handleCopyFriendCode = async () => {
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopiedCode(true);
      toast.success('Friend Code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      toast.error('Failed to copy Friend Code');
    }
  };

  // Copy friend's code to clipboard
  const handleCopyFriendCodeById = async (friendId: string, friendName: string) => {
    try {
      const friendCode = friendsService.generateFriendCode(friendId);
      await navigator.clipboard.writeText(friendCode);
      setCopiedFriendCodes(prev => new Set(prev).add(friendId));
      toast.success(`${friendName}'s Friend Code copied to clipboard!`);
      setTimeout(() => {
        setCopiedFriendCodes(prev => {
          const newSet = new Set(prev);
          newSet.delete(friendId);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy Friend Code');
    }
  };

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
        <div className="bg-white rounded-lg shadow-lg p-6">
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
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" alt="Pokemon" className="w-20 h-20" />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-semibold">{profile?.username || 'Trainer'}</h3>
              <p className="text-gray-500 text-sm mb-3">{user.email}</p>

              {/* Friend Code */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">Friend Code</p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                  <code className="text-sm font-mono font-bold text-blue-600 tracking-wider">
                    {friendCode || '--------'}
                  </code>
                  <button
                    onClick={handleCopyFriendCode}
                    disabled={!friendCode}
                    className="text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Copy Friend Code"
                  >
                    {copiedCode ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
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
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Favorite Pokémon</h2>

          {favoritePokemonIds.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No favorites yet</p>
              <button onClick={() => navigate('/')} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md font-medium">
                Browse Pokémon
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {favoritePokemonIds.map((pokemonId) => (
                <div
                  key={pokemonId}
                  onClick={() => navigate(`/pokemon/${pokemonId}`)}
                  className="bg-gray-50 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
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

        {/* Friends Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Your Friends
              {friendsWithDetails.length > 0 && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({friendsWithDetails.length})
                </span>
              )}
            </h2>
            <button
              onClick={() => setShowFriendsModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Manage Friends
            </button>
          </div>

          {loadingFriends ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading friends...</p>
            </div>
          ) : friendsWithDetails.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">You haven't added any friends yet.</p>
              <p className="text-sm text-gray-500 mb-6">
                Add friends to compete on leaderboards and see their favorite Pokémon!
              </p>
              <button
                onClick={() => setShowFriendsModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md font-medium"
              >
                Add Your First Friend
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {friendsWithDetails.map((friend) => (
                <div
                  key={friend.friend_id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                      {friendProfiles[friend.friend_id]?.avatar_url ? (
                        <img
                          src={friendProfiles[friend.friend_id].avatar_url}
                          alt={`${friend.friend_name}'s avatar`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-bold text-sm">
                          {friend.friend_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{friend.friend_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-600 font-mono">
                          Code: <span className="font-bold text-blue-600">{friendsService.generateFriendCode(friend.friend_id)}</span>
                        </p>
                        <button
                          onClick={() => handleCopyFriendCodeById(friend.friend_id, friend.friend_name)}
                          className="text-gray-600 hover:text-blue-600 transition-colors"
                          title={`Copy ${friend.friend_name}'s Friend Code`}
                        >
                          {copiedFriendCodes.has(friend.friend_id) ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friends Modal */}
        <FriendsModal
          isOpen={showFriendsModal}
          onClose={handleFriendsModalClose}
        />

        {/* Teams Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Pokémon Teams</h2>
            <button onClick={() => navigate('/teams')} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium">
              Manage Teams
            </button>
          </div>

          {userTeams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">You haven't created any teams yet.</p>
              <button onClick={() => navigate('/teams')} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md font-medium">
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
                      const member = teamMembers[team.id]?.find(m => m.position === position);
                      return (
                        <div
                          key={position}
                          className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center overflow-hidden"
                          title={member ? `Position ${position}: Pokémon #${member.pokemon_id}` : `Position ${position}: Empty`}
                        >
                          {member ? (
                            <img
                              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${member.pokemon_id}.png`}
                              alt={`Pokémon ${member.pokemon_id}`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                // Fallback to question mark if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0QzE0IDUuMSAxMy4xIDYgMTIgNkMxMC45IDYgMTAgNS4xIDEwIDRDMTAgMi45IDEwLjkgMiAxMiAyWk0xMiAxNEM5LjggMTQgNy41IDE1LjMgNy41IDE3VjE5SDR2LTIuNUM0IDE0LjY3IDYuNjcgMTIgMTIgMTJDMTcuMzMgMTIgMjAgMTQuNjcgMjAgMTcuNVYyMEgxOS41VjE3QzE5LjUgMTUuMyAxNy4yIDE0IDEyIDE0WiIgZmlsbD0iIzk5YTNhZiIvPgo8L3N2Zz4K';
                              }}
                            />
                          ) : (
                            <span className="text-xs text-gray-400">{position}</span>
                          )}
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
