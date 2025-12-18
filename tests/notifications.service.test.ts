/**
 * Notifications Service Tests
 * Tests for the notifications.service.ts functionality
 */

// Mock functions need to be defined with jest.fn() before jest.mock
const mockRpc = jest.fn();
const mockChannel = jest.fn();
const mockOn = jest.fn();
const mockSubscribe = jest.fn();
const mockRemoveChannel = jest.fn();

// Use jest.doMock to avoid hoisting issues
jest.mock('../src/lib/supabase', () => {
  return {
    supabase: {
      rpc: jest.fn(),
      channel: jest.fn(),
      removeChannel: jest.fn()
    }
  };
});

// Import after mocking
import { notificationsService, type Notification } from '../src/services/notifications.service';
import { supabase } from '../src/lib/supabase';

// Cast to jest.Mock for type safety
const mockedRpc = supabase.rpc as jest.Mock;
const mockedChannel = supabase.channel as jest.Mock;
const mockedRemoveChannel = supabase.removeChannel as jest.Mock;

describe('NotificationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock chain for channel()
    mockSubscribe.mockReturnValue('subscription-id');
    mockOn.mockReturnValue({ subscribe: mockSubscribe });
    mockedChannel.mockReturnValue({ on: mockOn });
  });

  describe('getNotifications', () => {
    const mockUserId = 'user-123-uuid';

    it('should return empty array when userId is empty', async () => {
      const result = await notificationsService.getNotifications('');
      expect(result).toEqual([]);
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should call get_user_notifications RPC with correct parameters', async () => {
      const mockNotifications: Notification[] = [
        {
          id: 1,
          type: 'friend_request',
          title: 'New Friend Request',
          message: 'John sent you a friend request',
          url: '/friends',
          data: { sender_id: 'john-id' },
          read: false,
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockedRpc.mockResolvedValue({ data: mockNotifications, error: null });

      const result = await notificationsService.getNotifications(mockUserId, 50, 10);

      expect(mockedRpc).toHaveBeenCalledWith('get_user_notifications', {
        p_user_id: mockUserId,
        p_limit: 50,
        p_offset: 10
      });
      expect(result).toEqual(mockNotifications);
    });

    it('should use default limit and offset', async () => {
      mockedRpc.mockResolvedValue({ data: [], error: null });

      await notificationsService.getNotifications(mockUserId);

      expect(mockedRpc).toHaveBeenCalledWith('get_user_notifications', {
        p_user_id: mockUserId,
        p_limit: 50,
        p_offset: 0
      });
    });

    it('should return empty array on RPC error', async () => {
      mockedRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await notificationsService.getNotifications(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle exceptions gracefully', async () => {
      mockedRpc.mockRejectedValue(new Error('Network error'));

      const result = await notificationsService.getNotifications(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getUnreadCount', () => {
    const mockUserId = 'user-123-uuid';

    it('should return 0 when userId is empty', async () => {
      const result = await notificationsService.getUnreadCount('');
      expect(result).toBe(0);
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should call get_unread_notification_count RPC with correct parameters', async () => {
      mockedRpc.mockResolvedValue({ data: 5, error: null });

      const result = await notificationsService.getUnreadCount(mockUserId);

      expect(mockedRpc).toHaveBeenCalledWith('get_unread_notification_count', {
        p_user_id: mockUserId
      });
      expect(result).toBe(5);
    });

    it('should return 0 on RPC error', async () => {
      mockedRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await notificationsService.getUnreadCount(mockUserId);

      expect(result).toBe(0);
    });

    it('should handle exceptions gracefully', async () => {
      mockedRpc.mockRejectedValue(new Error('Network error'));

      const result = await notificationsService.getUnreadCount(mockUserId);

      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    const mockNotificationId = 123;
    const mockUserId = 'user-123-uuid';

    it('should call mark_notification_read RPC with correct parameters', async () => {
      mockedRpc.mockResolvedValue({ data: true, error: null });

      const result = await notificationsService.markAsRead(mockNotificationId, mockUserId);

      expect(mockedRpc).toHaveBeenCalledWith('mark_notification_read', {
        p_notification_id: mockNotificationId,
        p_user_id: mockUserId
      });
      expect(result).toBe(true);
    });

    it('should return false on RPC error', async () => {
      mockedRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await notificationsService.markAsRead(mockNotificationId, mockUserId);

      expect(result).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      mockedRpc.mockRejectedValue(new Error('Network error'));

      const result = await notificationsService.markAsRead(mockNotificationId, mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    const mockUserId = 'user-123-uuid';

    it('should call mark_all_notifications_read RPC with correct parameters', async () => {
      mockedRpc.mockResolvedValue({ data: 3, error: null });

      const result = await notificationsService.markAllAsRead(mockUserId);

      expect(mockedRpc).toHaveBeenCalledWith('mark_all_notifications_read', {
        p_user_id: mockUserId
      });
      expect(result).toBe(3);
    });

    it('should return 0 on RPC error', async () => {
      mockedRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await notificationsService.markAllAsRead(mockUserId);

      expect(result).toBe(0);
    });

    it('should handle exceptions gracefully', async () => {
      mockedRpc.mockRejectedValue(new Error('Network error'));

      const result = await notificationsService.markAllAsRead(mockUserId);

      expect(result).toBe(0);
    });
  });

  describe('createNotification', () => {
    const mockUserId = 'user-123-uuid';
    const mockType = 'friend_request';
    const mockTitle = 'New Friend Request';
    const mockMessage = 'John sent you a friend request';
    const mockUrl = '/friends';
    const mockData = { sender_id: 'john-id' };

    it('should call create_notification RPC with correct parameters', async () => {
      mockedRpc.mockResolvedValue({ data: 456, error: null });

      const result = await notificationsService.createNotification(
        mockUserId,
        mockType,
        mockTitle,
        mockMessage,
        mockUrl,
        mockData
      );

      expect(mockedRpc).toHaveBeenCalledWith('create_notification', {
        p_user_id: mockUserId,
        p_type: mockType,
        p_title: mockTitle,
        p_message: mockMessage,
        p_url: mockUrl,
        p_data: mockData
      });
      expect(result).toBe(456);
    });

    it('should handle null url and data', async () => {
      mockedRpc.mockResolvedValue({ data: 789, error: null });

      const result = await notificationsService.createNotification(
        mockUserId,
        mockType,
        mockTitle,
        mockMessage
      );

      expect(mockedRpc).toHaveBeenCalledWith('create_notification', {
        p_user_id: mockUserId,
        p_type: mockType,
        p_title: mockTitle,
        p_message: mockMessage,
        p_url: undefined,
        p_data: {}
      });
      expect(result).toBe(789);
    });

    it('should return null on RPC error', async () => {
      mockedRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await notificationsService.createNotification(
        mockUserId,
        mockType,
        mockTitle,
        mockMessage
      );

      expect(result).toBeNull();
    });

    it('should handle exceptions gracefully', async () => {
      mockedRpc.mockRejectedValue(new Error('Network error'));

      const result = await notificationsService.createNotification(
        mockUserId,
        mockType,
        mockTitle,
        mockMessage
      );

      expect(result).toBeNull();
    });
  });

  describe('subscribeToNotifications', () => {
    const mockUserId = 'user-123-uuid';
    const mockCallback = jest.fn();

    it('should create channel and subscribe to notifications', () => {
      const unsubscribe = notificationsService.subscribeToNotifications(mockUserId, mockCallback);

      expect(mockedChannel).toHaveBeenCalledWith(`notifications:${mockUserId}`);
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${mockUserId}`
        },
        expect.any(Function)
      );
      expect(mockSubscribe).toHaveBeenCalled();

      // Test that callback is called when notification is received
      const mockPayload = {
        new: {
          id: 1,
          type: 'friend_request',
          title: 'New Friend Request',
          message: 'John sent you a friend request',
          read: false,
          created_at: '2024-01-01T00:00:00Z'
        }
      };

      // Get the callback function passed to mockOn
      const callback = mockOn.mock.calls[0][2];
      callback(mockPayload);

      expect(mockCallback).toHaveBeenCalledWith(mockPayload.new);

      // Test unsubscribe
      unsubscribe();
      expect(mockedRemoveChannel).toHaveBeenCalledWith('subscription-id');
    });

    it('should handle callback execution', () => {
      const unsubscribe = notificationsService.subscribeToNotifications(mockUserId, mockCallback);

      const mockPayload = {
        new: {
          id: 2,
          type: 'friend_accepted',
          title: 'Friend Request Accepted!',
          message: 'Jane accepted your friend request',
          read: false,
          created_at: '2024-01-01T01:00:00Z'
        }
      };

      const callback = mockOn.mock.calls[0][2];
      callback(mockPayload);

      expect(mockCallback).toHaveBeenCalledWith(mockPayload.new);
    });
  });

  describe('createTestNotification', () => {
    const mockUserId = 'user-123-uuid';

    it('should create a test friend request notification', async () => {
      mockedRpc.mockResolvedValue({ data: 999, error: null });

      const result = await notificationsService.createTestNotification(mockUserId);

      expect(mockedRpc).toHaveBeenCalledWith('create_notification', {
        p_user_id: mockUserId,
        p_type: 'friend_request',
        p_title: 'Test Friend Request',
        p_message: 'This is a test friend request notification',
        p_url: '/friends',
        p_data: expect.objectContaining({
          test: true,
          timestamp: expect.any(String)
        })
      });
      expect(result).toBe(999);
    });

    it('should handle RPC error gracefully', async () => {
      mockedRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await notificationsService.createTestNotification(mockUserId);

      expect(result).toBeNull();
    });
  });
});
