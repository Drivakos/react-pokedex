import React, { useMemo } from 'react';
import { CheckCheck, ExternalLink, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type Notification } from '../services/notifications.service';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDropdownProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (notificationId: number) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
  onOpenFriendsModal?: (initialTab?: 'friends' | 'requests' | 'add') => void;
  userId?: string;
  onAcceptFriendRequest?: (requestId: number) => Promise<void>;
  onDeclineFriendRequest?: (requestId: number) => Promise<void>;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
  onOpenFriendsModal,
  onAcceptFriendRequest,
  onDeclineFriendRequest
}) => {
  const navigate = useNavigate();

  const handleNotificationClick = async (notification: Notification) => {
    // For unread friend_request with a request_id, the inline buttons handle the action.
    // Clicking the row itself just marks it as read (no redirect to FriendsModal).
    if (
      notification.type === 'friend_request' &&
      !notification.read &&
      notification.data?.request_id != null
    ) {
      await onMarkAsRead(notification.id);
      return;
    }

    // Always mark as read when clicked (user has seen/interacted with it)
    await onMarkAsRead(notification.id);

    // Handle friend-related notifications specially
    if (notification.type === 'friend_request' && onOpenFriendsModal) {
      onOpenFriendsModal('requests');
      onClose();
      return;
    }

    if (notification.type === 'friend_accepted' && onOpenFriendsModal) {
      onOpenFriendsModal('friends');
      onClose();
      return;
    }

    // Navigate to URL if provided
    if (notification.url) {
      navigate(notification.url);
      onClose();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'friend_accepted':
        return <Users className="h-4 w-4 text-green-500" />;
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  const unreadCount = useMemo(() =>
    notifications.filter(n => !n.read).length,
    [notifications]
  );

  const showInlineActions = (notification: Notification) =>
    notification.type === 'friend_request' &&
    !notification.read &&
    notification.data?.request_id != null &&
    onAcceptFriendRequest != null &&
    onDeclineFriendRequest != null;

  return (
    <div
      className="absolute top-full right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-[65] border border-gray-200"
      style={{ pointerEvents: 'auto', maxHeight: '70vh', overflowY: 'auto' }}
      data-notification-dropdown
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No notifications yet</div>
            <div className="text-xs mt-1">Friend requests and updates will appear here</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => {
              const hasInline = showInlineActions(notification);
              const unreadBg = !notification.read ? 'bg-blue-50' : '';
              return (
                <div key={notification.id}>
                  {/* Row button — no interactive descendants to avoid nested-button browser issues */}
                  <button
                    className={`w-full text-left px-4 pt-4 ${hasInline ? 'pb-2' : 'pb-4'} hover:bg-gray-50 cursor-pointer transition-colors ${unreadBg}`}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await handleNotificationClick(notification);
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-1 ml-2">
                            {notification.url && (
                              <ExternalLink className="h-3 w-3 text-gray-400" />
                            )}
                            {!notification.read && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Accept / Decline — sibling to the row button, NOT nested inside it */}
                  {hasInline && (
                    <div className={`flex space-x-2 px-4 pb-3 ${unreadBg}`}>
                      <button
                        className="flex-1 py-1 px-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded transition-colors"
                        onClick={async () => {
                          onClose();
                          await onAcceptFriendRequest!(notification.data!.request_id!);
                          await onMarkAsRead(notification.id);
                        }}
                      >
                        Accept
                      </button>
                      <button
                        className="flex-1 py-1 px-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded transition-colors"
                        onClick={async () => {
                          onClose();
                          await onDeclineFriendRequest!(notification.data!.request_id!);
                          await onMarkAsRead(notification.id);
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
