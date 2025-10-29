import React from 'react';
import type { Friend } from '../../services/friends.service';

interface FriendsListProps {
  friends: Friend[];
  onRemoveFriend: (friendId: string) => void;
}

export const FriendsList: React.FC<FriendsListProps> = ({ friends, onRemoveFriend }) => {
  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">👥</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No friends yet</h3>
        <p className="text-gray-600 mb-4">Add friends to compete on the leaderboard!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map((friend) => (
        <div
          key={friend.friend_id}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {friend.friend_name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div>
              <h4 className="font-semibold text-gray-900">{friend.friend_name}</h4>
              <p className="text-sm text-gray-600">{friend.friend_email}</p>
              <p className="text-xs text-gray-500 mt-1">
                Friends since {new Date(friend.friendship_created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={() => onRemoveFriend(friend.friend_id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
            title="Remove friend"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

