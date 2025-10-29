-- Migration: Create PokéGrid daily configurations table
-- Purpose: Store pre-generated grid configurations for consistency across users and history

-- Create table for storing daily grid configurations
CREATE TABLE IF NOT EXISTS pokegrid_configurations (
  id BIGSERIAL PRIMARY KEY,
  grid_date DATE UNIQUE NOT NULL,
  configuration JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata for analytics and debugging
  week_number INTEGER,
  year INTEGER,
  generation_seed TEXT,
  difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  
  -- Performance indexes
  CONSTRAINT valid_grid_date CHECK (grid_date >= '2024-01-01'),
  CONSTRAINT valid_configuration CHECK (jsonb_typeof(configuration) = 'object')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pokegrid_configurations_date ON pokegrid_configurations(grid_date);
CREATE INDEX IF NOT EXISTS idx_pokegrid_configurations_active ON pokegrid_configurations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pokegrid_configurations_week ON pokegrid_configurations(year, week_number);

-- Enable Row Level Security
ALTER TABLE pokegrid_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read active configurations
CREATE POLICY "Anyone can read active grid configurations" ON pokegrid_configurations
  FOR SELECT USING (is_active = true);

-- Only authenticated users can insert (for admin functionality)
CREATE POLICY "Authenticated users can insert grid configurations" ON pokegrid_configurations
  FOR INSERT TO authenticated WITH CHECK (true);

-- Only the creator or admin can update
CREATE POLICY "Creators can update their grid configurations" ON pokegrid_configurations
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Function to get grid configuration for a specific date (only today and last 6 days)
CREATE OR REPLACE FUNCTION get_pokegrid_configuration(p_grid_date DATE)
RETURNS TABLE (
  id BIGINT,
  grid_date DATE,
  configuration JSONB,
  difficulty_level TEXT,
  week_number INTEGER,
  year INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow access to today and last 6 days
  IF p_grid_date < CURRENT_DATE - INTERVAL '6 days' OR p_grid_date > CURRENT_DATE THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    pc.id,
    pc.grid_date,
    pc.configuration,
    pc.difficulty_level,
    pc.week_number,
    pc.year
  FROM pokegrid_configurations pc
  WHERE pc.grid_date = p_grid_date 
    AND pc.is_active = true
  LIMIT 1;
END;
$$;

-- Function to save/update grid configuration
CREATE OR REPLACE FUNCTION save_pokegrid_configuration(
  p_grid_date DATE,
  p_configuration JSONB,
  p_difficulty_level TEXT DEFAULT 'medium',
  p_generation_seed TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_id BIGINT;
  week_num INTEGER;
  year_num INTEGER;
BEGIN
  -- Calculate week and year
  SELECT 
    EXTRACT(WEEK FROM p_grid_date)::INTEGER,
    EXTRACT(YEAR FROM p_grid_date)::INTEGER
  INTO week_num, year_num;

  -- Insert or update configuration
  INSERT INTO pokegrid_configurations (
    grid_date,
    configuration,
    created_by,
    difficulty_level,
    generation_seed,
    week_number,
    year
  )
  VALUES (
    p_grid_date,
    p_configuration,
    auth.uid(),
    p_difficulty_level,
    p_generation_seed,
    week_num,
    year_num
  )
  ON CONFLICT (grid_date) DO UPDATE SET
    configuration = EXCLUDED.configuration,
    difficulty_level = EXCLUDED.difficulty_level,
    generation_seed = EXCLUDED.generation_seed,
    week_number = EXCLUDED.week_number,
    year = EXCLUDED.year,
    created_by = auth.uid(),
    created_at = NOW()
  RETURNING id INTO config_id;

  RETURN config_id;
END;
$$;

-- Function to generate weekly configurations (to be called by Edge Function)
CREATE OR REPLACE FUNCTION generate_weekly_pokegrid_configurations(
  p_start_date DATE,
  p_seed TEXT DEFAULT NULL
)
RETURNS TABLE (
  generated_date DATE,
  config_id BIGINT,
  success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  loop_date DATE;
  end_date DATE;
  daily_config JSONB;
  new_config_id BIGINT;
  base_seed TEXT;
BEGIN
  -- Set end date to 7 days from start
  end_date := p_start_date + INTERVAL '6 days';
  
  -- Use provided seed or generate one
  base_seed := COALESCE(p_seed, 'week-' || p_start_date::TEXT);
  
  -- Generate configuration for each day
  loop_date := p_start_date;
  
  WHILE loop_date <= end_date LOOP
    -- Generate daily configuration (this will be implemented in the Edge Function)
    daily_config := jsonb_build_object(
      'date', loop_date,
      'seed', base_seed || '-' || loop_date::TEXT,
      'generated_at', NOW(),
      'status', 'pending_generation'
    );
    
    -- Save configuration
    SELECT save_pokegrid_configuration(
      loop_date,
      daily_config,
      'medium',
      base_seed || '-' || loop_date::TEXT
    ) INTO new_config_id;
    
    -- Return result
    RETURN QUERY SELECT loop_date, new_config_id, true;
    
    -- Move to next day
    loop_date := loop_date + INTERVAL '1 day';
  END LOOP;
END;
$$;

-- Function to get weekly leaderboard data
CREATE OR REPLACE FUNCTION get_weekly_pokegrid_leaderboard(
  p_start_date DATE,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  user_id UUID,
  total_score BIGINT,
  games_completed INTEGER,
  average_score NUMERIC,
  perfect_games INTEGER,
  total_guesses INTEGER,
  accuracy_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  end_date DATE;
BEGIN
  end_date := p_start_date + INTERVAL '6 days';
  
  RETURN QUERY
  SELECT 
    pp.user_id,
    SUM(pp.score)::BIGINT as total_score,
    COUNT(*)::INTEGER as games_completed,
    ROUND(AVG(pp.score), 2) as average_score,
    COUNT(*) FILTER (WHERE pp.total_guesses = pp.correct_guesses)::INTEGER as perfect_games,
    SUM(pp.total_guesses)::INTEGER as total_guesses,
    CASE 
      WHEN SUM(pp.total_guesses) > 0 THEN 
        ROUND((SUM(pp.correct_guesses)::NUMERIC / SUM(pp.total_guesses)::NUMERIC) * 100, 2)
      ELSE 0
    END as accuracy_percentage
  FROM pokegrid_progress pp
  WHERE pp.grid_date >= p_start_date 
    AND pp.grid_date <= end_date
    AND pp.completed = true
  GROUP BY pp.user_id
  ORDER BY total_score DESC, average_score DESC
  LIMIT p_limit;
END;
$$;

-- Insert initial seed data for current week if not exists
DO $$
DECLARE
  current_monday DATE;
BEGIN
  -- Get current Monday
  current_monday := DATE_TRUNC('week', CURRENT_DATE);
  
  -- Check if we have configurations for this week
  IF NOT EXISTS (
    SELECT 1 FROM pokegrid_configurations 
    WHERE grid_date >= current_monday 
    AND grid_date < current_monday + INTERVAL '7 days'
  ) THEN
    -- Generate placeholder configurations for current week
    PERFORM generate_weekly_pokegrid_configurations(current_monday);
  END IF;
END $$;
