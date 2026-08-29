-- Head-to-head records and completed-match discovery. Replays use the immutable
-- team snapshots, seed, and synchronized choice pairs already stored per match.

CREATE OR REPLACE FUNCTION public.build_vs_head_to_head(
  p_user_id UUID,
  p_other_user_id UUID
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'opponentUserId', p_other_user_id,
    'opponentName', COALESCE(
      opponent_profile.username,
      opponent_user.raw_user_meta_data->>'full_name',
      opponent_user.raw_user_meta_data->>'username',
      split_part(opponent_user.email, '@', 1),
      'Trainer'
    ),
    'totalBattles', COUNT(match.id),
    'userWins', COUNT(match.id) FILTER (WHERE match.winner_user_id = p_user_id),
    'opponentWins', COUNT(match.id) FILTER (WHERE match.winner_user_id = p_other_user_id),
    'ties', COUNT(match.id) FILTER (WHERE match.winner_user_id IS NULL),
    'lastPlayedAt', MAX(match.finished_at)
  )
  FROM auth.users opponent_user
  LEFT JOIN public.profiles opponent_profile ON opponent_profile.id = opponent_user.id
  LEFT JOIN public.vs_matches match
    ON match.status = 'finished'
    AND (
      (match.host_user_id = p_user_id AND match.guest_user_id = p_other_user_id)
      OR (match.host_user_id = p_other_user_id AND match.guest_user_id = p_user_id)
    )
  WHERE opponent_user.id = p_other_user_id
  GROUP BY opponent_user.id, opponent_user.raw_user_meta_data, opponent_user.email, opponent_profile.username;
$$;

REVOKE ALL ON FUNCTION public.build_vs_head_to_head(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.build_vs_head_to_head(UUID, UUID) FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_vs_head_to_head(p_other_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_record JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_other_user_id = v_user_id THEN
    RAISE EXCEPTION 'Choose another trainer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_other_user_id) THEN
    RAISE EXCEPTION 'Trainer not found';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.friendships friendship
    WHERE friendship.user_id_1 = LEAST(v_user_id, p_other_user_id)
      AND friendship.user_id_2 = GREATEST(v_user_id, p_other_user_id)
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.vs_matches match
    WHERE (match.host_user_id = v_user_id AND match.guest_user_id = p_other_user_id)
      OR (match.host_user_id = p_other_user_id AND match.guest_user_id = v_user_id)
  ) THEN
    RAISE EXCEPTION 'Head-to-head record is only available for friends and previous opponents';
  END IF;

  v_record := public.build_vs_head_to_head(v_user_id, p_other_user_id);
  RETURN v_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_vs_match_history(p_limit INTEGER DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_limit NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'History limit must be between 1 and 50';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'matchId', history.id,
      'opponentUserId', history.opponent_user_id,
      'opponentName', history.opponent_name,
      'winnerUserId', history.winner_user_id,
      'finishReason', history.finish_reason,
      'finishedAt', history.finished_at,
      'userTeamName', history.user_team_name,
      'opponentTeamName', history.opponent_team_name
    ) ORDER BY history.finished_at DESC)
    FROM (
      SELECT
        match.id,
        CASE WHEN match.host_user_id = v_user_id THEN match.guest_user_id ELSE match.host_user_id END AS opponent_user_id,
        COALESCE(
          opponent_profile.username,
          opponent_user.raw_user_meta_data->>'full_name',
          opponent_user.raw_user_meta_data->>'username',
          split_part(opponent_user.email, '@', 1),
          'Trainer'
        ) AS opponent_name,
        match.winner_user_id,
        match.finish_reason,
        match.finished_at,
        CASE
          WHEN match.host_user_id = v_user_id THEN match.host_team_snapshot->>'name'
          ELSE match.guest_team_snapshot->>'name'
        END AS user_team_name,
        CASE
          WHEN match.host_user_id = v_user_id THEN match.guest_team_snapshot->>'name'
          ELSE match.host_team_snapshot->>'name'
        END AS opponent_team_name
      FROM public.vs_matches match
      JOIN auth.users opponent_user
        ON opponent_user.id = CASE
          WHEN match.host_user_id = v_user_id THEN match.guest_user_id
          ELSE match.host_user_id
        END
      LEFT JOIN public.profiles opponent_profile ON opponent_profile.id = opponent_user.id
      WHERE match.status = 'finished'
        AND (match.host_user_id = v_user_id OR match.guest_user_id = v_user_id)
      ORDER BY match.finished_at DESC
      LIMIT p_limit
    ) history
  ), '[]'::JSONB);
END;
$$;

-- Include the pair's record in every invitation inspection, including an
-- untargeted invite opened by a trainer who has battled the host before.
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
  IF v_match.invited_user_id IS NOT NULL
    AND v_match.invited_user_id <> v_user_id
    AND v_match.host_user_id <> v_user_id THEN
    RAISE EXCEPTION 'This invitation was sent to another trainer';
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
    'rulesVersion', v_match.rules_version,
    'headToHead', CASE
      WHEN v_match.host_user_id = v_user_id THEN
        public.build_vs_head_to_head(v_user_id, COALESCE(v_match.invited_user_id, v_match.guest_user_id))
      ELSE public.build_vs_head_to_head(v_user_id, v_match.host_user_id)
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_vs_head_to_head(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_vs_match_history(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vs_head_to_head(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vs_match_history(INTEGER) TO authenticated;
