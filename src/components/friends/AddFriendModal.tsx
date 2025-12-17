import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthProvider';
import { friendsService, type UserSearchResult } from '../../services/friends.service';
import toast from 'react-hot-toast';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchedQueryRef = useRef<string>('');

  // Perform search with the given query
  const performSearch = useCallback(async (query: string) => {
    if (!user || !query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    // Don't search if we already searched for this query
    if (lastSearchedQueryRef.current === query.trim()) {
      return;
    }

    lastSearchedQueryRef.current = query.trim();
    setSearching(true);

    try {
      const results = await friendsService.searchUsers(user.id, query.trim());
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [user]);

  // Debounced search effect - triggers when searchQuery changes
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If query is too short, clear results immediately
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      lastSearchedQueryRef.current = '';
      return;
    }

    // Set a new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300); // 300ms debounce

    // Cleanup on unmount or when searchQuery changes
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      lastSearchedQueryRef.current = '';
    }
  }, [isOpen]);

  // Manual search (for Enter key)
  const handleManualSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    performSearch(searchQuery);
  };

  const handleSendRequest = async (receiverId: string) => {
    if (!user) return;

    setSendingRequestTo(receiverId);
    try {
      const result = await friendsService.sendFriendRequest(user.id, receiverId);
      if (result.success) {
        onSuccess();
        // Update the search results to reflect the sent request
        setSearchResults(prev =>
          prev.map(u =>
            u.user_id === receiverId ? { ...u, has_pending_request: true } : u
          )
        );
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Add Friend</h3>
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

        {/* Search Input */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
              placeholder="Search by name, email, or friend code..."
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
          <p className="text-sm text-gray-600 mt-2">
            Enter at least 2 characters to search
          </p>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto p-6">
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
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {result.username.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div>
                      <h4 className="font-semibold text-gray-900">{result.username}</h4>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        Code: <span className="font-bold text-blue-600">{result.friend_code}</span>
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  {result.is_friend ? (
                    <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Friends
                    </span>
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
      </div>
    </div>
  );
};

