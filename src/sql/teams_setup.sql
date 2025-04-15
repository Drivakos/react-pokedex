-- Teams table
CREATE TABLE public.teams (
    id SERIAL NOT NULL,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT teams_pkey PRIMARY KEY (id),
    CONSTRAINT teams_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Team members table (Pokemon in teams)
CREATE TABLE public.team_members (
    id SERIAL NOT NULL,
    team_id INTEGER NOT NULL,
    pokemon_id INTEGER NOT NULL,
    position INTEGER NOT NULL, -- Position in team (1-6)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT team_members_pkey PRIMARY KEY (id),
    CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    CONSTRAINT team_members_team_id_position_key UNIQUE (team_id, position), -- Only one Pokemon per position
    CONSTRAINT team_members_position_check CHECK (position >= 1 AND position <= 6) -- Max 6 Pokemon per team
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for teams
CREATE POLICY "Users can create their own teams"
ON public.teams
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own teams"
ON public.teams
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own teams"
ON public.teams
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own teams"
ON public.teams
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for team members
CREATE POLICY "Users can manage team members for their teams"
ON public.team_members
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.teams
        WHERE teams.id = team_members.team_id
        AND teams.user_id = auth.uid()
    )
);
