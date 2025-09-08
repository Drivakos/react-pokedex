-- Add comprehensive build data fields to team_members table
-- This migration adds all the necessary columns to support full team builder functionality

ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS moves TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS item TEXT,
ADD COLUMN IF NOT EXISTS ability TEXT,
ADD COLUMN IF NOT EXISTS nature TEXT DEFAULT 'hardy',
ADD COLUMN IF NOT EXISTS evs JSONB DEFAULT '{"hp": 0, "attack": 0, "defense": 0, "special-attack": 0, "special-defense": 0, "speed": 0}',
ADD COLUMN IF NOT EXISTS ivs JSONB DEFAULT '{"hp": 31, "attack": 31, "defense": 31, "special-attack": 31, "special-defense": 31, "speed": 31}',
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 50 CHECK (level >= 1 AND level <= 100),
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male' CHECK (gender IN ('male', 'female', 'genderless')),
ADD COLUMN IF NOT EXISTS tera_type TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comment to explain the JSONB structure for EVs and IVs
COMMENT ON COLUMN public.team_members.evs IS 'Effort Values: JSON object with hp, attack, defense, special-attack, special-defense, speed (max 252 each, total max 510)';
COMMENT ON COLUMN public.team_members.ivs IS 'Individual Values: JSON object with hp, attack, defense, special-attack, special-defense, speed (0-31 each)';

-- Update the updated_at timestamp when any build data changes
CREATE OR REPLACE FUNCTION update_team_member_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_team_member_updated_at ON public.team_members;
CREATE TRIGGER trigger_update_team_member_updated_at
    BEFORE UPDATE ON public.team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_team_member_updated_at();

-- Add indexes for better query performance on commonly filtered fields
CREATE INDEX IF NOT EXISTS idx_team_members_level ON public.team_members(level);
CREATE INDEX IF NOT EXISTS idx_team_members_nature ON public.team_members(nature);
CREATE INDEX IF NOT EXISTS idx_team_members_tera_type ON public.team_members(tera_type);
CREATE INDEX IF NOT EXISTS idx_team_members_item ON public.team_members(item);

-- Add a partial index for non-empty moves arrays (for better query performance)
CREATE INDEX IF NOT EXISTS idx_team_members_moves_non_empty ON public.team_members USING GIN(moves)
WHERE array_length(moves, 1) > 0;
