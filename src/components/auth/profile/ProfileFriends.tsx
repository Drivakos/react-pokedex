import React from 'react';
import { friendsService, type Friend } from '../../../services/friends.service';

interface ProfileFriendsProps {
  friends: Friend[];
  loading: boolean;
  onManage: () => void;
  onCopyCode: (text: string, label: string) => void;
}

export const ProfileFriends: React.FC<ProfileFriendsProps> = ({
  friends,
  loading,
  onManage,
  onCopyCode
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          Friends {friends.length > 0 && <span className="text-sm font-normal text-gray-500">({friends.length})</span>}
        </h2>
        <button
          onClick={onManage}
          className="text-blue-500 hover:text-blue-600 text-sm font-medium"
        >
          Manage
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : friends.length === 0 ? (
        <p className="text-gray-500 text-sm">No friends yet. <button onClick={onManage} className="text-blue-500 hover:underline">Add friends</button></p>
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
                  onClick={() => onCopyCode(`${friend.friend_name} #${code}`, friend.friend_name)}
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
  );
};
