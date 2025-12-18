import React from 'react';
import { friendsService, type Friend } from '../../services/friends.service';
import toast from 'react-hot-toast';

interface FriendsListProps {
  friends: Friend[];
  onRemoveFriend: (friendId: string) => void;
}

export const FriendsList: React.FC<FriendsListProps> = ({ friends, onRemoveFriend }) => {
  const copyCode = async (name: string, id: string) => {
    const code = friendsService.generateFriendCode(id);
    try {
      await navigator.clipboard.writeText(`${name} #${code}`);
      toast.success('Friend code copied!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No friends yet</h3>
        <p className="text-gray-600">Add friends to compete on the leaderboard!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map((friend) => {
        const code = friendsService.generateFriendCode(friend.friend_id);
        return (
          <div
            key={friend.friend_id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {friend.friend_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <button
                  onClick={() => copyCode(friend.friend_name, friend.friend_id)}
                  className="text-left hover:bg-gray-200 rounded px-1 -ml-1"
                  title="Copy"
                >
                  <span className="font-semibold text-gray-900">{friend.friend_name}</span>
                  <span className="text-gray-400 font-mono text-sm ml-1">#{code}</span>
                </button>
              </div>
            </div>
            <button
              onClick={() => onRemoveFriend(friend.friend_id)}
              className="text-red-500 hover:text-red-600 p-2 rounded-lg"
              title="Remove"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
};

