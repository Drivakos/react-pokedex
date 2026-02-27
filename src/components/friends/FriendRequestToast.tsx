import React from 'react';

interface FriendRequestToastProps {
  senderName: string;
  onAccept: () => void;
  onDecline: () => void;
  onDismiss: () => void;
}

export const FriendRequestToast: React.FC<FriendRequestToastProps> = ({
  senderName,
  onAccept,
  onDecline,
  onDismiss
}) => {
  const initial = senderName.charAt(0).toUpperCase();

  return (
    <div className="flex items-start space-x-3 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80">
      {/* Avatar */}
      <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
        {initial}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{senderName}</span>
          {' sent you a friend request'}
        </p>

        {/* Actions */}
        <div className="flex space-x-2 mt-2">
          <button
            onClick={() => { onAccept(); onDismiss(); }}
            className="flex-1 py-1 px-3 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => { onDecline(); onDismiss(); }}
            className="flex-1 py-1 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded transition-colors"
          >
            Decline
          </button>
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
