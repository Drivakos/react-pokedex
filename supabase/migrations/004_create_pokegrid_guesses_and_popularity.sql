-- Create table for individual guess tracking
CREATE TABLE IF NOT EXISTS pokegrid_guesses (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grid_date DATE NOT NULL,
  cell_id VARCHAR(20) NOT NULL,
  pokemon_id INTEGER NOT NULL,
  pokemon_name VARCHAR(100) NOT NULL,
  attempt_number INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique attempts per cell per user per date
  UNIQUE(user_id, grid_date, cell_id, attempt_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pokegrid_guesses_user_id ON pokegrid_guesses(user_id);
CREATE INDEX IF NOT EXISTS idx_pokegrid_guesses_grid_date ON pokegrid_guesses(grid_date);
CREATE INDEX IF NOT EXISTS idx_pokegrid_guesses_cell_id ON pokegrid_guesses(cell_id);
CREATE INDEX IF NOT EXISTS idx_pokegrid_guesses_pokemon_id ON pokegrid_guesses(pokemon_id);

-- Create RLS policies
ALTER TABLE pokegrid_guesses ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own guesses
CREATE POLICY "Users can read their own PokéGrid guesses" ON pokegrid_guesses
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own guesses
CREATE POLICY "Users can insert their own PokéGrid guesses" ON pokegrid_guesses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to save individual guess
CREATE OR REPLACE FUNCTION save_pokegrid_guess(
  p_user_id UUID,
  p_grid_date DATE,
  p_cell_id VARCHAR(20),
  p_pokemon_id INTEGER,
  p_pokemon_name VARCHAR(100),
  p_attempt_number INTEGER,
  p_is_correct BOOLEAN
)
RETURNS INTEGER AS $$
DECLARE
  guess_id INTEGER;
BEGIN
  INSERT INTO pokegrid_guesses (
    user_id,
    grid_date,
    cell_id,
    pokemon_id,
    pokemon_name,
    attempt_number,
    is_correct
  ) VALUES (
    p_user_id,
    p_grid_date,
    p_cell_id,
    p_pokemon_id,
    p_pokemon_name,
    p_attempt_number,
    p_is_correct
  )
  ON CONFLICT (user_id, grid_date, cell_id, attempt_number)
  DO UPDATE SET
    pokemon_id = EXCLUDED.pokemon_id,
    pokemon_name = EXCLUDED.pokemon_name,
    is_correct = EXCLUDED.is_correct
  RETURNING id INTO guess_id;

  RETURN guess_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get popularity data for a grid date
CREATE OR REPLACE FUNCTION get_pokegrid_popularity(p_grid_date DATE)
RETURNS TABLE (
  cell_id VARCHAR(20),
  pokemon_id INTEGER,
  pokemon_name VARCHAR(100),
  guess_count BIGINT,
  popularity_percentage NUMERIC,
  correct_guess_count BIGINT,
  incorrect_guess_count BIGINT,
  avg_attempts_for_correct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH cell_totals AS (
    SELECT 
      g.cell_id,
      COUNT(*) as total_guesses_for_cell
    FROM pokegrid_guesses g
    WHERE g.grid_date = p_grid_date
    GROUP BY g.cell_id
  ),
  pokemon_stats AS (
    SELECT 
      g.cell_id,
      g.pokemon_id,
      g.pokemon_name,
      COUNT(*) as guess_count,
      COUNT(CASE WHEN g.is_correct THEN 1 END) as correct_count,
      COUNT(CASE WHEN NOT g.is_correct THEN 1 END) as incorrect_count,
      AVG(CASE WHEN g.is_correct THEN g.attempt_number::NUMERIC END) as avg_attempts_correct
    FROM pokegrid_guesses g
    WHERE g.grid_date = p_grid_date
    GROUP BY g.cell_id, g.pokemon_id, g.pokemon_name
  )
  SELECT 
    ps.cell_id,
    ps.pokemon_id,
    ps.pokemon_name,
    ps.guess_count,
    ROUND((ps.guess_count::NUMERIC / ct.total_guesses_for_cell::NUMERIC) * 100, 2) as popularity_percentage,
    ps.correct_count,
    ps.incorrect_count,
    ps.avg_attempts_correct
  FROM pokemon_stats ps
  JOIN cell_totals ct ON ps.cell_id = ct.cell_id
  ORDER BY ps.cell_id, ps.guess_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create table for daily grid configurations (optional - for consistent daily grids)
CREATE TABLE IF NOT EXISTS pokegrid_daily_configs (
  id SERIAL PRIMARY KEY,
  grid_date DATE NOT NULL UNIQUE,
  row_constraints JSONB NOT NULL,
  col_constraints JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for grid configs
CREATE INDEX IF NOT EXISTS idx_pokegrid_daily_configs_date ON pokegrid_daily_configs(grid_date);
-- Crea
te function to get user statistics
CREATE OR REPLACE FUNCTION get_user_pokegrid_stats(p_user_id UUID)
RETURNS TABLE (
  total_games BIGINT,
  completed_games BIGINT,
  perfect_games BIGINT,
  average_score NUMERIC,
  best_score INTEGER,
  current_streak INTEGER,
  longest_streak INTEGER,
  average_guesses NUMERIC,
  total_guesses BIGINT,
  accuracy NUMERIC
) AS $$
DECLARE
  current_streak_count INTEGER := 0;
  longest_streak_count INTEGER := 0;
  temp_streak INTEGER := 0;
  game_record RECORD;
BEGIN
  -- Calculate current and longest streaks
  FOR game_record IN 
    SELECT completed, grid_date 
    FROM pokegrid_progress 
    WHERE user_id = p_user_id 
    ORDER BY grid_date DESC
  LOOP
    IF game_record.completed THEN
      temp_streak := temp_streak + 1;
      IF current_streak_count = 0 THEN
        current_streak_count := temp_streak;
      END IF;
    ELSE
      IF current_streak_count = 0 THEN
        current_streak_count := 0;
      END IF;
      temp_streak := 0;
    END IF;
    
    IF temp_streak > longest_streak_count THEN
      longest_streak_count := temp_streak;
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_games,
    COUNT(CASE WHEN pp.completed THEN 1 END)::BIGINT as completed_games,
    COUNT(CASE WHEN (pp.game_data->>'perfectGame')::BOOLEAN THEN 1 END)::BIGINT as perfect_games,
    COALESCE(AVG(pp.score), 0)::NUMERIC as average_score,
    COALESCE(MAX(pp.score), 0)::INTEGER as best_score,
    current_streak_count::INTEGER as current_streak,
    longest_streak_count::INTEGER as longest_streak,
    COALESCE(AVG(pp.total_guesses), 0)::NUMERIC as average_guesses,
    COALESCE(SUM(pp.total_guesses), 0)::BIGINT as total_guesses,
    CASE 
      WHEN SUM(pp.total_guesses) > 0 THEN 
        ROUND((SUM(pp.correct_guesses)::NUMERIC / SUM(pp.total_guesses)::NUMERIC) * 100, 2)
      ELSE 0 
    END::NUMERIC as accuracy
  FROM pokegrid_progress pp
  WHERE pp.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;