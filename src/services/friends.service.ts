import { supabase } from '../lib/supabase';

export interface Friend {
  friend_id: string;
  friend_name: string;
  friend_email: string;
  friendship_created_at: string;
}

export interface FriendRequest {
  request_id: number;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  created_at: string;
}

export interface UserSearchResult {
  user_id: string;
  username: string;
  email: string;
  is_friend: boolean;
  has_pending_request: boolean;
}

class FriendsService {
  /**
   * Get the current user's friends list
   */
  async getFriends(userId: string): Promise<Friend[]> {
    if (!userId) return [];

    try {
      const { data, error } = await supabase.rpc('get_user_friends', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching friends:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getFriends:', error);
      return [];
    }
  }

  /**
   * Get pending friend requests for the current user
   */
  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    if (!userId) return [];

    try {
      const { data, error } = await supabase.rpc('get_pending_friend_requests', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching pending requests:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPendingRequests:', error);
      return [];
    }
  }

  /**
   * Search for users by email or username
   */
  async searchUsers(currentUserId: string, query: string, limit: number = 20): Promise<UserSearchResult[]> {
    if (!currentUserId || !query || query.trim().length === 0) return [];

    try {
      const { data, error } = await supabase.rpc('search_users_for_friends', {
        p_current_user_id: currentUserId,
        p_search_query: query.trim(),
        p_limit: limit
      });

      if (error) {
        console.error('Error searching users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchUsers:', error);
      return [];
    }
  }

  /**
   * Send a friend request to another user
   */
  async sendFriendRequest(senderId: string, receiverId: string): Promise<{ success: boolean; error?: string }> {
    if (!senderId || !receiverId) {
      return { success: false, error: 'Invalid user IDs' };
    }

    if (senderId === receiverId) {
      return { success: false, error: 'Cannot send friend request to yourself' };
    }

    try {
      const { data, error } = await supabase.rpc('send_friend_request', {
        p_sender_id: senderId,
        p_receiver_id: receiverId
      });

      if (error) {
        if (error.message?.includes('Already friends')) {
          return { success: false, error: 'Already friends with this user' };
        }
        console.error('Error sending friend request:', error);
        return { success: false, error: error.message || 'Failed to send friend request' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in sendFriendRequest:', error);
      return { success: false, error: error.message || 'Failed to send friend request' };
    }
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(requestId: number, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!requestId || !userId) {
      return { success: false, error: 'Invalid request ID or user ID' };
    }

    try {
      const { data, error } = await supabase.rpc('accept_friend_request', {
        p_request_id: requestId,
        p_user_id: userId
      });

      if (error) {
        console.error('Error accepting friend request:', error);
        return { success: false, error: error.message || 'Failed to accept friend request' };
      }

      // data is a boolean indicating success
      if (data === false) {
        return { success: false, error: 'Friend request not found or already processed' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in acceptFriendRequest:', error);
      return { success: false, error: error.message || 'Failed to accept friend request' };
    }
  }

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(requestId: number, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!requestId || !userId) {
      return { success: false, error: 'Invalid request ID or user ID' };
    }

    try {
      const { data, error } = await supabase.rpc('reject_friend_request', {
        p_request_id: requestId,
        p_user_id: userId
      });

      if (error) {
        console.error('Error rejecting friend request:', error);
        return { success: false, error: error.message || 'Failed to reject friend request' };
      }

      // data is a boolean indicating success
      if (data === false) {
        return { success: false, error: 'Friend request not found or already processed' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in rejectFriendRequest:', error);
      return { success: false, error: error.message || 'Failed to reject friend request' };
    }
  }

  /**
   * Remove a friend (unfriend)
   */
  async removeFriend(userId: string, friendId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || !friendId) {
      return { success: false, error: 'Invalid user IDs' };
    }

    try {
      const { data, error } = await supabase.rpc('remove_friendship', {
        p_user_id: userId,
        p_friend_id: friendId
      });

      if (error) {
        console.error('Error removing friend:', error);
        return { success: false, error: error.message || 'Failed to remove friend' };
      }

      // data is a boolean indicating success
      if (data === false) {
        return { success: false, error: 'Friendship not found' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in removeFriend:', error);
      return { success: false, error: error.message || 'Failed to remove friend' };
    }
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId: string, otherUserId: string): Promise<boolean> {
    if (!userId || !otherUserId) return false;

    const friends = await this.getFriends(userId);
    return friends.some(friend => friend.friend_id === otherUserId);
  }

  /**
   * Get the count of friends for a user
   */
  async getFriendsCount(userId: string): Promise<number> {
    const friends = await this.getFriends(userId);
    return friends.length;
  }

  /**
   * Get the count of pending friend requests
   */
  async getPendingRequestsCount(userId: string): Promise<number> {
    const requests = await this.getPendingRequests(userId);
    return requests.length;
  }
}

export const friendsService = new FriendsService();

