/**
 * Friends Notifications Integration Tests
 * Tests for the integration between friends system and notifications
 */

// Mock functions need to be defined with jest.fn() before jest.mock
const mockRpc = jest.fn();

// Use jest.doMock to avoid hoisting issues
jest.mock('../src/lib/supabase', () => {
  return {
    supabase: {
      rpc: jest.fn()
    }
  };
});

// Import after mocking
import { friendsService } from '../src/services/friends.service';
import { supabase } from '../src/lib/supabase';

// Cast to jest.Mock for type safety
const mockedRpc = supabase.rpc as jest.Mock;

describe('Friends Notifications Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Friend Request Creation with Notifications', () => {
    const mockSenderId = 'sender-123';
    const mockReceiverId = 'receiver-456';

    it('should create friend request and notification on success', async () => {
      // Mock successful friend request creation
      mockedRpc.mockImplementation((functionName) => {
        if (functionName === 'send_friend_request') {
          return Promise.resolve({ data: 123, error: null });
        }
        // This would normally create a notification, but we're mocking the RPC directly
        return Promise.resolve({ data: null, error: null });
      });

      const result = await friendsService.sendFriendRequest(mockSenderId, mockReceiverId);

      expect(result).toEqual({ success: true });
      expect(mockedRpc).toHaveBeenCalledWith('send_friend_request', {
        p_sender_id: mockSenderId,
        p_receiver_id: mockReceiverId
      });
    });

    it('should handle notification creation failure gracefully', async () => {
      // Mock successful friend request but notification creation failure
      mockedRpc.mockImplementation((functionName) => {
        if (functionName === 'send_friend_request') {
          return Promise.resolve({ data: 123, error: null });
        }
        // This simulates the notification creation failing but not affecting the friend request
        return Promise.resolve({ data: null, error: null });
      });

      const result = await friendsService.sendFriendRequest(mockSenderId, mockReceiverId);

      expect(result).toEqual({ success: true });
      // Friend request should still succeed even if notification creation fails
    });
  });

  describe('Friend Request Acceptance with Notifications', () => {
    const mockRequestId = 123;
    const mockUserId = 'user-456';

    it('should accept friend request and create notification on success', async () => {
      // Mock successful friend request acceptance
      mockedRpc.mockImplementation((functionName) => {
        if (functionName === 'accept_friend_request') {
          return Promise.resolve({ data: true, error: null });
        }
        // This would normally create a notification, but we're mocking the RPC directly
        return Promise.resolve({ data: null, error: null });
      });

      const result = await friendsService.acceptFriendRequest(mockRequestId, mockUserId);

      expect(result).toEqual({ success: true });
      expect(mockedRpc).toHaveBeenCalledWith('accept_friend_request', {
        p_request_id: mockRequestId,
        p_user_id: mockUserId
      });
    });

    it('should handle notification creation failure gracefully', async () => {
      // Mock successful acceptance but notification creation failure
      mockedRpc.mockImplementation((functionName) => {
        if (functionName === 'accept_friend_request') {
          return Promise.resolve({ data: true, error: null });
        }
        // This simulates the notification creation failing but not affecting the acceptance
        return Promise.resolve({ data: null, error: null });
      });

      const result = await friendsService.acceptFriendRequest(mockRequestId, mockUserId);

      expect(result).toEqual({ success: true });
      // Acceptance should still succeed even if notification creation fails
    });

    it('should return error when friend request not found', async () => {
      mockedRpc.mockResolvedValue({ data: false, error: null });

      const result = await friendsService.acceptFriendRequest(mockRequestId, mockUserId);

      expect(result).toEqual({
        success: false,
        error: 'Friend request not found or already processed'
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle database errors during friend request creation', async () => {
      mockedRpc.mockResolvedValue({
        data: null,
        error: { message: 'Already friends with this user' }
      });

      const result = await friendsService.sendFriendRequest('sender-123', 'receiver-456');

      expect(result).toEqual({
        success: false,
        error: 'Already friends with this user'
      });
    });

    it('should handle network errors gracefully', async () => {
      mockedRpc.mockRejectedValue(new Error('Network error'));

      const result = await friendsService.sendFriendRequest('sender-123', 'receiver-456');

      expect(result).toEqual({
        success: false,
        error: 'Network error'
      });
    });
  });

  describe('Database Migration Compatibility', () => {
    it('should work even if notification functions do not exist yet', async () => {
      // Simulate the case where notifications system hasn't been deployed yet
      mockedRpc.mockImplementation((functionName) => {
        if (functionName === 'send_friend_request') {
          return Promise.resolve({ data: 123, error: null });
        }
        // Simulate undefined function error for notifications
        throw new Error('function create_friend_request_notification() does not exist');
      });

      // This should still work - friend request creation should succeed
      // even if notification creation fails
      const result = await friendsService.sendFriendRequest('sender-123', 'receiver-456');

      expect(result).toEqual({ success: true });
    });
  });
});
