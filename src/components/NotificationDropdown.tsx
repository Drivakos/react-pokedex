import React, { useMemo } from 'react';
import { Check, CheckCheck, ExternalLink, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationsService, type Notification } from '../services/notifications.service';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDropdownProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (notificationId: number) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
  onOpenFriendsModal?: (initialTab?: 'friends' | 'requests' | 'add') => void;
  userId?: string; // For testing
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
  onOpenFriendsModal,
  userId
}) => {
  const navigate = useNavigate();

  const handleNotificationClick = async (notification: Notification) => {
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
            {notifications.map((notification) => (
              <button
                key={notification.id}
                className={`w-full text-left p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
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
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3">
        {/* Test button for debugging */}
        {userId && (
          <button
            onClick={async () => {
              try {
                console.log('Creating test notification...');
                await notificationsService.createTestNotification(userId);
                console.log('Test notification created');
              } catch (error) {
                console.error('Error creating test notification:', error);
              }
            }}
            className="text-xs text-red-600 hover:text-red-800 w-full text-center mb-2"
          >
            [TEST] Create Friend Request Notification
          </button>
        )}

        {notifications.length > 0 && (
          <button
            onClick={() => {
              navigate('/profile'); // Could be a dedicated notifications page
              onClose();
            }}
            className="text-sm text-blue-600 hover:text-blue-800 w-full text-center"
          >
            View all notifications
          </button>
        )}
      </div>
    </div>
  );
};
