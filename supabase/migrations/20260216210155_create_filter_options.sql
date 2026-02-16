-- Create filter_options table
CREATE TABLE IF NOT EXISTS public.filter_options (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL, -- 'type', 'generation', 'move'
    name TEXT NOT NULL,
    UNIQUE(category, name)
);

-- Seed types from current pokemon data
INSERT INTO public.filter_options (category, name)
SELECT DISTINCT 'type', unnest(types)
FROM public.pokemon
ON CONFLICT (category, name) DO NOTHING;

-- Seed generations from current pokemon data
INSERT INTO public.filter_options (category, name)
SELECT DISTINCT 'generation', generation
FROM public.pokemon
WHERE generation IS NOT NULL
ON CONFLICT (category, name) DO NOTHING;

-- Seed moves from current moves data
INSERT INTO public.filter_options (category, name)
SELECT 'move', name
FROM public.moves
ON CONFLICT (category, name) DO NOTHING;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_filter_options_category ON public.filter_options(category);

-- Enable RLS
ALTER TABLE public.filter_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view filter options" ON public.filter_options;
CREATE POLICY "Anyone can view filter options" ON public.filter_options FOR SELECT USING (true);
