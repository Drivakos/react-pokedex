-- Durable lockstep choices for playable VS battles. Each browser runs the same
-- seeded simulator; only completed choice pairs are revealed to participants.

CREATE TABLE IF NOT EXISTS public.vs_battle_choices (
  match_id UUID NOT NULL REFERENCES public.vs_matches(id) ON DELETE CASCADE,
  request_index INTEGER NOT NULL CHECK (request_index > 0),
  host_choice TEXT,
  guest_choice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, request_index),
  CHECK (host_choice IS NULL OR host_choice ~ '^(default|move [1-4]|switch [1-6])$'),
  CHECK (guest_choice IS NULL OR guest_choice ~ '^(default|move [1-4]|switch [1-6])$')
);

ALTER TABLE public.vs_matches
  ADD COLUMN IF NOT EXISTS host_result TEXT CHECK (host_result IN ('host', 'guest', 'tie')),
  ADD COLUMN IF NOT EXISTS guest_result TEXT CHECK (guest_result IN ('host', 'guest', 'tie'));

ALTER TABLE public.vs_battle_choices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "VS participants can view completed choices" ON public.vs_battle_choices;
CREATE POLICY "VS participants can view completed choices"
ON public.vs_battle_choices
FOR SELECT
TO authenticated
USING (
  host_choice IS NOT NULL
  AND guest_choice IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.vs_matches match
    WHERE match.id = match_id
      AND ((SELECT auth.uid()) = match.host_user_id OR (SELECT auth.uid()) = match.guest_user_id)
  )
);

REVOKE INSERT, UPDATE, DELETE ON public.vs_battle_choices FROM authenticated;
GRANT SELECT ON public.vs_battle_choices TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_vs_choice(
  p_match_id UUID,
  p_request_index INTEGER,
  p_choice TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match public.vs_matches%ROWTYPE;
  v_choice public.vs_battle_choices%ROWTYPE;
BEGIN
  IF p_request_index < 1 OR p_choice !~ '^(default|move [1-4]|switch [1-6])$' THEN
    RAISE EXCEPTION 'Invalid battle choice';
  END IF;

  SELECT * INTO v_match
  FROM public.vs_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND OR v_user_id IS NULL
    OR (v_user_id <> v_match.host_user_id AND v_user_id <> v_match.guest_user_id) THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_match.status <> 'active' THEN
    RAISE EXCEPTION 'Match is not active';
  END IF;

  INSERT INTO public.vs_battle_choices (match_id, request_index)
  VALUES (p_match_id, p_request_index)
  ON CONFLICT (match_id, request_index) DO NOTHING;

  SELECT * INTO v_choice
  FROM public.vs_battle_choices
  WHERE match_id = p_match_id AND request_index = p_request_index
  FOR UPDATE;

  IF v_user_id = v_match.host_user_id THEN
    IF v_choice.host_choice IS NOT NULL AND v_choice.host_choice <> p_choice THEN
      RAISE EXCEPTION 'A choice was already submitted for this request';
    END IF;
    UPDATE public.vs_battle_choices
    SET host_choice = p_choice, updated_at = NOW()
    WHERE match_id = p_match_id AND request_index = p_request_index
    RETURNING * INTO v_choice;
  ELSE
    IF v_choice.guest_choice IS NOT NULL AND v_choice.guest_choice <> p_choice THEN
      RAISE EXCEPTION 'A choice was already submitted for this request';
    END IF;
    UPDATE public.vs_battle_choices
    SET guest_choice = p_choice, updated_at = NOW()
    WHERE match_id = p_match_id AND request_index = p_request_index
    RETURNING * INTO v_choice;
  END IF;

  RETURN jsonb_build_object(
    'requestIndex', p_request_index,
    'complete', v_choice.host_choice IS NOT NULL AND v_choice.guest_choice IS NOT NULL,
    'hostChoice', CASE WHEN v_choice.host_choice IS NOT NULL AND v_choice.guest_choice IS NOT NULL THEN v_choice.host_choice END,
    'guestChoice', CASE WHEN v_choice.host_choice IS NOT NULL AND v_choice.guest_choice IS NOT NULL THEN v_choice.guest_choice END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_vs_choice_pairs(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.vs_matches
    WHERE id = p_match_id AND (host_user_id = v_user_id OR guest_user_id = v_user_id)
  ) THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'requestIndex', request_index,
      'hostChoice', host_choice,
      'guestChoice', guest_choice
    ) ORDER BY request_index)
    FROM public.vs_battle_choices
    WHERE match_id = p_match_id
      AND host_choice IS NOT NULL
      AND guest_choice IS NOT NULL
  ), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public.report_vs_result(p_match_id UUID, p_result TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match public.vs_matches%ROWTYPE;
BEGIN
  IF p_result NOT IN ('host', 'guest', 'tie') THEN
    RAISE EXCEPTION 'Invalid battle result';
  END IF;

  SELECT * INTO v_match FROM public.vs_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND OR v_user_id IS NULL
    OR (v_user_id <> v_match.host_user_id AND v_user_id <> v_match.guest_user_id) THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_match.status NOT IN ('active', 'finished', 'desynced') THEN
    RAISE EXCEPTION 'Match is not active';
  END IF;
  IF v_match.status IN ('finished', 'desynced') THEN
    RETURN to_jsonb(v_match) - 'invite_token_hash';
  END IF;

  IF v_user_id = v_match.host_user_id THEN
    IF v_match.host_result IS NOT NULL AND v_match.host_result <> p_result THEN
      RAISE EXCEPTION 'A different result was already reported';
    END IF;
    UPDATE public.vs_matches SET host_result = p_result, updated_at = NOW() WHERE id = p_match_id;
  ELSE
    IF v_match.guest_result IS NOT NULL AND v_match.guest_result <> p_result THEN
      RAISE EXCEPTION 'A different result was already reported';
    END IF;
    UPDATE public.vs_matches SET guest_result = p_result, updated_at = NOW() WHERE id = p_match_id;
  END IF;

  SELECT * INTO v_match FROM public.vs_matches WHERE id = p_match_id FOR UPDATE;
  IF v_match.host_result IS NOT NULL AND v_match.guest_result IS NOT NULL THEN
    IF v_match.host_result = v_match.guest_result THEN
      UPDATE public.vs_matches
      SET status = 'finished',
          winner_user_id = CASE v_match.host_result
            WHEN 'host' THEN v_match.host_user_id
            WHEN 'guest' THEN v_match.guest_user_id
            ELSE NULL
          END,
          finish_reason = CASE WHEN v_match.host_result = 'tie' THEN 'tie' ELSE 'completed' END,
          finished_at = NOW(),
          updated_at = NOW()
      WHERE id = p_match_id
      RETURNING * INTO v_match;
    ELSE
      UPDATE public.vs_matches
      SET status = 'desynced', finish_reason = 'result_mismatch', finished_at = NOW(), updated_at = NOW()
      WHERE id = p_match_id
      RETURNING * INTO v_match;
    END IF;
  END IF;

  RETURN to_jsonb(v_match) - 'invite_token_hash';
END;
$$;

CREATE OR REPLACE FUNCTION public.forfeit_vs_match(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match public.vs_matches%ROWTYPE;
BEGIN
  UPDATE public.vs_matches
  SET status = 'finished',
      winner_user_id = CASE WHEN host_user_id = v_user_id THEN guest_user_id ELSE host_user_id END,
      finish_reason = 'forfeit',
      finished_at = NOW(),
      updated_at = NOW()
  WHERE id = p_match_id
    AND status = 'active'
    AND (host_user_id = v_user_id OR guest_user_id = v_user_id)
  RETURNING * INTO v_match;

  IF NOT FOUND THEN RAISE EXCEPTION 'Active match not found'; END IF;
  RETURN to_jsonb(v_match) - 'invite_token_hash';
END;
$$;

REVOKE ALL ON FUNCTION public.submit_vs_choice(UUID, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_vs_choice_pairs(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.report_vs_result(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.forfeit_vs_match(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_vs_choice(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vs_choice_pairs(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_vs_result(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.forfeit_vs_match(UUID) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'vs_battle_choices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vs_battle_choices;
  END IF;
END $$;
