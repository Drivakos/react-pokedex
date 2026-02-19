import { supabase } from '../lib/supabase';

export interface Friend {
  friend_id: string;
  friend_name: string;
  friendship_created_at: string;
}

export interface FriendRequest {
  request_id: number;
  sender_id: string;
  sender_name: string;
  created_at: string;
}

export interface UserSearchResult {
  user_id: string;
  username: string;
  friend_code: string;
  is_friend: boolean;
  has_pending_request: boolean;
}

class FriendsService {
  private cache: Record<string, { data: any; timestamp: number }> = {};
  private CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  private getFromCache(key: string) {
    const cached = this.cache[key];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setInCache(key: string, data: any) {
    this.cache[key] = { data, timestamp: Date.now() };
  }

  public clearCache(keyPrefix?: string) {
    if (keyPrefix) {
      Object.keys(this.cache).forEach(key => {
        if (key.startsWith(keyPrefix)) {
          delete this.cache[key];
        }
      });
    } else {
      this.cache = {};
    }
  }

  /**
   * Get the current user's friends list
   */
  async getFriends(userId: string): Promise<Friend[]> {
    if (!userId) return [];

    const cacheKey = `friends_${userId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_user_friends', {
        p_user_id: userId
      });

      const result = data || [];
      if (!error) {
        this.setInCache(cacheKey, result);
      }

      return result;
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

    const cacheKey = `requests_${userId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_pending_friend_requests', {
        p_user_id: userId
      });

      const result = data || [];
      if (!error) {
        this.setInCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Error in getPendingRequests:', error);
      return [];
    }
  }

  /**
   * Search for users by email or username
   */
  async searchUsers(currentUserId: string, query: string, limit: number = 20, signal?: AbortSignal): Promise<UserSearchResult[]> {
    if (!currentUserId || !query || query.trim().length === 0) return [];

    try {
      const { data, error } = await supabase.rpc('search_users_for_friends', {
        p_current_user_id: currentUserId,
        p_search_query: query.trim(),
        p_limit: limit
      }).abortSignal(signal as any);

      if (error) {
        if (error.message?.includes('AbortError')) throw error;
        console.error('Error searching users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      if ((error as any).name === 'AbortError') throw error;
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
      const { error } = await supabase.rpc('send_friend_request', {
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

      // Clear cache to force refresh
      this.clearCache(userId);

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

      // Clear cache
      this.clearCache(userId);

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
      const { data: result, error } = await supabase.rpc('remove_friendship', {
        p_user_id: userId,
        p_friend_id: friendId
      });

      if (error) {
        console.error('Error removing friend:', error);
        return { success: false, error: error.message || 'Failed to remove friend' };
      }

      // result is a boolean indicating success
      if (result === false) {
        return { success: false, error: 'Friendship not found' };
      }

      // Clear cache
      this.clearCache(userId);

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

  /**
   * Get the current user's friend code
   */
  async getMyFriendCode(): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('get_my_friend_code');

      if (error) {
        console.error('Error fetching friend code:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error in getMyFriendCode:', error);
      return null;
    }
  }

  /**
   * Generate friend code from UUID (client-side fallback)
   */
  generateFriendCode(userId: string): string {
    // Take first 8 characters of UUID (without hyphens) and uppercase
    return userId.replace(/-/g, '').substring(0, 8).toUpperCase();
  }

  /**
   * Get detailed friend data including favorites and game stats
   */
  async getFriendsWithDetails(userId: string): Promise<FriendWithDetails[]> {
    if (!userId) return [];

    try {
      const friends = await this.getFriends(userId);

      // Get additional details for each friend
      const friendsWithDetails = await Promise.all(
        friends.map(async (friend) => {
          const [favorites, gameStats] = await Promise.all([
            this.getFriendFavorites(friend.friend_id),
            this.getFriendGameStats(friend.friend_id)
          ]);

          return {
            ...friend,
            favorites,
            gameStats
          };
        })
      );

      return friendsWithDetails;
    } catch (error) {
      console.error('Error in getFriendsWithDetails:', error);
      return [];
    }
  }

  /**
   * Get a friend's favorite Pokémon
   */
  private async getFriendFavorites(friendId: string): Promise<number[]> {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('pokemon_id')
        .eq('user_id', friendId)
        .order('created_at', { ascending: false })
        .limit(6); // Get top 6 favorites

      if (error) {
        console.error('Error fetching friend favorites:', error);
        return [];
      }

      return data?.map(f => f.pokemon_id) || [];
    } catch (error) {
      console.error('Error in getFriendFavorites:', error);
      return [];
    }
  }

  /**
   * Get a friend's game statistics
   */
  private async getFriendGameStats(friendId: string): Promise<GameStats> {
    try {
      // Get PokéGrid stats
      const { data: pokegridData, error: pokegridError } = await supabase
        .from('pokegrid_progress')
        .select('score, completed, total_guesses, game_data')
        .eq('user_id', friendId)
        .order('grid_date', { ascending: false });

      if (pokegridError) {
        console.error('Error fetching pokegrid stats:', pokegridError);
      }

      const completedGames = pokegridData?.filter(g => g.completed).length || 0;
      const totalScore = pokegridData?.reduce((sum, g) => sum + (g.score || 0), 0) || 0;
      const perfectGames = pokegridData?.filter(g => g.game_data?.perfectGame).length || 0;
      const bestScore = pokegridData?.reduce((max, g) => Math.max(max, g.score || 0), 0) || 0;

      return {
        pokegrid: {
          totalGames: pokegridData?.length || 0,
          completedGames,
          totalScore,
          bestScore,
          perfectGames
        }
      };
    } catch (error) {
      console.error('Error in getFriendGameStats:', error);
      return {
        pokegrid: {
          totalGames: 0,
          completedGames: 0,
          totalScore: 0,
          bestScore: 0,
          perfectGames: 0
        }
      };
    }
  }
}

export interface GameStats {
  pokegrid: {
    totalGames: number;
    completedGames: number;
    totalScore: number;
    bestScore: number;
    perfectGames: number;
  };
}

export interface FriendWithDetails extends Friend {
  favorites: number[];
  gameStats: GameStats;
}

export const friendsService = new FriendsService();

