/**
 * Friends Database Integration Tests
 * Tests for the friends system database functions
 * 
 * These tests run against the local Supabase database
 * Requires: npx supabase start
 * 
 * Run with: npm test -- --testPathPattern="friends-database"
 */

// Local Supabase connection
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Check if local Supabase is running
const checkSupabaseRunning = async () => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { 'apikey': SUPABASE_ANON_KEY }
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Simple HTTP client for RPC calls (avoids Supabase client issues in Jest)
const rpc = async (functionName, params = {}) => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(params)
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    return { data: null, error: data };
  }
  
  return { data, error: null };
};

// Simple HTTP client for table operations
const from = (table) => ({
  async insert(data) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    return { data: result, error: response.ok ? null : result };
  },
  
  async delete() {
    return {
      neq: async (column, value) => {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=neq.${value}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        return { error: response.ok ? null : await response.json() };
      }
    };
  },
  
  async select(columns = '*') {
    return {
      eq: async (column, value) => {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/${table}?select=${columns}&${column}=eq.${value}`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            }
          }
        );
        const data = await response.json();
        return { 
          data, 
          error: response.ok ? null : data,
          single: () => ({ data: data[0], error: response.ok ? null : data })
        };
      }
    };
  }
});

describe('Friends Database Functions', () => {
  let isRunning = false;
  let existingUserId = null;
  
  // Test user UUIDs (we'll create these via auth.users if needed)
  const testUser1Id = '11111111-1111-1111-1111-111111111111';
  const testUser2Id = '22222222-2222-2222-2222-222222222222';
  const testUser3Id = '33333333-3333-3333-3333-333333333333';

  beforeAll(async () => {
    isRunning = await checkSupabaseRunning();
    
    if (!isRunning) {
      console.warn('\n⚠️  Local Supabase is not running. Skipping integration tests.');
      console.warn('   Run "npx supabase start" to enable these tests.\n');
      return;
    }

    // Try to get an existing user from auth.users to use in tests that need real users
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_user_friends?p_user_id=00000000-0000-0000-0000-000000000000`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_user_id: testUser1Id })
      });
    } catch (e) {
      // Ignore
    }
  });

  // Helper to skip test if Supabase not running
  const skipIfNotRunning = () => {
    if (!isRunning) {
      return true;
    }
    return false;
  };

  describe('get_friend_code function', () => {
    it('should generate friend code from UUID', async () => {
      if (skipIfNotRunning()) return;

      const { data, error } = await rpc('get_friend_code', {
        user_uuid: testUser1Id
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(typeof data).toBe('string');
      expect(data.length).toBe(8);
      expect(data).toBe(data.toUpperCase());
    });

    it('should generate consistent friend codes', async () => {
      if (skipIfNotRunning()) return;

      const result1 = await rpc('get_friend_code', { user_uuid: testUser1Id });
      const result2 = await rpc('get_friend_code', { user_uuid: testUser1Id });

      expect(result1.data).toBe(result2.data);
    });

    it('should generate different codes for different users', async () => {
      if (skipIfNotRunning()) return;

      const result1 = await rpc('get_friend_code', { user_uuid: testUser1Id });
      const result2 = await rpc('get_friend_code', { user_uuid: testUser2Id });

      expect(result1.data).not.toBe(result2.data);
    });

    it('should generate code matching first 8 chars of UUID without hyphens', async () => {
      if (skipIfNotRunning()) return;

      const { data } = await rpc('get_friend_code', { user_uuid: testUser1Id });
      
      // testUser1Id = '11111111-1111-1111-1111-111111111111'
      // Without hyphens: '11111111111111111111111111111111'
      // First 8 uppercase: '11111111'
      expect(data).toBe('11111111');
    });
  });

  describe('Friend request flow (requires real auth.users)', () => {
    // NOTE: These tests require actual users in auth.users due to foreign key constraints.
    // They will be skipped if test users don't exist in the database.
    // To run these tests fully, create test users via Supabase Auth first.
    
    beforeEach(async () => {
      if (skipIfNotRunning()) return;
      
      // Clean up tables before each test
      const deleteRequests = await from('friend_requests').delete();
      await deleteRequests.neq('id', 0);
      
      const deleteFriendships = await from('friendships').delete();
      await deleteFriendships.neq('id', 0);
    });

    it('send_friend_request should fail with FK error for non-existent users (expected)', async () => {
      if (skipIfNotRunning()) return;

      const { data, error } = await rpc('send_friend_request', {
        p_sender_id: testUser1Id,
        p_receiver_id: testUser2Id
      });

      // We expect a foreign key error since these users don't exist in auth.users
      // This test validates the FK constraint is working
      expect(error).toBeDefined();
      expect(error.code).toBe('23503'); // FK violation
    });

    it('accept_friend_request should return false for non-existent request', async () => {
      if (skipIfNotRunning()) return;

      const { data, error } = await rpc('accept_friend_request', {
        p_request_id: 99999,
        p_user_id: testUser2Id
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('reject_friend_request should return false for non-existent request', async () => {
      if (skipIfNotRunning()) return;

      const { data, error } = await rpc('reject_friend_request', {
        p_request_id: 99999,
        p_user_id: testUser2Id
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });
  });

  describe('Friendship management', () => {
    // NOTE: friendships table also has FK constraints to auth.users
    // These tests verify the function behavior with non-existent friendships
    
    beforeEach(async () => {
      if (skipIfNotRunning()) return;
      
      const deleteRequests = await from('friend_requests').delete();
      await deleteRequests.neq('id', 0);
      
      const deleteFriendships = await from('friendships').delete();
      await deleteFriendships.neq('id', 0);
    });

    it('remove_friendship should return false for non-existent friendship', async () => {
      if (skipIfNotRunning()) return;

      const { data, error } = await rpc('remove_friendship', {
        p_user_id: testUser1Id,
        p_friend_id: testUser3Id
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('remove_friendship function exists and is callable', async () => {
      if (skipIfNotRunning()) return;

      // Just verify the function exists and returns a boolean
      const { data, error } = await rpc('remove_friendship', {
        p_user_id: testUser1Id,
        p_friend_id: testUser2Id
      });

      expect(error).toBeNull();
      expect(typeof data).toBe('boolean');
    });
  });

  describe('Query functions', () => {
    beforeEach(async () => {
      if (skipIfNotRunning()) return;
      
      const deleteRequests = await from('friend_requests').delete();
      await deleteRequests.neq('id', 0);
      
      const deleteFriendships = await from('friendships').delete();
      await deleteFriendships.neq('id', 0);
    });

    it('get_user_friends should return empty array for user with no friends', async () => {
      if (skipIfNotRunning()) return;

      const { data, error } = await rpc('get_user_friends', {
        p_user_id: testUser1Id
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('get_pending_friend_requests should return empty array for user with no requests', async () => {
      if (skipIfNotRunning()) return;

      const { data, error } = await rpc('get_pending_friend_requests', {
        p_user_id: testUser1Id
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });
  });
});
