-- Add cell_stats column to pokegrid_daily_configs
ALTER TABLE pokegrid_daily_configs 
ADD COLUMN IF NOT EXISTS cell_stats JSONB DEFAULT NULL;

-- Comment on column
COMMENT ON COLUMN pokegrid_daily_configs.cell_stats IS 'Stores calculated solution counts for each cell in the grid';
