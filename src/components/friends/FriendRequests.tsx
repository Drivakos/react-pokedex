import React from 'react';
import type { FriendRequest } from '../../services/friends.service';

interface FriendRequestsProps {
  requests: FriendRequest[];
  onAccept: (requestId: number) => void;
  onReject: (requestId: number) => void;
}

export const FriendRequests: React.FC<FriendRequestsProps> = ({
  requests,
  onAccept,
  onReject
}) => {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending requests</h3>
        <p className="text-gray-600">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div
          key={request.request_id}
          className="flex items-center justify-between p-4 bg-blue-50 border-2 border-blue-200 rounded-lg"
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {request.sender_name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div>
              <h4 className="font-semibold text-gray-900">{request.sender_name}</h4>
              <p className="text-xs text-gray-500 mt-1">
                Sent {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onAccept(request.request_id)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
              title="Accept request"
            >
              Accept
            </button>
            <button
              onClick={() => onReject(request.request_id)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium text-sm"
              title="Reject request"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

