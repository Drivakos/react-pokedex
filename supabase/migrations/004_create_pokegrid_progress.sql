-- Create table for storing PokéGrid user progress
CREATE TABLE IF NOT EXISTS pokegrid_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grid_date DATE NOT NULL,
  game_data JSONB NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  score INTEGER DEFAULT 0,
  total_guesses INTEGER DEFAULT 0,
  correct_guesses INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one entry per user per grid date
  UNIQUE(user_id, grid_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pokegrid_progress_user_id ON pokegrid_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_pokegrid_progress_grid_date ON pokegrid_progress(grid_date);
CREATE INDEX IF NOT EXISTS idx_pokegrid_progress_completed ON pokegrid_progress(completed);

-- Create RLS policies
ALTER TABLE pokegrid_progress ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own progress
CREATE POLICY "Users can read their own PokéGrid progress" ON pokegrid_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own progress
CREATE POLICY "Users can insert their own PokéGrid progress" ON pokegrid_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own progress
CREATE POLICY "Users can update their own PokéGrid progress" ON pokegrid_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to get user's progress for a specific date
CREATE OR REPLACE FUNCTION get_user_pokegrid_progress(p_user_id UUID, p_grid_date DATE)
RETURNS TABLE (
  id INTEGER,
  game_data JSONB,
  completed BOOLEAN,
  score INTEGER,
  total_guesses INTEGER,
  correct_guesses INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pg.id,
    pg.game_data,
    pg.completed,
    pg.score,
    pg.total_guesses,
    pg.correct_guesses,
    pg.completed_at
  FROM pokegrid_progress pg
  WHERE pg.user_id = p_user_id
    AND pg.grid_date = p_grid_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to save/update user's progress
CREATE OR REPLACE FUNCTION save_pokegrid_progress(
  p_user_id UUID,
  p_grid_date DATE,
  p_game_data JSONB,
  p_completed BOOLEAN,
  p_score INTEGER,
  p_total_guesses INTEGER,
  p_correct_guesses INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  progress_id INTEGER;
BEGIN
  INSERT INTO pokegrid_progress (
    user_id,
    grid_date,
    game_data,
    completed,
    score,
    total_guesses,
    correct_guesses,
    completed_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_grid_date,
    p_game_data,
    p_completed,
    p_score,
    p_total_guesses,
    p_correct_guesses,
    CASE WHEN p_completed THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (user_id, grid_date)
  DO UPDATE SET
    game_data = EXCLUDED.game_data,
    completed = EXCLUDED.completed,
    score = EXCLUDED.score,
    total_guesses = EXCLUDED.total_guesses,
    correct_guesses = EXCLUDED.correct_guesses,
    completed_at = CASE WHEN EXCLUDED.completed THEN NOW() ELSE pokegrid_progress.completed_at END,
    updated_at = NOW()
  RETURNING id INTO progress_id;

  RETURN progress_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
