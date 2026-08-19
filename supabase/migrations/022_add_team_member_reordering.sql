-- Allow a whole team order to be updated atomically. Deferring the unique
-- constraint is required for swaps on full six-member teams, where no spare
-- position exists during the update.
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_team_id_position_key;

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_team_id_position_key
  UNIQUE (team_id, position)
  DEFERRABLE INITIALLY IMMEDIATE;

CREATE OR REPLACE FUNCTION public.reorder_team_members(
  p_team_id INTEGER,
  p_member_ids INTEGER[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_member_count INTEGER;
BEGIN
  IF COALESCE(cardinality(p_member_ids), 0) < 1 OR cardinality(p_member_ids) > 6 THEN
    RAISE EXCEPTION 'A team order must contain between one and six members';
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM public.team_members
  WHERE team_id = p_team_id;

  IF v_member_count <> cardinality(p_member_ids)
    OR v_member_count <> (
      SELECT COUNT(DISTINCT member_id)
      FROM unnest(p_member_ids) AS requested(member_id)
    )
    OR EXISTS (
      SELECT 1
      FROM unnest(p_member_ids) AS requested(member_id)
      LEFT JOIN public.team_members tm
        ON tm.id = requested.member_id AND tm.team_id = p_team_id
      WHERE tm.id IS NULL
    )
  THEN
    RAISE EXCEPTION 'The requested order must contain every team member exactly once';
  END IF;

  SET CONSTRAINTS team_members_team_id_position_key DEFERRED;

  UPDATE public.team_members AS tm
  SET position = requested.position::INTEGER,
      updated_at = NOW()
  FROM unnest(p_member_ids) WITH ORDINALITY AS requested(member_id, position)
  WHERE tm.team_id = p_team_id
    AND tm.id = requested.member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_team_members(INTEGER, INTEGER[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_team_members(INTEGER, INTEGER[]) TO authenticated;
