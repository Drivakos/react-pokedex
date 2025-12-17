-- Migration 012: Fix TEXT type casts for auth.users columns
-- PostgreSQL requires explicit casts when returning VARCHAR columns as TEXT

-- Drop and recreate get_user_friends with proper TEXT casts
CREATE OR REPLACE FUNCTION get_user_friends(p_user_id UUID)
RETURNS TABLE (
  friend_id UUID,
  friend_name TEXT,
  friend_email TEXT,
  friendship_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN f.user_id_1 = p_user_id THEN f.user_id_2
      ELSE f.user_id_1
    END as friend_id,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'username',
      split_part(au.email, '@', 1)
    )::TEXT as friend_name,
    au.email::TEXT as friend_email,
    f.created_at as friendship_created_at
  FROM friendships f
  JOIN auth.users au ON (
    CASE 
      WHEN f.user_id_1 = p_user_id THEN f.user_id_2
      ELSE f.user_id_1
    END = au.id
  )
  WHERE f.user_id_1 = p_user_id OR f.user_id_2 = p_user_id
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate get_pending_friend_requests with proper TEXT casts
CREATE OR REPLACE FUNCTION get_pending_friend_requests(p_user_id UUID)
RETURNS TABLE (
  request_id INTEGER,
  sender_id UUID,
  sender_name TEXT,
  sender_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fr.id as request_id,
    fr.sender_id,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'username',
      split_part(au.email, '@', 1)
    )::TEXT as sender_name,
    au.email::TEXT as sender_email,
    fr.created_at
  FROM friend_requests fr
  JOIN auth.users au ON fr.sender_id = au.id
  WHERE fr.receiver_id = p_user_id AND fr.status = 'pending'
  ORDER BY fr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old search_users_for_friends function (with friend_code) and recreate
DROP FUNCTION IF EXISTS search_users_for_friends(UUID, TEXT, INTEGER);

-- Recreate search_users_for_friends with proper TEXT casts
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

