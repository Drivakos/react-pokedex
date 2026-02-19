/**
 * Friends Service Tests
 * Tests for the friends.service.ts functionality
 */

// Mock functions need to be defined with jest.fn() before jest.mock
const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();

// Use jest.doMock to avoid hoisting issues
jest.mock('../src/lib/supabase', () => {
  const createMockChain = (data = null, error = null) => {
    const chain = Promise.resolve({ data, error });
    (chain as any).abortSignal = jest.fn().mockReturnValue(chain);
    return chain;
  };

  return {
    supabase: {
      rpc: jest.fn().mockImplementation(() => createMockChain()),
      from: jest.fn()
    }
  };
});

// Import after mocking
import { friendsService, type Friend, type FriendRequest, type UserSearchResult } from '../src/services/friends.service';
import { supabase } from '../src/lib/supabase';

// Cast to jest.Mock for type safety
const mockedRpc = supabase.rpc as jest.Mock;
const mockedFrom = supabase.from as jest.Mock;

const setRpcResponse = (data: any = null, error: any = null) => {
  const chain = Promise.resolve({ data, error });
  (chain as any).abortSignal = jest.fn().mockReturnValue(chain);
  mockedRpc.mockReturnValue(chain);
  return chain;
};

const setRpcError = (error: any) => {
  const chain = Promise.reject(error);
  (chain as any).abortSignal = jest.fn().mockReturnValue(chain);
  mockedRpc.mockReturnValue(chain);
  return chain;
};

describe('FriendsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    friendsService.clearCache();

    // Setup default mock chain for from()
    mockLimit.mockReturnValue({ data: [], error: null });
    mockOrder.mockReturnValue({ limit: mockLimit, data: [], error: null });
    mockEq.mockReturnValue({ order: mockOrder, data: [], error: null });
    mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, data: [], error: null });
    mockedFrom.mockReturnValue({ select: mockSelect });
  });

  describe('getFriends', () => {
    const mockUserId = 'user-123-uuid';

    it('should return empty array when userId is empty', async () => {
      const result = await friendsService.getFriends('');
      expect(result).toEqual([]);
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should call get_user_friends RPC with correct parameters', async () => {
      const mockFriends: Friend[] = [
        {
          friend_id: 'friend-1',
          friend_name: 'John Doe',
          friendship_created_at: '2024-01-01T00:00:00Z'
        }
      ];

      setRpcResponse(mockFriends);

      const result = await friendsService.getFriends(mockUserId);

      expect(mockedRpc).toHaveBeenCalledWith('get_user_friends', {
        p_user_id: mockUserId
      });
      expect(result).toEqual(mockFriends);
    });

    it('should return empty array on RPC error', async () => {
      setRpcResponse(null, { message: 'Database error' });

      const result = await friendsService.getFriends(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle exceptions gracefully', async () => {
      setRpcError(new Error('Network error'));

      const result = await friendsService.getFriends(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getPendingRequests', () => {
    const mockUserId = 'user-123-uuid';

    it('should return empty array when userId is empty', async () => {
      const result = await friendsService.getPendingRequests('');
      expect(result).toEqual([]);
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should call get_pending_friend_requests RPC with correct parameters', async () => {
      const mockRequests: FriendRequest[] = [
        {
          request_id: 1,
          sender_id: 'sender-1',
          sender_name: 'Jane Doe',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      setRpcResponse(mockRequests);

      const result = await friendsService.getPendingRequests(mockUserId);

      expect(mockedRpc).toHaveBeenCalledWith('get_pending_friend_requests', {
        p_user_id: mockUserId
      });
      expect(result).toEqual(mockRequests);
    });

    it('should return empty array on RPC error', async () => {
      setRpcResponse(null, { message: 'Database error' });

      const result = await friendsService.getPendingRequests(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('searchUsers', () => {
    const mockUserId = 'user-123-uuid';
    const mockQuery = 'john';

    it('should return empty array when currentUserId is empty', async () => {
      const result = await friendsService.searchUsers('', mockQuery);
      expect(result).toEqual([]);
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should return empty array when query is empty', async () => {
      const result = await friendsService.searchUsers(mockUserId, '');
      expect(result).toEqual([]);
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should return empty array when query is only whitespace', async () => {
      const result = await friendsService.searchUsers(mockUserId, '   ');
      expect(result).toEqual([]);
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should call search_users_for_friends RPC with correct parameters', async () => {
      const mockResults: UserSearchResult[] = [
        {
          user_id: 'result-1',
          username: 'johndoe',
          friend_code: 'ABC12345',
          is_friend: false,
          has_pending_request: false
        }
      ];

      setRpcResponse(mockResults);

      const result = await friendsService.searchUsers(mockUserId, mockQuery, 10);

      expect(mockedRpc).toHaveBeenCalledWith('search_users_for_friends', {
        p_current_user_id: mockUserId,
        p_search_query: mockQuery,
        p_limit: 10
      });
      expect(result).toEqual(mockResults);
    });

    it('should trim the search query', async () => {
      setRpcResponse([]);

      await friendsService.searchUsers(mockUserId, '  john  ');

      expect(mockedRpc).toHaveBeenCalledWith('search_users_for_friends', {
        p_current_user_id: mockUserId,
        p_search_query: 'john',
        p_limit: 20
      });
    });

    it('should use default limit of 20', async () => {
      setRpcResponse([]);

      await friendsService.searchUsers(mockUserId, mockQuery);

      expect(mockedRpc).toHaveBeenCalledWith('search_users_for_friends', {
        p_current_user_id: mockUserId,
        p_search_query: mockQuery,
        p_limit: 20
      });
    });
  });

  describe('sendFriendRequest', () => {
    const mockSenderId = 'sender-123';
    const mockReceiverId = 'receiver-456';

    it('should return error when senderId is empty', async () => {
      const result = await friendsService.sendFriendRequest('', mockReceiverId);
      expect(result).toEqual({ success: false, error: 'Invalid user IDs' });
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should return error when receiverId is empty', async () => {
      const result = await friendsService.sendFriendRequest(mockSenderId, '');
      expect(result).toEqual({ success: false, error: 'Invalid user IDs' });
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should return error when trying to friend yourself', async () => {
      const result = await friendsService.sendFriendRequest(mockSenderId, mockSenderId);
      expect(result).toEqual({ success: false, error: 'Cannot send friend request to yourself' });
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should call send_friend_request RPC with correct parameters', async () => {
      setRpcResponse(1);

      const result = await friendsService.sendFriendRequest(mockSenderId, mockReceiverId);

      expect(mockedRpc).toHaveBeenCalledWith('send_friend_request', {
        p_sender_id: mockSenderId,
        p_receiver_id: mockReceiverId
      });
      expect(result).toEqual({ success: true });
    });

    it('should return error for already friends', async () => {
      setRpcResponse(null, { message: 'Already friends with this user' });

      const result = await friendsService.sendFriendRequest(mockSenderId, mockReceiverId);

      expect(result).toEqual({ success: false, error: 'Already friends with this user' });
    });
  });

  describe('acceptFriendRequest', () => {
    const mockRequestId = 1;
    const mockUserId = 'user-123';

    it('should return error when requestId is invalid', async () => {
      const result = await friendsService.acceptFriendRequest(0, mockUserId);
      expect(result).toEqual({ success: false, error: 'Invalid request ID or user ID' });
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should return error when userId is empty', async () => {
      const result = await friendsService.acceptFriendRequest(mockRequestId, '');
      expect(result).toEqual({ success: false, error: 'Invalid request ID or user ID' });
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should call accept_friend_request RPC with correct parameters', async () => {
      setRpcResponse(true);

      const result = await friendsService.acceptFriendRequest(mockRequestId, mockUserId);

      expect(mockedRpc).toHaveBeenCalledWith('accept_friend_request', {
        p_request_id: mockRequestId,
        p_user_id: mockUserId
      });
      expect(result).toEqual({ success: true });
    });

    it('should return error when request not found', async () => {
      setRpcResponse(false);

      const result = await friendsService.acceptFriendRequest(mockRequestId, mockUserId);

      expect(result).toEqual({ success: false, error: 'Friend request not found or already processed' });
    });
  });

  describe('rejectFriendRequest', () => {
    const mockRequestId = 1;
    const mockUserId = 'user-123';

    it('should return error when requestId is invalid', async () => {
      const result = await friendsService.rejectFriendRequest(0, mockUserId);
      expect(result).toEqual({ success: false, error: 'Invalid request ID or user ID' });
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should call reject_friend_request RPC with correct parameters', async () => {
      setRpcResponse(true);

      const result = await friendsService.rejectFriendRequest(mockRequestId, mockUserId);

      expect(mockedRpc).toHaveBeenCalledWith('reject_friend_request', {
        p_request_id: mockRequestId,
        p_user_id: mockUserId
      });
      expect(result).toEqual({ success: true });
    });

    it('should return error when request not found', async () => {
      setRpcResponse(false);

      const result = await friendsService.rejectFriendRequest(mockRequestId, mockUserId);

      expect(result).toEqual({ success: false, error: 'Friend request not found or already processed' });
    });
  });

  describe('removeFriend', () => {
    const mockUserId = 'user-123';
    const mockFriendId = 'friend-456';

    it('should return error when userId is empty', async () => {
      const result = await friendsService.removeFriend('', mockFriendId);
      expect(result).toEqual({ success: false, error: 'Invalid user IDs' });
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should return error when friendId is empty', async () => {
      const result = await friendsService.removeFriend(mockUserId, '');
      expect(result).toEqual({ success: false, error: 'Invalid user IDs' });
      expect(mockedRpc).not.toHaveBeenCalled();
    });

    it('should call remove_friendship RPC with correct parameters', async () => {
      setRpcResponse(true);

      const result = await friendsService.removeFriend(mockUserId, mockFriendId);

      expect(mockedRpc).toHaveBeenCalledWith('remove_friendship', {
        p_user_id: mockUserId,
        p_friend_id: mockFriendId
      });
      expect(result).toEqual({ success: true });
    });

    it('should return error when friendship not found', async () => {
      setRpcResponse(false);

      const result = await friendsService.removeFriend(mockUserId, mockFriendId);

      expect(result).toEqual({ success: false, error: 'Friendship not found' });
    });
  });

  describe('areFriends', () => {
    const mockUserId = 'user-123';
    const mockOtherUserId = 'other-456';

    it('should return false when userId is empty', async () => {
      const result = await friendsService.areFriends('', mockOtherUserId);
      expect(result).toBe(false);
    });

    it('should return false when otherUserId is empty', async () => {
      const result = await friendsService.areFriends(mockUserId, '');
      expect(result).toBe(false);
    });

    it('should return true when users are friends', async () => {
      const mockFriends: Friend[] = [
        {
          friend_id: mockOtherUserId,
          friend_name: 'John',
          friendship_created_at: '2024-01-01T00:00:00Z'
        }
      ];

      setRpcResponse(mockFriends);

      const result = await friendsService.areFriends(mockUserId, mockOtherUserId);

      expect(result).toBe(true);
    });

    it('should return false when users are not friends', async () => {
      setRpcResponse([]);

      const result = await friendsService.areFriends(mockUserId, mockOtherUserId);

      expect(result).toBe(false);
    });
  });

  describe('generateFriendCode', () => {
    it('should generate correct friend code from UUID', () => {
      const uuid = 'f2eca4f5-eec7-493e-896f-1779c71d9c2a';
      const result = friendsService.generateFriendCode(uuid);
      expect(result).toBe('F2ECA4F5');
    });

    it('should remove hyphens and take first 8 characters', () => {
      const uuid = '12345678-abcd-efgh-ijkl-mnopqrstuvwx';
      const result = friendsService.generateFriendCode(uuid);
      expect(result).toBe('12345678');
    });

    it('should uppercase the result', () => {
      const uuid = 'abcdefgh-1234-5678-9012-abcdefabcdef';
      const result = friendsService.generateFriendCode(uuid);
      expect(result).toBe('ABCDEFGH');
    });
  });

  describe('getFriendsCount', () => {
    it('should return correct count of friends', async () => {
      const mockFriends: Friend[] = [
        { friend_id: '1', friend_name: 'A', friendship_created_at: '' },
        { friend_id: '2', friend_name: 'B', friendship_created_at: '' },
        { friend_id: '3', friend_name: 'C', friendship_created_at: '' }
      ];

      setRpcResponse(mockFriends);

      const result = await friendsService.getFriendsCount('user-123');

      expect(result).toBe(3);
    });

    it('should return 0 when no friends', async () => {
      setRpcResponse([]);

      const result = await friendsService.getFriendsCount('user-123');

      expect(result).toBe(0);
    });
  });

  describe('getPendingRequestsCount', () => {
    it('should return correct count of pending requests', async () => {
      const mockRequests: FriendRequest[] = [
        { request_id: 1, sender_id: '1', sender_name: 'A', created_at: '' },
        { request_id: 2, sender_id: '2', sender_name: 'B', created_at: '' }
      ];

      setRpcResponse(mockRequests);

      const result = await friendsService.getPendingRequestsCount('user-123');

      expect(result).toBe(2);
    });
  });

  describe('getMyFriendCode', () => {
    it('should call get_my_friend_code RPC', async () => {
      setRpcResponse('ABC12345');

      const result = await friendsService.getMyFriendCode();

      expect(mockedRpc).toHaveBeenCalledWith('get_my_friend_code');
      expect(result).toBe('ABC12345');
    });

    it('should return null on error', async () => {
      setRpcResponse(null, { message: 'Not authenticated' });

      const result = await friendsService.getMyFriendCode();

      expect(result).toBeNull();
    });
  });
});
