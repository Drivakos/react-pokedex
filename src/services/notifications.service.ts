import { supabase } from '../lib/supabase';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  url?: string;
  data?: any;
  read: boolean;
  created_at: string;
}

class NotificationsService {
  /**
   * Get user notifications
   */
  async getNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    if (!userId) return [];

    try {
      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;

    try {
      const { data, error } = await supabase.rpc('get_unread_notification_count', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number, userId: string): Promise<boolean> {
    console.log('=== SERVICE: markAsRead called ===');
    console.log('notificationId:', notificationId, 'userId:', userId);

    try {
      const { data, error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
        p_user_id: userId
      });

      console.log('Supabase RPC result:', { data, error });

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      console.log('=== SERVICE: markAsRead completed successfully ===');
      return data || false;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('mark_all_notifications_read', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return 0;
    }
  }

  /**
   * Create a notification (for system use)
   */
  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    url?: string,
    data?: any
  ): Promise<number | null> {
    try {
      const { data: result, error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_message: message,
        p_url: url,
        p_data: data || {}
      });

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      return result;
    } catch (error) {
      console.error('Error in createNotification:', error);
      return null;
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Real-time notification received:', payload.new);
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Create a test notification (for debugging)
   */
  async createTestNotification(userId: string) {
    console.log('Creating test notification for user:', userId);
    return this.createNotification(
      userId,
      'friend_request',
      'Test Friend Request',
      'This is a test friend request notification',
      '/friends',
      { test: true, timestamp: new Date().toISOString() }
    );
  }
}

export const notificationsService = new NotificationsService();
