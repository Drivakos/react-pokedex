-- Online friend presence and targeted VS invitations.

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen
  ON public.user_presence(last_seen_at DESC);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own presence" ON public.user_presence;
CREATE POLICY "Users can create their own presence"
ON public.user_presence
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own presence" ON public.user_presence;
CREATE POLICY "Users can update their own presence"
ON public.user_presence
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Presence is read through get_vs_friends_presence so users can only inspect
-- people with whom they have an accepted friendship.
REVOKE SELECT, DELETE ON public.user_presence FROM authenticated;
GRANT INSERT, UPDATE ON public.user_presence TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_user_presence()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_seen_at TIMESTAMPTZ := NOW();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.user_presence (user_id, last_seen_at)
  VALUES (v_user_id, v_seen_at)
  ON CONFLICT (user_id)
  DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at;

  RETURN v_seen_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_vs_friends_presence()
RETURNS TABLE (
  friend_id UUID,
  friend_name TEXT,
  last_seen_at TIMESTAMPTZ,
  is_online BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN f.user_id_1 = auth.uid() THEN f.user_id_2 ELSE f.user_id_1 END AS friend_id,
    COALESCE(
      p.username,
      friend_user.raw_user_meta_data->>'full_name',
      friend_user.raw_user_meta_data->>'username',
      split_part(friend_user.email, '@', 1),
      'Trainer'
    )::TEXT AS friend_name,
    presence.last_seen_at,
    COALESCE(presence.last_seen_at >= NOW() - INTERVAL '90 seconds', FALSE) AS is_online
  FROM public.friendships f
  JOIN auth.users friend_user
    ON friend_user.id = CASE
      WHEN f.user_id_1 = auth.uid() THEN f.user_id_2
      ELSE f.user_id_1
    END
  LEFT JOIN public.profiles p ON p.id = friend_user.id
  LEFT JOIN public.user_presence presence ON presence.user_id = friend_user.id
  WHERE auth.uid() IS NOT NULL
    AND (f.user_id_1 = auth.uid() OR f.user_id_2 = auth.uid())
  ORDER BY is_online DESC, friend_name ASC;
$$;

ALTER TABLE public.vs_matches
  ADD COLUMN IF NOT EXISTS invited_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vs_matches_invited_user
  ON public.vs_matches(invited_user_id, created_at DESC)
  WHERE status = 'invited';

CREATE OR REPLACE FUNCTION public.create_vs_friend_invite(
  p_team_id INTEGER,
  p_friend_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_host_name TEXT;
  v_result JSONB;
  v_match_id UUID;
  v_token TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_friend_id = v_user_id THEN
    RAISE EXCEPTION 'You cannot challenge yourself';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.friendships f
    WHERE (f.user_id_1 = LEAST(v_user_id, p_friend_id)
      AND f.user_id_2 = GREATEST(v_user_id, p_friend_id))
  ) THEN
    RAISE EXCEPTION 'You can only challenge an accepted friend';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_presence presence
    WHERE presence.user_id = p_friend_id
      AND presence.last_seen_at >= NOW() - INTERVAL '90 seconds'
  ) THEN
    RAISE EXCEPTION 'That friend is no longer online';
  END IF;

  v_result := public.create_vs_invite(p_team_id);
  v_match_id := (v_result->'match'->>'id')::UUID;
  v_token := v_result->>'inviteToken';

  UPDATE public.vs_matches
  SET invited_user_id = p_friend_id,
      updated_at = NOW()
  WHERE id = v_match_id;

  v_result := jsonb_set(
    v_result,
    '{match,invited_user_id}',
    to_jsonb(p_friend_id),
    TRUE
  );

  SELECT COALESCE(
    p.username,
    host_user.raw_user_meta_data->>'full_name',
    host_user.raw_user_meta_data->>'username',
    split_part(host_user.email, '@', 1),
    'A friend'
  ) INTO v_host_name
  FROM auth.users host_user
  LEFT JOIN public.profiles p ON p.id = host_user.id
  WHERE host_user.id = v_user_id;

  INSERT INTO public.notifications (user_id, type, title, message, url, data)
  VALUES (
    p_friend_id,
    'vs_invite',
    'Battle challenge',
    COALESCE(v_host_name, 'A friend') || ' challenged you to a VS battle',
    '/vs/invite/' || v_token,
    jsonb_build_object(
      'sender_id', v_user_id,
      'sender_name', COALESCE(v_host_name, 'A friend'),
      'match_id', v_match_id
    )
  );

  RETURN v_result;
END;
$$;

-- Targeted links may only be accepted by the selected friend. Untargeted links
-- retain the existing share-anywhere behavior.
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
  IF v_match.invited_user_id IS NOT NULL AND v_match.invited_user_id <> v_user_id THEN
    RAISE EXCEPTION 'This invitation was sent to another trainer';
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

REVOKE ALL ON FUNCTION public.touch_user_presence() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_vs_friends_presence() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_vs_friend_invite(INTEGER, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.touch_user_presence() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vs_friends_presence() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_vs_friend_invite(INTEGER, UUID) TO authenticated;
