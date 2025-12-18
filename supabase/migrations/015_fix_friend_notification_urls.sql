-- Migration 015: Fix Friend Notification URLs
-- Remove URL from friend_accepted notifications since they now open the friends modal

-- Update the create_friend_accepted_notification function to not set a URL
CREATE OR REPLACE FUNCTION create_friend_accepted_notification(
  p_acceptor_id UUID,
  p_accepted_id UUID,
  p_acceptor_name TEXT
)
RETURNS INTEGER AS $$
DECLARE
  notification_id INTEGER;
BEGIN
  -- Create notification for the original sender
  SELECT create_notification(
    p_accepted_id,
    'friend_accepted',
    'Friend Request Accepted!',
    p_acceptor_name || ' accepted your friend request',
    NULL, -- Remove URL since we handle this in the UI by opening friends modal
    jsonb_build_object(
      'acceptor_id', p_acceptor_id,
      'acceptor_name', p_acceptor_name
    )
  ) INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
