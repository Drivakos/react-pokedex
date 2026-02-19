import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { TeamMember } from '../../lib/supabase';
import { friendsService, type Friend } from '../../services/friends.service';
import { FriendsModal } from '../friends';
import toast from 'react-hot-toast';

// Sub-components
import { ProfileCard } from './profile/ProfileCard';
import { ProfileFavorites } from './profile/ProfileFavorites';
import { ProfileFriends } from './profile/ProfileFriends';
import { ProfileTeams } from './profile/ProfileTeams';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, updateProfile, teams, favorites } = useAuth();
  
  // State
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendCode, setFriendCode] = useState<string>('');
  const [formData, setFormData] = useState({ username: profile?.username || '' });

  // Memos
  const favoritePokemonIds = useMemo(() => user?.id ? (favorites ?? []).map(f => f.pokemon_id) : [], [user, favorites]);
  const userTeams = useMemo(() => user?.id ? (teams ?? []) : [], [user, teams]);

  // Extract team members from userTeams directly
  const teamMembers = useMemo(() => {
    const members: Record<number, TeamMember[]> = {};
    userTeams.slice(0, 3).forEach(team => {
      if (team.team_members) {
        members[team.id] = team.team_members;
      }
    });
    return members;
  }, [userTeams]);

  // Sync profile username to form
  useEffect(() => {
    if (profile && profile.username !== formData.username) {
      setFormData({ username: profile.username ?? '' });
    }
  }, [profile?.username]);

  // Load friends & friend code
  const loadFriendsData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoadingFriends(true);
    try {
      const [friendsData, code] = await Promise.all([
        friendsService.getFriends(user.id),
        friendsService.getMyFriendCode()
      ]);
      setFriends(friendsData);
      setFriendCode(code || friendsService.generateFriendCode(user.id));
    } catch (err) {
      console.error('Failed to load friends data:', err);
    } finally {
      setLoadingFriends(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFriendsData();
  }, [loadFriendsData]);

  // Handlers
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Failed to sign out' });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} code copied!`);
    } catch {
      toast.error('Failed to copy');
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
        
        <ProfileCard 
          user={user}
          profile={profile}
          formData={formData}
          setFormData={setFormData}
          status={status}
          friendCode={friendCode}
          onSignOut={handleSignOut}
          onCopyCode={() => copyToClipboard(friendCode, 'Friend code')}
          onSubmit={handleUpdateProfile}
        />

        <ProfileFavorites 
          favoritePokemonIds={favoritePokemonIds}
          onNavigateToPokemon={(id) => navigate(`/pokemon/${id}`)}
          onBrowse={() => navigate('/')}
        />

        <ProfileFriends 
          friends={friends}
          loading={loadingFriends}
          onManage={() => setShowFriendsModal(true)}
          onCopyCode={copyToClipboard}
        />

        <ProfileTeams 
          userTeams={userTeams}
          teamMembers={teamMembers}
          onManage={() => navigate('/teams')}
          onNavigateToTeam={(id) => navigate(`/team-editor/${id}`)}
        />

        <FriendsModal 
          isOpen={showFriendsModal} 
          onClose={() => {
            setShowFriendsModal(false);
            loadFriendsData();
          }} 
        />
      </div>
    </div>
  );
};

export default Profile;
