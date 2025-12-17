import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthProvider';
import { friendsService, type Friend, type FriendRequest, type UserSearchResult } from '../../services/friends.service';
import { FriendsList } from './FriendsList';
import { FriendRequests } from './FriendRequests';
import toast from 'react-hot-toast';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'friends' | 'requests' | 'add';

export const FriendsModal: React.FC<FriendsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Add friend search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchedQueryRef = useRef<string>('');

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

  // Perform search with the given query
  const performSearch = useCallback(async (query: string) => {
    if (!user || !query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    // Extract friend code if query contains # (e.g., "username #FD9D1EEA")
    let searchTerm = query.trim();
    const hashMatch = searchTerm.match(/#([A-Fa-f0-9]{8})/);
    if (hashMatch) {
      searchTerm = hashMatch[1]; // Use just the friend code
    }

    if (lastSearchedQueryRef.current === searchTerm) {
      return;
    }

    lastSearchedQueryRef.current = searchTerm;
    setSearching(true);

    try {
      const results = await friendsService.searchUsers(user.id, searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [user]);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      lastSearchedQueryRef.current = '';
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  useEffect(() => {
    if (isOpen && user) {
      loadData();
    }
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      lastSearchedQueryRef.current = '';
    }
  }, [isOpen, user]);

  const handleAcceptRequest = async (requestId: number) => {
    if (!user) return;

    const result = await friendsService.acceptFriendRequest(requestId, user.id);
    if (result.success) {
      loadData();
      toast.success('Friend request accepted!');
    } else {
      toast.error(result.error || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    if (!user) return;

    const result = await friendsService.rejectFriendRequest(requestId, user.id);
    if (result.success) {
      toast.success('Friend request rejected');
      loadData();
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
      loadData();
    } else {
      toast.error(result.error || 'Failed to remove friend');
    }
  };

  const handleSendRequest = async (receiverId: string) => {
    if (!user) return;

    setSendingRequestTo(receiverId);
    try {
      const result = await friendsService.sendFriendRequest(user.id, receiverId);
      if (result.success) {
        toast.success('Friend request sent!');
        setSearchResults(prev =>
          prev.map(u =>
            u.user_id === receiverId ? { ...u, has_pending_request: true } : u
          )
        );
        loadData();
      } else {
        toast.error(result.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
    } finally {
      setSendingRequestTo(null);
    }
  };

  const handleManualSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    performSearch(searchQuery);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Friends</h2>
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
        <div className="px-6 pt-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${activeTab === 'friends'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Friends ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors relative ${activeTab === 'requests'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Requests
              {friendRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {friendRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${activeTab === 'add'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Add
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && activeTab !== 'add' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : activeTab === 'friends' ? (
            <FriendsList friends={friends} onRemoveFriend={handleRemoveFriend} />
          ) : activeTab === 'requests' ? (
            <FriendRequests
              requests={friendRequests}
              onAccept={handleAcceptRequest}
              onReject={handleRejectRequest}
            />
          ) : (
            /* Add Friend Tab Content */
            <div>
              {/* Search Input */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                    placeholder="Search by name or friend code..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Enter at least 2 characters to search
                </p>
              </div>

              {/* Search Results */}
              {searching ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                  <p className="text-gray-600">Searching...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">
                    {searchQuery.trim().length >= 2
                      ? 'No users found'
                      : 'Start typing to search for users'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((result) => (
                    <div
                      key={result.user_id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {result.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(`${result.username} #${result.friend_code}`);
                                toast.success('Copied');
                              } catch (err) {
                                console.error('Failed to copy:', err);
                              }
                            }}
                            className="text-left hover:bg-gray-200 rounded px-1 -ml-1"
                            title="Copy"
                          >
                            <span className="font-semibold text-gray-900">{result.username}</span>
                            <span className="text-gray-400 font-mono text-sm ml-1">#{result.friend_code}</span>
                          </button>
                        </div>
                      </div>

                      {result.is_friend ? (
                        <span className="text-sm text-green-600 font-medium">Friends</span>
                      ) : result.has_pending_request ? (
                        <span className="text-sm text-gray-600 font-medium">Request Sent</span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(result.user_id)}
                          disabled={sendingRequestTo === result.user_id}
                          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendingRequestTo === result.user_id ? (
                            <span className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              Sending...
                            </span>
                          ) : (
                            'Add'
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

