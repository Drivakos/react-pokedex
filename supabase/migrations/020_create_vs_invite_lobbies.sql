-- VS mode invite lobbies. Battle choice/resolution tables arrive with the live
-- lockstep slice; this migration intentionally owns only durable lobby state.

CREATE TABLE IF NOT EXISTS public.vs_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'lobby', 'active', 'finished', 'cancelled', 'expired', 'desynced')),
  invite_token_hash TEXT NOT NULL UNIQUE,
  invite_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  host_team_snapshot JSONB NOT NULL,
  guest_team_snapshot JSONB,
  host_ready BOOLEAN NOT NULL DEFAULT FALSE,
  guest_ready BOOLEAN NOT NULL DEFAULT FALSE,
  battle_seed JSONB,
  rules_version TEXT NOT NULL DEFAULT 'gen9customgame-level50-v1',
  simulator_version TEXT NOT NULL DEFAULT '@pkmn/sim-0.10.11',
  winner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  finish_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (guest_user_id IS NULL OR guest_user_id <> host_user_id)
);

CREATE INDEX IF NOT EXISTS idx_vs_matches_host ON public.vs_matches(host_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vs_matches_guest ON public.vs_matches(guest_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vs_matches_expiry ON public.vs_matches(invite_expires_at)
  WHERE status = 'invited';

ALTER TABLE public.vs_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "VS participants can view their matches" ON public.vs_matches;
CREATE POLICY "VS participants can view their matches"
ON public.vs_matches
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = host_user_id OR (SELECT auth.uid()) = guest_user_id);

-- All mutations pass through the transactional RPCs below.
REVOKE INSERT, UPDATE, DELETE ON public.vs_matches FROM authenticated;
GRANT SELECT ON public.vs_matches TO authenticated;

CREATE OR REPLACE FUNCTION public.snapshot_vs_team(p_team_id INTEGER, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team public.teams%ROWTYPE;
  v_member_count INTEGER;
  v_invalid_count INTEGER;
  v_snapshot JSONB;
BEGIN
  SELECT * INTO v_team
  FROM public.teams
  WHERE id = p_team_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found or not owned by the current user';
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM public.team_members
  WHERE team_id = p_team_id;

  IF v_member_count < 1 OR v_member_count > 6 THEN
    RAISE EXCEPTION 'A VS team must contain between one and six Pokemon';
  END IF;

  SELECT COUNT(*) INTO v_invalid_count
  FROM public.team_members tm
  LEFT JOIN public.pokemon p ON p.id = tm.pokemon_id
  WHERE tm.team_id = p_team_id
    AND (
      p.id IS NULL
      OR NULLIF(BTRIM(COALESCE(tm.ability, '')), '') IS NULL
      OR COALESCE(cardinality(tm.moves), 0) NOT BETWEEN 1 AND 4
      OR COALESCE(tm.level, 50) NOT BETWEEN 1 AND 100
      OR EXISTS (
        SELECT 1
        FROM unnest(COALESCE(tm.moves, '{}'::TEXT[])) AS selected_move(name)
        WHERE NOT EXISTS (
          SELECT 1 FROM public.moves known_move
          WHERE known_move.name = LOWER(REPLACE(BTRIM(selected_move.name), ' ', '-'))
        )
      )
      OR EXISTS (
        SELECT 1 FROM jsonb_each_text(COALESCE(tm.evs, '{}'::JSONB)) stat
        WHERE CASE
          WHEN stat.value ~ '^[0-9]+$' THEN stat.value::INTEGER NOT BETWEEN 0 AND 252
          ELSE TRUE
        END
      )
      OR COALESCE((
        SELECT SUM(CASE WHEN stat.value ~ '^[0-9]+$' THEN stat.value::INTEGER ELSE 100000 END)
        FROM jsonb_each_text(COALESCE(tm.evs, '{}'::JSONB)) stat
      ), 0) > 510
      OR EXISTS (
        SELECT 1 FROM jsonb_each_text(COALESCE(tm.ivs, '{}'::JSONB)) stat
        WHERE CASE
          WHEN stat.value ~ '^[0-9]+$' THEN stat.value::INTEGER NOT BETWEEN 0 AND 31
          ELSE TRUE
        END
      )
    );

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Every VS Pokemon needs recognized data, an ability, one to four moves, and a valid level';
  END IF;

  SELECT jsonb_build_object(
    'teamId', v_team.id,
    'name', v_team.name,
    'members', jsonb_agg(
      jsonb_build_object(
        'pokemonId', tm.pokemon_id,
        'species', p.name,
        'types', p.types,
        'position', tm.position,
        'moves', tm.moves,
        'item', tm.item,
        'ability', tm.ability,
        'nature', COALESCE(tm.nature, 'hardy'),
        'evs', COALESCE(tm.evs, '{}'::JSONB),
        'ivs', COALESCE(tm.ivs, '{}'::JSONB),
        'level', 50,
        'nickname', tm.nickname,
        'isShiny', COALESCE(tm.is_shiny, FALSE),
        'gender', tm.gender,
        'teraType', tm.tera_type
      ) ORDER BY tm.position
    )
  ) INTO v_snapshot
  FROM public.team_members tm
  JOIN public.pokemon p ON p.id = tm.pokemon_id
  WHERE tm.team_id = p_team_id;

  RETURN v_snapshot;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_vs_invite(p_team_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_token TEXT;
  v_match public.vs_matches%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.vs_matches (
    host_user_id,
    invite_token_hash,
    host_team_snapshot
  ) VALUES (
    v_user_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    public.snapshot_vs_team(p_team_id, v_user_id)
  )
  RETURNING * INTO v_match;

  RETURN jsonb_build_object(
    'match', to_jsonb(v_match) - 'invite_token_hash',
    'inviteToken', v_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.inspect_vs_invite(p_invite_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match public.vs_matches%ROWTYPE;
  v_host_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.vs_matches
  SET status = 'expired', updated_at = NOW()
  WHERE invite_token_hash = encode(digest(p_invite_token, 'sha256'), 'hex')
    AND status = 'invited'
    AND invite_expires_at <= NOW();

  SELECT * INTO v_match
  FROM public.vs_matches
  WHERE invite_token_hash = encode(digest(p_invite_token, 'sha256'), 'hex');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  SELECT COALESCE(pr.username, 'Trainer') INTO v_host_name
  FROM public.profiles pr
  WHERE pr.id = v_match.host_user_id;

  RETURN jsonb_build_object(
    'matchId', v_match.id,
    'status', v_match.status,
    'expiresAt', v_match.invite_expires_at,
    'hostName', COALESCE(v_host_name, 'Trainer'),
    'isHost', v_match.host_user_id = v_user_id,
    'rulesVersion', v_match.rules_version
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_vs_invite(p_invite_token TEXT, p_team_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match public.vs_matches%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_match
  FROM public.vs_matches
  WHERE invite_token_hash = encode(digest(p_invite_token, 'sha256'), 'hex')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  IF v_match.host_user_id = v_user_id THEN
    RAISE EXCEPTION 'The host cannot accept their own invite';
  END IF;
  IF v_match.status <> 'invited' OR v_match.guest_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Invite is no longer available';
  END IF;
  IF v_match.invite_expires_at <= NOW() THEN
    UPDATE public.vs_matches SET status = 'expired', updated_at = NOW() WHERE id = v_match.id;
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  UPDATE public.vs_matches
  SET guest_user_id = v_user_id,
      guest_team_snapshot = public.snapshot_vs_team(p_team_id, v_user_id),
      status = 'lobby',
      updated_at = NOW()
  WHERE id = v_match.id
  RETURNING * INTO v_match;

  RETURN to_jsonb(v_match) - 'invite_token_hash';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_vs_ready(p_match_id UUID, p_ready BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match public.vs_matches%ROWTYPE;
  v_seed BYTEA;
BEGIN
  SELECT * INTO v_match
  FROM public.vs_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND OR v_user_id IS NULL OR (v_user_id <> v_match.host_user_id AND v_user_id <> v_match.guest_user_id) THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_match.status = 'active' THEN
    RETURN to_jsonb(v_match) - 'invite_token_hash';
  END IF;
  IF v_match.status <> 'lobby' OR v_match.guest_user_id IS NULL THEN
    RAISE EXCEPTION 'Match is not ready for lobby confirmations';
  END IF;

  IF v_user_id = v_match.host_user_id THEN
    UPDATE public.vs_matches SET host_ready = p_ready, updated_at = NOW() WHERE id = p_match_id;
  ELSE
    UPDATE public.vs_matches SET guest_ready = p_ready, updated_at = NOW() WHERE id = p_match_id;
  END IF;

  SELECT * INTO v_match FROM public.vs_matches WHERE id = p_match_id FOR UPDATE;
  IF v_match.host_ready AND v_match.guest_ready THEN
    v_seed := gen_random_bytes(8);
    UPDATE public.vs_matches
    SET status = 'active',
        battle_seed = jsonb_build_array(
          get_byte(v_seed, 0) * 256 + get_byte(v_seed, 1),
          get_byte(v_seed, 2) * 256 + get_byte(v_seed, 3),
          get_byte(v_seed, 4) * 256 + get_byte(v_seed, 5),
          get_byte(v_seed, 6) * 256 + get_byte(v_seed, 7)
        ),
        started_at = NOW(),
        updated_at = NOW()
    WHERE id = p_match_id
    RETURNING * INTO v_match;
  END IF;

  RETURN to_jsonb(v_match) - 'invite_token_hash';
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_vs_invite(p_match_id UUID)
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
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_match_id
    AND host_user_id = v_user_id
    AND status IN ('invited', 'lobby')
  RETURNING * INTO v_match;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite cannot be cancelled';
  END IF;

  RETURN to_jsonb(v_match) - 'invite_token_hash';
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_vs_team(INTEGER, UUID) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.create_vs_invite(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.inspect_vs_invite(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_vs_invite(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_vs_ready(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_vs_invite(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_vs_invite(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.inspect_vs_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_vs_invite(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_vs_ready(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_vs_invite(UUID) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'vs_matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vs_matches;
  END IF;
END $$;
