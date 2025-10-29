import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthProvider';
import { friendsService, type Friend, type FriendRequest } from '../../services/friends.service';
import { FriendsList } from './FriendsList';
import { FriendRequests } from './FriendRequests';
import { AddFriendModal } from './AddFriendModal';
import toast from 'react-hot-toast';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'friends' | 'requests';

export const FriendsModal: React.FC<FriendsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [friendsData, requestsData] = await Promise.all([
        friendsService.getFriends(user.id),
        friendsService.getPendingRequests(user.id)
      ]);

      setFriends(friendsData);
      setFriendRequests(requestsData);
    } catch (error) {
      console.error('Error loading friends data:', error);
      toast.error('Failed to load friends data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      loadData();
    }
  }, [isOpen, user]);

  const handleAcceptRequest = async (requestId: number) => {
    if (!user) return;

    const result = await friendsService.acceptFriendRequest(requestId, user.id);
    if (result.success) {
      toast.success('Friend request accepted!');
      loadData(); // Reload data
    } else {
      toast.error(result.error || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    if (!user) return;

    const result = await friendsService.rejectFriendRequest(requestId, user.id);
    if (result.success) {
      toast.success('Friend request rejected');
      loadData(); // Reload data
    } else {
      toast.error(result.error || 'Failed to reject request');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;

    const confirmed = window.confirm('Are you sure you want to remove this friend?');
    if (!confirmed) return;

    const result = await friendsService.removeFriend(user.id, friendId);
    if (result.success) {
      toast.success('Friend removed');
      loadData(); // Reload data
    } else {
      toast.error(result.error || 'Failed to remove friend');
    }
  };

  const handleAddFriendSuccess = () => {
    setShowAddFriend(false);
    toast.success('Friend request sent!');
    loadData(); // Reload data
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span>👥</span>
                <span>Friends</span>
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('friends')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                  activeTab === 'friends'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Friends ({friends.length})
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors relative ${
                  activeTab === 'requests'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Requests ({friendRequests.length})
                {friendRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {friendRequests.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            ) : activeTab === 'friends' ? (
              <FriendsList friends={friends} onRemoveFriend={handleRemoveFriend} />
            ) : (
              <FriendRequests
                requests={friendRequests}
                onAccept={handleAcceptRequest}
                onReject={handleRejectRequest}
              />
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setShowAddFriend(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Friend
            </button>
          </div>
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <AddFriendModal
          isOpen={showAddFriend}
          onClose={() => setShowAddFriend(false)}
          onSuccess={handleAddFriendSuccess}
        />
      )}
    </>
  );
};

