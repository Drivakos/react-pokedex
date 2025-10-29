-- Create function to get leaderboard data
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
      COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as username,
      pp.score,
      pp.completed_at,
      (pp.game_data->>'perfectGame')::BOOLEAN as perfect_game,
      pp.total_guesses,
      ROW_NUMBER() OVER (ORDER BY pp.score DESC, pp.completed_at ASC) as rank
    FROM pokegrid_progress pp
    JOIN auth.users au ON pp.user_id = au.id
    WHERE pp.grid_date = p_grid_date 
      AND pp.completed = true
    ORDER BY pp.score DESC, pp.completed_at ASC
    LIMIT 100;
    
  ELSIF p_timeframe = 'weekly' THEN
    RETURN QUERY
    SELECT 
      pp.user_id,
      COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as username,
      MAX(pp.score) as score,
      MAX(pp.completed_at) as completed_at,
      bool_or((pp.game_data->>'perfectGame')::BOOLEAN) as perfect_game,
      MIN(pp.total_guesses) as total_guesses,
      ROW_NUMBER() OVER (ORDER BY MAX(pp.score) DESC, MAX(pp.completed_at) ASC) as rank
    FROM pokegrid_progress pp
    JOIN auth.users au ON pp.user_id = au.id
    WHERE pp.grid_date >= CURRENT_DATE - INTERVAL '7 days'
      AND pp.completed = true
    GROUP BY pp.user_id, au.email, au.raw_user_meta_data
    ORDER BY MAX(pp.score) DESC, MAX(pp.completed_at) ASC
    LIMIT 100;
    
  ELSE -- all-time
    RETURN QUERY
    SELECT 
      pp.user_id,
      COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as username,
      MAX(pp.score) as score,
      MAX(pp.completed_at) as completed_at,
      bool_or((pp.game_data->>'perfectGame')::BOOLEAN) as perfect_game,
      MIN(pp.total_guesses) as total_guesses,
      ROW_NUMBER() OVER (ORDER BY MAX(pp.score) DESC, MAX(pp.completed_at) ASC) as rank
    FROM pokegrid_progress pp
    JOIN auth.users au ON pp.user_id = au.id
    WHERE pp.completed = true
    GROUP BY pp.user_id, au.email, au.raw_user_meta_data
    ORDER BY MAX(pp.score) DESC, MAX(pp.completed_at) ASC
    LIMIT 100;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  
  UNIQUE(user_id, achievement_id)
);

-- Create indexes for achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

-- Enable RLS for achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can update their own achievements" ON user_achievements;

-- Allow users to read their own achievements
CREATE POLICY "Users can read their own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own achievements
CREATE POLICY "Users can insert their own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own achievements
CREATE POLICY "Users can update their own achievements" ON user_achievements
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to get user achievements
CREATE OR REPLACE FUNCTION get_user_achievements(p_user_id UUID)
RETURNS TABLE (
  achievement_id VARCHAR(50),
  unlocked BOOLEAN,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  progress INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    achievements.id as achievement_id,
    (ua.achievement_id IS NOT NULL) as unlocked,
    ua.unlocked_at,
    COALESCE(ua.progress, 0) as progress
  FROM (
    VALUES 
      ('first-win'),
      ('perfect-game'),
      ('streak-3'),
      ('streak-7'),
      ('high-score'),
      ('speed-demon'),
      ('pokemon-master'),
      ('type-specialist')
  ) AS achievements(id)
  LEFT JOIN user_achievements ua ON ua.user_id = p_user_id AND ua.achievement_id = achievements.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to unlock achievement
CREATE OR REPLACE FUNCTION unlock_achievement(
  p_user_id UUID,
  p_achievement_id VARCHAR(50),
  p_progress INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_achievements (user_id, achievement_id, progress)
  VALUES (p_user_id, p_achievement_id, p_progress)
  ON CONFLICT (user_id, achievement_id) 
  DO UPDATE SET 
    progress = GREATEST(user_achievements.progress, p_progress),
    unlocked_at = CASE 
      WHEN user_achievements.unlocked_at IS NULL THEN NOW() 
      ELSE user_achievements.unlocked_at 
    END;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;