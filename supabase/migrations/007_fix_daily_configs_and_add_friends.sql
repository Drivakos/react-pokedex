-- Migration 007: Fix daily grid configurations and add friends system

-- =====================================================
-- Part 1: Fix Daily Grid Configuration System
-- =====================================================

-- Drop the existing table if schema needs updating
-- (Keep data if it exists)
-- The table already exists from migration 005, we just need to add RPC functions

-- Create RPC function to get grid configuration
CREATE OR REPLACE FUNCTION get_pokegrid_configuration(p_grid_date DATE)
RETURNS TABLE (
  id INTEGER,
  grid_date DATE,
  row_constraints JSONB,
  col_constraints JSONB,
  configuration JSONB,
  difficulty_level VARCHAR(20),
  generation_seed VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pdc.id,
    pdc.grid_date,
    pdc.row_constraints,
    pdc.col_constraints,
    -- Build full configuration object
    jsonb_build_object(
      'rows', pdc.row_constraints,
      'cols', pdc.col_constraints
    ) as configuration,
    COALESCE(pdc.difficulty_level, 'medium')::VARCHAR(20) as difficulty_level,
    COALESCE(pdc.generation_seed, '')::VARCHAR(100) as generation_seed,
    pdc.created_at
  FROM pokegrid_daily_configs pdc
  WHERE pdc.grid_date = p_grid_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add missing columns to pokegrid_daily_configs if they don't exist
ALTER TABLE pokegrid_daily_configs 
  ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS generation_seed VARCHAR(100);

-- Create RPC function to save grid configuration
CREATE OR REPLACE FUNCTION save_pokegrid_configuration(
  p_grid_date DATE,
  p_configuration JSONB,
  p_difficulty_level VARCHAR(20) DEFAULT 'medium',
  p_generation_seed VARCHAR(100) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  config_id INTEGER;
BEGIN
  INSERT INTO pokegrid_daily_configs (
    grid_date,
    row_constraints,
    col_constraints,
    difficulty_level,
    generation_seed
  ) VALUES (
    p_grid_date,
    p_configuration->'rows',
    p_configuration->'cols',
    p_difficulty_level,
    p_generation_seed
  )
  ON CONFLICT (grid_date)
  DO UPDATE SET
    row_constraints = EXCLUDED.row_constraints,
    col_constraints = EXCLUDED.col_constraints,
    difficulty_level = EXCLUDED.difficulty_level,
    generation_seed = EXCLUDED.generation_seed
  RETURNING id INTO config_id;

  RETURN config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Part 2: Friends System
-- =====================================================

-- Create friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id SERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate requests
  UNIQUE(sender_id, receiver_id),
  -- Prevent self-friending
  CHECK (sender_id != receiver_id)
);

-- Create friendships table (for accepted friends)
CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure user_id_1 < user_id_2 for consistent ordering
  CHECK (user_id_1 < user_id_2),
  -- Prevent duplicate friendships
  UNIQUE(user_id_1, user_id_2)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_1 ON friendships(user_id_1);
CREATE INDEX IF NOT EXISTS idx_friendships_user_2 ON friendships(user_id_2);

-- Enable RLS for friend requests
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view friend requests involving them" ON friend_requests;
DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can update friend requests they received" ON friend_requests;

-- RLS policies for friend_requests
CREATE POLICY "Users can view friend requests involving them" ON friend_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests" ON friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update friend requests they received" ON friend_requests
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Enable RLS for friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;

-- RLS policies for friendships
CREATE POLICY "Users can view their friendships" ON friendships
  FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can delete their friendships" ON friendships
  FOR DELETE USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- =====================================================
-- Part 3: Friend Request Functions
-- =====================================================

-- Function to send friend request
CREATE OR REPLACE FUNCTION send_friend_request(
  p_sender_id UUID,
  p_receiver_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  request_id INTEGER;
  existing_friendship BOOLEAN;
BEGIN
  -- Check if they're already friends
  SELECT EXISTS(
    SELECT 1 FROM friendships 
    WHERE (user_id_1 = LEAST(p_sender_id, p_receiver_id) 
           AND user_id_2 = GREATEST(p_sender_id, p_receiver_id))
  ) INTO existing_friendship;
  
  IF existing_friendship THEN
    RAISE EXCEPTION 'Already friends';
  END IF;

  -- Insert or update friend request
  INSERT INTO friend_requests (sender_id, receiver_id, status)
  VALUES (p_sender_id, p_receiver_id, 'pending')
  ON CONFLICT (sender_id, receiver_id) 
  DO UPDATE SET 
    status = 'pending',
    updated_at = NOW()
  RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept friend request
CREATE OR REPLACE FUNCTION accept_friend_request(
  p_request_id INTEGER,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  req RECORD;
BEGIN
  -- Get the request
  SELECT * INTO req FROM friend_requests 
  WHERE id = p_request_id AND receiver_id = p_user_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update request status
  UPDATE friend_requests 
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_request_id;
  
  -- Create friendship (ensure user_id_1 < user_id_2)
  INSERT INTO friendships (user_id_1, user_id_2)
  VALUES (LEAST(req.sender_id, req.receiver_id), GREATEST(req.sender_id, req.receiver_id))
  ON CONFLICT (user_id_1, user_id_2) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject friend request
CREATE OR REPLACE FUNCTION reject_friend_request(
  p_request_id INTEGER,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE friend_requests 
  SET status = 'rejected', updated_at = NOW()
  WHERE id = p_request_id AND receiver_id = p_user_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove friendship
CREATE OR REPLACE FUNCTION remove_friendship(
  p_user_id UUID,
  p_friend_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM friendships 
  WHERE (user_id_1 = LEAST(p_user_id, p_friend_id) 
         AND user_id_2 = GREATEST(p_user_id, p_friend_id));
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's friends
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
    ) as friend_name,
    au.email as friend_email,
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

-- Function to get pending friend requests for a user
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
    ) as sender_name,
    au.email as sender_email,
    fr.created_at
  FROM friend_requests fr
  JOIN auth.users au ON fr.sender_id = au.id
  WHERE fr.receiver_id = p_user_id AND fr.status = 'pending'
  ORDER BY fr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Part 4: Enhanced Leaderboard with Friends Support
-- =====================================================

-- Function to get friends-only leaderboard
CREATE OR REPLACE FUNCTION get_pokegrid_friends_leaderboard(
  p_user_id UUID,
  p_timeframe TEXT,
  p_grid_date DATE DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  score INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  perfect_game BOOLEAN,
  total_guesses INTEGER,
  rank BIGINT,
  is_current_user BOOLEAN
) AS $$
BEGIN
  -- Get list of friends
  WITH user_friends AS (
    SELECT 
      CASE 
        WHEN f.user_id_1 = p_user_id THEN f.user_id_2
        ELSE f.user_id_1
      END as friend_id
    FROM friendships f
    WHERE f.user_id_1 = p_user_id OR f.user_id_2 = p_user_id
  ),
  friends_and_self AS (
    SELECT friend_id as user_id FROM user_friends
    UNION
    SELECT p_user_id as user_id
  )
  
  -- Now get leaderboard filtered by friends
  IF p_timeframe = 'daily' AND p_grid_date IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      pp.user_id,
      COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as username,
      pp.score,
      pp.completed_at,
      (pp.game_data->>'perfectGame')::BOOLEAN as perfect_game,
      pp.total_guesses,
      ROW_NUMBER() OVER (ORDER BY pp.score DESC, pp.completed_at ASC) as rank,
      (pp.user_id = p_user_id) as is_current_user
    FROM pokegrid_progress pp
    JOIN auth.users au ON pp.user_id = au.id
    WHERE pp.grid_date = p_grid_date 
      AND pp.completed = true
      AND pp.user_id IN (SELECT user_id FROM friends_and_self)
    ORDER BY pp.score DESC, pp.completed_at ASC;
    
  ELSIF p_timeframe = 'weekly' THEN
    RETURN QUERY
    SELECT 
      pp.user_id,
      COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as username,
      MAX(pp.score) as score,
      MAX(pp.completed_at) as completed_at,
      bool_or((pp.game_data->>'perfectGame')::BOOLEAN) as perfect_game,
      MIN(pp.total_guesses) as total_guesses,
      ROW_NUMBER() OVER (ORDER BY MAX(pp.score) DESC, MAX(pp.completed_at) ASC) as rank,
      (pp.user_id = p_user_id) as is_current_user
    FROM pokegrid_progress pp
    JOIN auth.users au ON pp.user_id = au.id
    WHERE pp.grid_date >= CURRENT_DATE - INTERVAL '7 days'
      AND pp.completed = true
      AND pp.user_id IN (SELECT user_id FROM friends_and_self)
    GROUP BY pp.user_id, au.email, au.raw_user_meta_data
    ORDER BY MAX(pp.score) DESC, MAX(pp.completed_at) ASC;
    
  ELSE -- all-time
    RETURN QUERY
    SELECT 
      pp.user_id,
      COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as username,
      MAX(pp.score) as score,
      MAX(pp.completed_at) as completed_at,
      bool_or((pp.game_data->>'perfectGame')::BOOLEAN) as perfect_game,
      MIN(pp.total_guesses) as total_guesses,
      ROW_NUMBER() OVER (ORDER BY MAX(pp.score) DESC, MAX(pp.completed_at) ASC) as rank,
      (pp.user_id = p_user_id) as is_current_user
    FROM pokegrid_progress pp
    JOIN auth.users au ON pp.user_id = au.id
    WHERE pp.completed = true
      AND pp.user_id IN (SELECT user_id FROM friends_and_self)
    GROUP BY pp.user_id, au.email, au.raw_user_meta_data
    ORDER BY MAX(pp.score) DESC, MAX(pp.completed_at) ASC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search users by email or username (for adding friends)
CREATE OR REPLACE FUNCTION search_users_for_friends(
  p_current_user_id UUID,
  p_search_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  email TEXT,
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
    ) as username,
    au.email,
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
      au.email ILIKE '%' || p_search_query || '%'
      OR (au.raw_user_meta_data->>'full_name') ILIKE '%' || p_search_query || '%'
      OR (au.raw_user_meta_data->>'username') ILIKE '%' || p_search_query || '%'
    )
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get weekly history for a user (last 7 days)
CREATE OR REPLACE FUNCTION get_user_weekly_history(p_user_id UUID)
RETURNS TABLE (
  grid_date DATE,
  completed BOOLEAN,
  score INTEGER,
  total_guesses INTEGER,
  perfect_game BOOLEAN,
  rank_among_friends BIGINT,
  friends_completed_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH last_7_days AS (
    SELECT CURRENT_DATE - i AS grid_date
    FROM generate_series(0, 6) AS i
  ),
  user_friends AS (
    SELECT 
      CASE 
        WHEN f.user_id_1 = p_user_id THEN f.user_id_2
        ELSE f.user_id_1
      END as friend_id
    FROM friendships f
    WHERE f.user_id_1 = p_user_id OR f.user_id_2 = p_user_id
  ),
  friends_and_self AS (
    SELECT friend_id as user_id FROM user_friends
    UNION
    SELECT p_user_id as user_id
  )
  SELECT 
    d.grid_date,
    COALESCE(pp.completed, FALSE) as completed,
    COALESCE(pp.score, 0) as score,
    COALESCE(pp.total_guesses, 0) as total_guesses,
    COALESCE((pp.game_data->>'perfectGame')::BOOLEAN, FALSE) as perfect_game,
    (
      SELECT COUNT(*) + 1
      FROM pokegrid_progress pp2
      WHERE pp2.grid_date = d.grid_date
        AND pp2.completed = true
        AND pp2.score > COALESCE(pp.score, 0)
        AND pp2.user_id IN (SELECT user_id FROM friends_and_self)
    ) as rank_among_friends,
    (
      SELECT COUNT(*)
      FROM pokegrid_progress pp3
      WHERE pp3.grid_date = d.grid_date
        AND pp3.completed = true
        AND pp3.user_id IN (SELECT user_id FROM friends_and_self)
        AND pp3.user_id != p_user_id
    ) as friends_completed_count
  FROM last_7_days d
  LEFT JOIN pokegrid_progress pp ON pp.grid_date = d.grid_date AND pp.user_id = p_user_id
  ORDER BY d.grid_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

