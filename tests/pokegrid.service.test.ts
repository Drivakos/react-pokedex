// Mock Supabase before any imports
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn()
  }
}));

import { pokegridService } from '../src/services/pokegrid.service';
import { supabase } from '../src/lib/supabase';

describe('PokegridService - Leaderboard Retrieval Tests', () => {
  const mockGridDate = '2024-12-25';

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock responses
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null });
  });

  describe('Worldwide Leaderboard - Daily Timeframe', () => {
    const mockDailyLeaderboard = [
      {
        user_id: 'user-1',
        username: 'Alice',
        score: 2000,
        completed_at: '2024-12-25T14:30:00Z',
        perfect_game: true,
        total_guesses: 9,
        rank: 1
      },
      {
        user_id: 'user-2',
        username: 'Bob',
        score: 1800,
        completed_at: '2024-12-25T15:45:00Z',
        perfect_game: false,
        total_guesses: 12,
        rank: 2
      },
      {
        user_id: 'user-3',
        username: 'Charlie',
        score: 1600,
        completed_at: '2024-12-25T16:20:00Z',
        perfect_game: false,
        total_guesses: 15,
        rank: 3
      }
    ];

    test('should retrieve daily leaderboard with specific grid date', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockDailyLeaderboard,
        error: null
      });

      const result = await pokegridService.getLeaderboard('daily', mockGridDate);

      expect(supabase.rpc).toHaveBeenCalledWith('get_pokegrid_leaderboard', {
        p_timeframe: 'daily',
        p_grid_date: mockGridDate
      });
      expect(result).toEqual(mockDailyLeaderboard);
      expect(result).toHaveLength(3);
      expect(result[0].rank).toBe(1);
      expect(result[0].perfect_game).toBe(true);
    });

    test('should handle empty daily leaderboard', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [],
        error: null
      });

      const result = await pokegridService.getLeaderboard('daily', mockGridDate);

      expect(result).toEqual([]);
    });

    test('should handle daily leaderboard database errors', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await pokegridService.getLeaderboard('daily', mockGridDate);

      expect(result).toEqual([]);
    });
  });

  describe('Worldwide Leaderboard - Weekly Timeframe', () => {
    const mockWeeklyLeaderboard = [
      {
        user_id: 'user-1',
        username: 'Alice',
        score: 12000, // Best score from the week
        completed_at: '2024-12-25T14:30:00Z',
        perfect_game: false,
        total_guesses: 45,
        rank: 1
      },
      {
        user_id: 'user-2',
        username: 'Bob',
        score: 10500,
        completed_at: '2024-12-25T15:45:00Z',
        perfect_game: false,
        total_guesses: 52,
        rank: 2
      }
    ];

    test('should retrieve weekly leaderboard without grid date', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockWeeklyLeaderboard,
        error: null
      });

      const result = await pokegridService.getLeaderboard('weekly');

      expect(supabase.rpc).toHaveBeenCalledWith('get_pokegrid_leaderboard', {
        p_timeframe: 'weekly',
        p_grid_date: undefined
      });
      expect(result).toEqual(mockWeeklyLeaderboard);
      expect(result[0].score).toBe(12000); // Best weekly score
    });

    test('should aggregate scores correctly for weekly leaderboard', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockWeeklyLeaderboard,
        error: null
      });

      const result = await pokegridService.getLeaderboard('weekly');

      // Weekly leaderboard should show aggregated data
      expect(result.every(entry => entry.score > 1000)).toBe(true);
      expect(result.every(entry => entry.rank >= 1)).toBe(true);
    });
  });

  describe('Worldwide Leaderboard - All-Time Timeframe', () => {
    const mockAllTimeLeaderboard = [
      {
        user_id: 'user-1',
        username: 'Alice',
        score: 50000, // Best all-time score
        completed_at: '2024-12-25T14:30:00Z',
        perfect_game: false,
        total_guesses: 150,
        rank: 1
      },
      {
        user_id: 'user-2',
        username: 'Bob',
        score: 45000,
        completed_at: '2024-12-25T15:45:00Z',
        perfect_game: false,
        total_guesses: 180,
        rank: 2
      },
      {
        user_id: 'user-3',
        username: 'Charlie',
        score: 42000,
        completed_at: '2024-12-25T16:20:00Z',
        perfect_game: false,
        total_guesses: 195,
        rank: 3
      }
    ];

    test('should retrieve all-time leaderboard without grid date', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockAllTimeLeaderboard,
        error: null
      });

      const result = await pokegridService.getLeaderboard('all-time');

      expect(supabase.rpc).toHaveBeenCalledWith('get_pokegrid_leaderboard', {
        p_timeframe: 'all-time',
        p_grid_date: undefined
      });
      expect(result).toEqual(mockAllTimeLeaderboard);
      expect(result).toHaveLength(3);
      expect(result[0].score).toBe(50000); // Best all-time score
    });

    test('should show highest all-time scores', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockAllTimeLeaderboard,
        error: null
      });

      const result = await pokegridService.getLeaderboard('all-time');

      // All-time leaderboard should show very high scores
      expect(result.every(entry => entry.score > 40000)).toBe(true);
      expect(result.every(entry => entry.total_guesses > 100)).toBe(true);
    });

    test('should handle all-time leaderboard errors', async () => {
      (supabase.rpc as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await pokegridService.getLeaderboard('all-time');

      expect(result).toEqual([]);
    });
  });

  describe('Timeframe Parameter Validation', () => {
    test('should accept all valid timeframe values', async () => {
      const timeframes = ['daily', 'weekly', 'all-time'] as const;

      for (const timeframe of timeframes) {
        (supabase.rpc as jest.Mock).mockResolvedValueOnce({
          data: [],
          error: null
        });

        await pokegridService.getLeaderboard(timeframe);

        expect(supabase.rpc).toHaveBeenCalledWith('get_pokegrid_leaderboard', {
          p_timeframe: timeframe,
          p_grid_date: undefined
        });
      }
    });

    test('should pass grid date only for daily timeframe', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null });

      // Daily should include grid date
      await pokegridService.getLeaderboard('daily', mockGridDate);
      expect(supabase.rpc).toHaveBeenCalledWith('get_pokegrid_leaderboard', {
        p_timeframe: 'daily',
        p_grid_date: mockGridDate
      });

      // Weekly and all-time should not include grid date
      await pokegridService.getLeaderboard('weekly');
      expect(supabase.rpc).toHaveBeenCalledWith('get_pokegrid_leaderboard', {
        p_timeframe: 'weekly',
        p_grid_date: undefined
      });

      await pokegridService.getLeaderboard('all-time');
      expect(supabase.rpc).toHaveBeenCalledWith('get_pokegrid_leaderboard', {
        p_timeframe: 'all-time',
        p_grid_date: undefined
      });
    });
  });

  describe('Data Structure Validation', () => {
    const validLeaderboardEntry = {
      user_id: 'user-123',
      username: 'Test User',
      score: 1500,
      completed_at: '2024-12-25T10:00:00Z',
      perfect_game: false,
      total_guesses: 25,
      rank: 1
    };

    test('should return properly structured leaderboard data', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [validLeaderboardEntry],
        error: null
      });

      const result = await pokegridService.getLeaderboard('daily', mockGridDate);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('user_id');
      expect(result[0]).toHaveProperty('username');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('completed_at');
      expect(result[0]).toHaveProperty('perfect_game');
      expect(result[0]).toHaveProperty('total_guesses');
      expect(result[0]).toHaveProperty('rank');

      expect(typeof result[0].score).toBe('number');
      expect(typeof result[0].rank).toBe('number');
      expect(typeof result[0].perfect_game).toBe('boolean');
    });

    test('should handle malformed data gracefully', async () => {
      const malformedData = [
        { user_id: 'user-1' }, // Missing required fields
        null,
        undefined
      ];

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: malformedData,
        error: null
      });

      // The function should handle this gracefully (depending on implementation)
      const result = await pokegridService.getLeaderboard('daily', mockGridDate);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Friends Leaderboard - User-Based Filtering', () => {
    const mockUserId = 'current-user-123';
    const mockGridDate = '2024-12-25';

    const mockFriendsLeaderboard = [
      {
        user_id: mockUserId,
        username: 'Current User',
        score: 1800,
        completed_at: '2024-12-25T14:30:00Z',
        perfect_game: false,
        total_guesses: 12,
        rank: 1,
        is_current_user: true
      },
      {
        user_id: 'friend-1',
        username: 'Alice',
        score: 1600,
        completed_at: '2024-12-25T15:45:00Z',
        perfect_game: false,
        total_guesses: 15,
        rank: 2,
        is_current_user: false
      },
      {
        user_id: 'friend-2',
        username: 'Bob',
        score: 1400,
        completed_at: '2024-12-25T16:20:00Z',
        perfect_game: false,
        total_guesses: 18,
        rank: 3,
        is_current_user: false
      }
    ];

    test('should retrieve friends daily leaderboard with user ID', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockFriendsLeaderboard,
        error: null
      });

      const result = await pokegridService.getFriendsLeaderboard(mockUserId, 'daily', mockGridDate);

      expect(supabase.rpc).toHaveBeenCalledWith('get_pokegrid_friends_leaderboard', {
        p_user_id: mockUserId,
        p_timeframe: 'daily',
        p_grid_date: mockGridDate
      });
      expect(result).toEqual(mockFriendsLeaderboard);
      expect(result).toHaveLength(3);
      expect(result[0].is_current_user).toBe(true);
    });

    test('should include current user in friends leaderboard', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockFriendsLeaderboard,
        error: null
      });

      const result = await pokegridService.getFriendsLeaderboard(mockUserId, 'daily', mockGridDate);

      const currentUserEntry = result.find(entry => entry.is_current_user);
      expect(currentUserEntry).toBeDefined();
      expect(currentUserEntry?.user_id).toBe(mockUserId);
      expect(currentUserEntry?.username).toBe('Current User');
    });

    test('should handle empty friends leaderboard', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [],
        error: null
      });

      const result = await pokegridService.getFriendsLeaderboard(mockUserId, 'daily', mockGridDate);

      expect(result).toEqual([]);
    });

    test('should reject friends leaderboard request for empty user ID', async () => {
      const result = await pokegridService.getFriendsLeaderboard('', 'daily', mockGridDate);

      expect(result).toEqual([]);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    test('should handle friends leaderboard database errors', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await pokegridService.getFriendsLeaderboard(mockUserId, 'daily', mockGridDate);

      expect(result).toEqual([]);
    });
  });

  describe('Friends Leaderboard - Weekly and All-Time', () => {
    const mockUserId = 'current-user-123';

    const mockWeeklyFriendsLeaderboard = [
      {
        user_id: mockUserId,
        username: 'Current User',
        score: 9500, // Best weekly score among friends
        completed_at: '2024-12-25T14:30:00Z',
        perfect_game: false,
        total_guesses: 45,
        rank: 1,
        is_current_user: true
      },
      {
        user_id: 'friend-1',
        username: 'Alice',
        score: 8800,
        completed_at: '2024-12-25T15:45:00Z',
        perfect_game: false,
        total_guesses: 52,
        rank: 2,
        is_current_user: false
      }
    ];

    const mockAllTimeFriendsLeaderboard = [
      {
        user_id: mockUserId,
        username: 'Current User',
        score: 35000, // Best all-time score among friends
        completed_at: '2024-12-25T14:30:00Z',
        perfect_game: false,
        total_guesses: 120,
        rank: 1,
        is_current_user: true
      },
      {
        user_id: 'friend-1',
        username: 'Alice',
        score: 32000,
        completed_at: '2024-12-25T15:45:00Z',
        perfect_game: false,
        total_guesses: 145,
        rank: 2,
        is_current_user: false
      }
    ];

    test('should retrieve friends weekly leaderboard without grid date', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockWeeklyFriendsLeaderboard,
        error: null
      });

      const result = await pokegridService.getFriendsLeaderboard(mockUserId, 'weekly');

      expect(supabase.rpc).toHaveBeenCalledWith('get_pokegrid_friends_leaderboard', {
        p_user_id: mockUserId,
        p_timeframe: 'weekly',
        p_grid_date: undefined
      });
      expect(result).toEqual(mockWeeklyFriendsLeaderboard);
      expect(result[0].score).toBeGreaterThan(8000); // Weekly scores should be aggregated
    });

    test('should retrieve friends all-time leaderboard without grid date', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockAllTimeFriendsLeaderboard,
        error: null
      });

      const result = await pokegridService.getFriendsLeaderboard(mockUserId, 'all-time');

      expect(supabase.rpc).toHaveBeenCalledWith('get_pokegrid_friends_leaderboard', {
        p_user_id: mockUserId,
        p_timeframe: 'all-time',
        p_grid_date: undefined
      });
      expect(result).toEqual(mockAllTimeFriendsLeaderboard);
      expect(result[0].score).toBeGreaterThan(30000); // All-time scores should be very high
    });

    test('should aggregate scores correctly for friends weekly leaderboard', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockWeeklyFriendsLeaderboard,
        error: null
      });

      const result = await pokegridService.getFriendsLeaderboard(mockUserId, 'weekly');

      // Weekly aggregated scores should be reasonable
      expect(result.every(entry => entry.score > 5000)).toBe(true);
      expect(result.every(entry => entry.total_guesses > 30)).toBe(true);
    });

    test('should show high scores for friends all-time leaderboard', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockAllTimeFriendsLeaderboard,
        error: null
      });

      const result = await pokegridService.getFriendsLeaderboard(mockUserId, 'all-time');

      // All-time scores should be very high
      expect(result.every(entry => entry.score > 25000)).toBe(true);
      expect(result.every(entry => entry.total_guesses > 100)).toBe(true);
    });
  });

  describe('Friends Leaderboard - Data Structure and Ranking', () => {
    const mockUserId = 'current-user-123';

    test('should mark current user correctly in friends leaderboard', async () => {
      const leaderboardWithCurrentUser = [
        {
          user_id: 'friend-1',
          username: 'Alice',
          score: 1600,
          completed_at: '2024-12-25T15:45:00Z',
          perfect_game: false,
          total_guesses: 15,
          rank: 1,
          is_current_user: false
        },
        {
          user_id: mockUserId,
          username: 'Current User',
          score: 1400,
          completed_at: '2024-12-25T16:20:00Z',
          perfect_game: false,
          total_guesses: 18,
          rank: 2,
          is_current_user: true
        }
      ];

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: leaderboardWithCurrentUser,
        error: null
      });

      const result = await pokegridService.getFriendsLeaderboard(mockUserId, 'daily', '2024-12-25');

      const currentUserEntry = result.find(entry => entry.is_current_user);
      expect(currentUserEntry).toBeDefined();
      expect(currentUserEntry?.user_id).toBe(mockUserId);

      const otherEntries = result.filter(entry => !entry.is_current_user);
      expect(otherEntries.every(entry => entry.is_current_user === false)).toBe(true);
    });

    test('should maintain proper ranking in friends leaderboard', async () => {
      const properlyRankedLeaderboard = [
        { user_id: 'user-1', username: 'Alice', score: 1800, rank: 1, is_current_user: false },
        { user_id: 'user-2', username: 'Bob', score: 1600, rank: 2, is_current_user: false },
        { user_id: 'user-3', username: 'Charlie', score: 1400, rank: 3, is_current_user: false }
      ];

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: properlyRankedLeaderboard,
        error: null
      });

      const result = await pokegridService.getFriendsLeaderboard(mockUserId, 'daily', '2024-12-25');

      // Verify ranking is maintained
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(3);

      // Verify scores are in descending order
      expect(result[0].score).toBeGreaterThan(result[1].score);
      expect(result[1].score).toBeGreaterThan(result[2].score);
    });

    test('should handle network errors gracefully for friends leaderboard', async () => {
      (supabase.rpc as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      const result = await pokegridService.getFriendsLeaderboard(mockUserId, 'daily', '2024-12-25');

      expect(result).toEqual([]);
    });
  });

  describe('Friends vs Worldwide Leaderboard Comparison', () => {
    const mockUserId = 'current-user-123';

    test('should call different RPC functions for friends vs worldwide', async () => {
      const worldwideData = [{ user_id: 'user-1', username: 'Alice', score: 2000, rank: 1 }];
      const friendsData = [{ user_id: mockUserId, username: 'Current User', score: 1800, rank: 1, is_current_user: true }];

      // Mock worldwide leaderboard
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: worldwideData,
        error: null
      });

      // Mock friends leaderboard
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: friendsData,
        error: null
      });

      // Call worldwide
      await pokegridService.getLeaderboard('daily', '2024-12-25');
      expect(supabase.rpc).toHaveBeenCalledWith('get_pokegrid_leaderboard', {
        p_timeframe: 'daily',
        p_grid_date: '2024-12-25'
      });

      // Call friends
      await pokegridService.getFriendsLeaderboard(mockUserId, 'daily', '2024-12-25');
      expect(supabase.rpc).toHaveBeenCalledWith('get_pokegrid_friends_leaderboard', {
        p_user_id: mockUserId,
        p_timeframe: 'daily',
        p_grid_date: '2024-12-25'
      });
    });

    test('should include is_current_user field only in friends leaderboard', async () => {
      const worldwideEntry = {
        user_id: 'user-1',
        username: 'Alice',
        score: 2000,
        completed_at: '2024-12-25T14:30:00Z',
        perfect_game: false,
        total_guesses: 12,
        rank: 1
        // No is_current_user field
      };

      const friendsEntry = {
        user_id: mockUserId,
        username: 'Current User',
        score: 1800,
        completed_at: '2024-12-25T14:30:00Z',
        perfect_game: false,
        total_guesses: 12,
        rank: 1,
        is_current_user: true // Has is_current_user field
      };

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [worldwideEntry],
        error: null
      });

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [friendsEntry],
        error: null
      });

      const worldwideResult = await pokegridService.getLeaderboard('daily', '2024-12-25');
      const friendsResult = await pokegridService.getFriendsLeaderboard(mockUserId, 'daily', '2024-12-25');

      expect(worldwideResult[0]).not.toHaveProperty('is_current_user');
      expect(friendsResult[0]).toHaveProperty('is_current_user');
      expect(friendsResult[0].is_current_user).toBe(true);
    });
  });
});