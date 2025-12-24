import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { notificationsService, type Notification } from '../services/notifications.service';
import { NotificationDropdown } from './NotificationDropdown';

interface NotificationBellProps {
  onOpenFriendsModal?: (initialTab?: 'friends' | 'requests' | 'add') => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onOpenFriendsModal }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Debounced handler for real-time notifications
  const handleNewNotification = useCallback((notification: Notification) => {
    // Debounce rapid updates (e.g., during bulk operations)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setNotifications(prev => {
        // Limit stored notifications to prevent memory issues
        const updated = [notification, ...prev];
        return updated.slice(0, 100); // Keep only latest 100
      });
      setUnreadCount(prev => prev + 1);
    }, 100); // 100ms debounce
  }, []);


  // Load only unread count on mount, full notifications when needed
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    // Only load unread count initially (much cheaper)
    const loadUnreadCount = async () => {
      try {
        const count = await notificationsService.getUnreadCount(user.id);
        setUnreadCount(count);
      } catch (error) {
        console.error('Error loading unread count:', error);
        setUnreadCount(0);
      }
    };

    loadUnreadCount();

    // Subscribe to real-time notifications with debouncing
    const unsubscribe = notificationsService.subscribeToNotifications(user.id, handleNewNotification);

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [user]);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (!isOpen || !user) return;

    const loadNotifications = async () => {
      setLoading(true);
      try {
        const data = await notificationsService.getNotifications(user.id);
        setNotifications(data);
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [isOpen, user]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking on the bell button itself or within the notification dropdown
      const target = event.target as Node;
      const isClickOnBell = bellRef.current && bellRef.current.contains(target);
      const isClickInDropdown = (target as Element)?.closest?.('[data-notification-dropdown]');

      if (!isClickOnBell && !isClickInDropdown) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: number) => {
    if (!user) return;

    try {
      await notificationsService.markAsRead(notificationId, user.id);

      setNotifications(prev => {
        const updated = prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        );

        // Recalculate unread count from remaining notifications
        const unreadCount = updated.filter(n => !n.read).length;
        setUnreadCount(unreadCount);

        return updated;
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    try {
      await notificationsService.markAllAsRead(user.id);
      setNotifications([]); // Remove all notifications since they're all "seen"
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white hover:bg-white/20 active:bg-white/30 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
            notifications={notifications}
            loading={loading}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onClose={() => setIsOpen(false)}
            onOpenFriendsModal={onOpenFriendsModal}
            userId={user?.id}
          />
      )}
    </div>
  );
};
