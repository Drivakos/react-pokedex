import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, History, UserRound, Users } from 'lucide-react';
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
import { VsMatchHistory } from '../vs/VsMatchHistory';

type ProfileTab = 'profile' | 'collection' | 'friends' | 'history';

const profileTabs: Array<{ id: ProfileTab; label: string; icon: typeof UserRound }> = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'collection', label: 'Collection', icon: Heart },
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'history', label: 'Match History', icon: History },
];

function isProfileTab(value: string | null): value is ProfileTab {
  return profileTabs.some(tab => tab.id === value);
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, signOut, updateProfile, teams, favorites } = useAuth();
  const requestedTab = searchParams.get('tab');
  const activeTab: ProfileTab = isProfileTab(requestedTab) ? requestedTab : 'profile';
  
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
    setFormData({ username: profile?.username ?? '' });
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
    } catch (error: unknown) {
      setStatus({ type: 'error', message: (error as Error).message || 'Failed to sign out' });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStatus({ type: null, message: '' });
      const { error } = await updateProfile({ username: formData.username });
      if (error) throw error;
      setStatus({ type: 'success', message: 'Profile updated!' });
    } catch (error: unknown) {
      setStatus({ type: 'error', message: (error as Error).message || 'Failed to update profile' });
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

  const selectTab = (tab: ProfileTab) => {
    if (tab === 'profile') setSearchParams({}, { replace: true });
    else setSearchParams({ tab }, { replace: true });
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
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Trainer hub</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {profile?.username || 'Your profile'}
              </h1>
              <p className="mt-1 text-sm text-slate-500">Manage your account, collection, friends, and VS records.</p>
            </div>
            <div className="flex gap-2 text-xs font-bold text-slate-600">
              <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">{favoritePokemonIds.length} favorites</span>
              <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">{userTeams.length} teams</span>
              <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">{friends.length} friends</span>
            </div>
          </div>
        </header>

        <nav className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" aria-label="Profile sections">
          <div className="flex min-w-max gap-1" role="tablist">
            {profileTabs.map(tab => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`profile-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`profile-panel-${tab.id}`}
                  onClick={() => selectTab(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${selected ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <Icon size={17} aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div id={`profile-panel-${activeTab}`} role="tabpanel" aria-labelledby={`profile-tab-${activeTab}`}>
          {activeTab === 'profile' && (
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
          )}

          {activeTab === 'collection' && (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <ProfileFavorites
                favoritePokemonIds={favoritePokemonIds}
                onNavigateToPokemon={(id) => navigate(`/pokemon/${id}`)}
                onBrowse={() => navigate('/')}
              />
              <ProfileTeams
                userTeams={userTeams}
                teamMembers={teamMembers}
                onManage={() => navigate('/teams')}
                onNavigateToTeam={(id) => navigate(`/team-editor/${id}`)}
              />
            </div>
          )}

          {activeTab === 'friends' && (
            <ProfileFriends
              friends={friends}
              loading={loadingFriends}
              onManage={() => setShowFriendsModal(true)}
              onCopyCode={copyToClipboard}
            />
          )}

          {activeTab === 'history' && <VsMatchHistory userId={user.id} embedded />}
        </div>

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
