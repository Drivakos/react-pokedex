import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  url?: string;
  data?: {
    sender_id?: string;
    sender_name?: string;
    request_id?: number;
    acceptor_id?: string;
    acceptor_name?: string;
  };
  read: boolean;
  created_at: string;
}

class NotificationsService {
  private cache: Record<string, { data: unknown; timestamp: number }> = {};
  private CACHE_DURATION = 1 * 60 * 1000; // 1 minute

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache[key];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    return null;
  }

  private setInCache(key: string, data: unknown) {
    this.cache[key] = { data, timestamp: Date.now() };
  }

  private clearCache(userId: string) {
    Object.keys(this.cache).forEach(key => {
      if (key.includes(userId)) {
        delete this.cache[key];
      }
    });
  }

  /**
   * Get user notifications
   */
  async getNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    if (!userId) return [];

    const cacheKey = `notifications_${userId}_${limit}_${offset}`;
    const cached = this.getFromCache<Notification[]>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      });

      const result = data || [];
      if (!error) {
        this.setInCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      logger.serviceError('NotificationsService', 'getNotifications', error);
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
        logger.serviceError('NotificationsService', 'getUnreadCount', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      logger.serviceError('NotificationsService', 'getUnreadCount', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number, userId: string): Promise<boolean> {
    logger.debug('markAsRead called', { notificationId, userId });

    try {
      const { data, error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
        p_user_id: userId
      });

      if (error) {
        logger.serviceError('NotificationsService', 'markAsRead', error);
        return false;
      }

      this.clearCache(userId);
      logger.debug('markAsRead completed successfully');
      return data || false;
    } catch (error) {
      logger.serviceError('NotificationsService', 'markAsRead', error);
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
        logger.serviceError('NotificationsService', 'markAllAsRead', error);
        return 0;
      }

      this.clearCache(userId);
      return data || 0;
    } catch (error) {
      logger.serviceError('NotificationsService', 'markAllAsRead', error);
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
    data?: Record<string, unknown>
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
        logger.serviceError('NotificationsService', 'createNotification', error);
        return null;
      }

      return result;
    } catch (error) {
      logger.serviceError('NotificationsService', 'createNotification', error);
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
          logger.debug('Real-time notification received', payload.new);
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
    logger.debug('Creating test notification for user', userId);
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
