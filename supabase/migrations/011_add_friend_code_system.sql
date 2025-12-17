-- Migration 011: Add Friend Code System for Easy User Discovery
-- This allows users to search by a shareable friend code based on their UUID

-- Function to generate a friendly 8-character friend code from UUID
-- Format: First 8 characters of UUID (alphanumeric)
CREATE OR REPLACE FUNCTION get_friend_code(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  -- Take first 8 characters of UUID (without hyphens) and uppercase
  RETURN UPPER(SUBSTRING(REPLACE(user_uuid::TEXT, '-', ''), 1, 8));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop the existing function to change its return type (adding friend_code column)
DROP FUNCTION IF EXISTS search_users_for_friends(UUID, TEXT, INTEGER);

-- Update search_users_for_friends to include friend code search
CREATE OR REPLACE FUNCTION search_users_for_friends(
  p_current_user_id UUID,
  p_search_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  email TEXT,
  friend_code TEXT,
  is_friend BOOLEAN,
  has_pending_request BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'username',
      split_part(au.email, '@', 1)
    )::TEXT as username,
    au.email::TEXT as email,
    get_friend_code(au.id) as friend_code,
    EXISTS(
      SELECT 1 FROM friendships f
      WHERE (f.user_id_1 = LEAST(p_current_user_id, au.id) 
             AND f.user_id_2 = GREATEST(p_current_user_id, au.id))
    ) as is_friend,
    EXISTS(
      SELECT 1 FROM friend_requests fr
      WHERE fr.sender_id = p_current_user_id 
        AND fr.receiver_id = au.id 
        AND fr.status = 'pending'
    ) as has_pending_request
  FROM auth.users au
  WHERE au.id != p_current_user_id
    AND (
      -- Search by email
      au.email ILIKE '%' || p_search_query || '%'
      -- Search by username/full name
      OR (au.raw_user_meta_data->>'full_name') ILIKE '%' || p_search_query || '%'
      OR (au.raw_user_meta_data->>'username') ILIKE '%' || p_search_query || '%'
      -- Search by friend code (case insensitive)
      OR get_friend_code(au.id) ILIKE '%' || UPPER(p_search_query) || '%'
    )
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user's friend code
CREATE OR REPLACE FUNCTION get_my_friend_code()
RETURNS TEXT AS $$
BEGIN
  RETURN get_friend_code(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

