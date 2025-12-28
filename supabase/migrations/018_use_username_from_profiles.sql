-- Migration 018: Use username from public.profiles for leaderboards
-- Joins with the profiles table to ensure we're showing the chosen username

CREATE OR REPLACE FUNCTION get_pokegrid_leaderboard(
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
  rank BIGINT
) AS $$
BEGIN
  IF p_timeframe = 'daily' AND p_grid_date IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      pp.user_id,
      pr.username,
      pp.score,
      pp.completed_at,
      (pp.game_data->>'perfectGame')::BOOLEAN as perfect_game,
      pp.total_guesses,
      ROW_NUMBER() OVER (ORDER BY pp.score DESC, pp.completed_at ASC) as rank
    FROM pokegrid_progress pp
    JOIN public.profiles pr ON pp.user_id = pr.id
    WHERE pp.grid_date = p_grid_date 
      AND pp.completed = true
    ORDER BY pp.score DESC, pp.completed_at ASC
    LIMIT 100;
    
  ELSIF p_timeframe = 'weekly' THEN
    RETURN QUERY
    SELECT 
      pp.user_id,
      pr.username,
      SUM(pp.score)::INTEGER as score,
      MAX(pp.completed_at) as completed_at,
      bool_or((pp.game_data->>'perfectGame')::BOOLEAN) as perfect_game,
      SUM(pp.total_guesses)::INTEGER as total_guesses,
      ROW_NUMBER() OVER (ORDER BY SUM(pp.score) DESC, MAX(pp.completed_at) ASC) as rank
    FROM pokegrid_progress pp
    JOIN public.profiles pr ON pp.user_id = pr.id
    WHERE pp.grid_date >= CURRENT_DATE - INTERVAL '7 days'
      AND pp.completed = true
    GROUP BY pp.user_id, pr.username
    ORDER BY score DESC, completed_at ASC
    LIMIT 100;
    
  ELSE -- all-time
    RETURN QUERY
    SELECT 
      pp.user_id,
      pr.username,
      SUM(pp.score)::INTEGER as score,
      MAX(pp.completed_at) as completed_at,
      bool_or((pp.game_data->>'perfectGame')::BOOLEAN) as perfect_game,
      SUM(pp.total_guesses)::INTEGER as total_guesses,
      ROW_NUMBER() OVER (ORDER BY SUM(pp.score) DESC, MAX(pp.completed_at) ASC) as rank
    FROM pokegrid_progress pp
    JOIN public.profiles pr ON pp.user_id = pr.id
    WHERE pp.completed = true
    GROUP BY pp.user_id, pr.username
    ORDER BY score DESC, completed_at ASC
    LIMIT 100;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_pokegrid_friends_leaderboard to use profiles table
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
  IF p_timeframe = 'daily' AND p_grid_date IS NOT NULL THEN
    RETURN QUERY
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
      SELECT uf.friend_id as uid FROM user_friends uf
      UNION
      SELECT p_user_id as uid
    )
    SELECT 
      pp.user_id,
      pr.username,
      pp.score,
      pp.completed_at,
      (pp.game_data->>'perfectGame')::BOOLEAN as perfect_game,
      pp.total_guesses,
      ROW_NUMBER() OVER (ORDER BY pp.score DESC, pp.completed_at ASC) as rank,
      (pp.user_id = p_user_id) as is_current_user
    FROM pokegrid_progress pp
    JOIN public.profiles pr ON pp.user_id = pr.id
    WHERE pp.grid_date = p_grid_date 
      AND pp.completed = true
      AND pp.user_id IN (SELECT fas.uid FROM friends_and_self fas)
    ORDER BY pp.score DESC, pp.completed_at ASC;
    
  ELSIF p_timeframe = 'weekly' THEN
    RETURN QUERY
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
      SELECT uf.friend_id as uid FROM user_friends uf
      UNION
      SELECT p_user_id as uid
    )
    SELECT 
      pp.user_id,
      pr.username,
      SUM(pp.score)::INTEGER as score,
      MAX(pp.completed_at) as completed_at,
      bool_or((pp.game_data->>'perfectGame')::BOOLEAN) as perfect_game,
      SUM(pp.total_guesses)::INTEGER as total_guesses,
      ROW_NUMBER() OVER (ORDER BY SUM(pp.score) DESC, MAX(pp.completed_at) ASC) as rank,
      (pp.user_id = p_user_id) as is_current_user
    FROM pokegrid_progress pp
    JOIN public.profiles pr ON pp.user_id = pr.id
    WHERE pp.grid_date >= CURRENT_DATE - INTERVAL '7 days'
      AND pp.completed = true
      AND pp.user_id IN (SELECT fas.uid FROM friends_and_self fas)
    GROUP BY pp.user_id, pr.username
    ORDER BY score DESC, completed_at ASC;
    
  ELSE -- all-time
    RETURN QUERY
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
      SELECT uf.friend_id as uid FROM user_friends uf
      UNION
      SELECT p_user_id as uid
    )
    SELECT 
      pp.user_id,
      pr.username,
      SUM(pp.score)::INTEGER as score,
      MAX(pp.completed_at) as completed_at,
      bool_or((pp.game_data->>'perfectGame')::BOOLEAN) as perfect_game,
      SUM(pp.total_guesses)::INTEGER as total_guesses,
      ROW_NUMBER() OVER (ORDER BY SUM(pp.score) DESC, MAX(pp.completed_at) ASC) as rank,
      (pp.user_id = p_user_id) as is_current_user
    FROM pokegrid_progress pp
    JOIN public.profiles pr ON pp.user_id = pr.id
    WHERE pp.completed = true
      AND pp.user_id IN (SELECT fas.uid FROM friends_and_self fas)
    GROUP BY pp.user_id, pr.username
    ORDER BY score DESC, completed_at ASC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
