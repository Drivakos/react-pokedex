-- Migration 019: Include request_id in friend_request notification data
-- This allows inline Accept/Decline actions without redirecting to FriendsModal

-- Replace create_friend_request_notification to include p_request_id in the JSONB data
CREATE OR REPLACE FUNCTION create_friend_request_notification(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_sender_name TEXT,
  p_request_id INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  notification_id INTEGER;
BEGIN
  SELECT create_notification(
    p_receiver_id,
    'friend_request',
    'New Friend Request',
    p_sender_name || ' sent you a friend request',
    '/friends',
    jsonb_build_object(
      'sender_id', p_sender_id,
      'sender_name', p_sender_name,
      'request_id', p_request_id
    )
  ) INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace send_friend_request to pass request_id to the notification function
CREATE OR REPLACE FUNCTION send_friend_request(
  p_sender_id UUID,
  p_receiver_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  request_id INTEGER;
  existing_friendship BOOLEAN;
  sender_name TEXT;
BEGIN
  -- Check if they're already friends
  SELECT EXISTS(
    SELECT 1 FROM friendships
    WHERE (user_id_1 = LEAST(p_sender_id, p_receiver_id)
           AND user_id_2 = GREATEST(p_sender_id, p_receiver_id))
  ) INTO existing_friendship;

  IF existing_friendship THEN
    RAISE EXCEPTION 'Already friends';
  END IF;

  -- Get sender name for notification
  SELECT COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'username',
    split_part(au.email, '@', 1)
  )::TEXT INTO sender_name
  FROM auth.users au
  WHERE au.id = p_sender_id;

  -- Insert or update friend request
  INSERT INTO friend_requests (sender_id, receiver_id, status)
  VALUES (p_sender_id, p_receiver_id, 'pending')
  ON CONFLICT (sender_id, receiver_id)
  DO UPDATE SET
    status = 'pending',
    updated_at = NOW()
  RETURNING id INTO request_id;

  -- Create notification for receiver (only if notifications table exists)
  BEGIN
    PERFORM create_friend_request_notification(p_sender_id, p_receiver_id, sender_name, request_id);
  EXCEPTION
    WHEN undefined_function THEN
      -- Notifications system not yet available, skip
      NULL;
  END;

  RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
