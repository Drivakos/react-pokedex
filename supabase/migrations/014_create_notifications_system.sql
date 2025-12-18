-- Migration 014: Create Notifications System

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'friend_request', 'friend_accepted', 'achievement', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  url TEXT, -- Optional URL to navigate to when clicked
  data JSONB DEFAULT '{}'::JSONB, -- Additional data for the notification
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_read ON notifications(user_id, type, read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title TEXT,
  p_message TEXT,
  p_url TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS INTEGER AS $$
DECLARE
  notification_id INTEGER;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, url, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_url, p_data)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user notifications
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id INTEGER,
  type VARCHAR(50),
  title TEXT,
  message TEXT,
  url TEXT,
  data JSONB,
  read BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.type,
    n.title,
    n.message,
    n.url,
    n.data,
    n.read,
    n.created_at
  FROM notifications n
  WHERE n.user_id = p_user_id
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id INTEGER,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE id = p_notification_id AND user_id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all user notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE user_id = p_user_id AND read = FALSE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM notifications
  WHERE user_id = p_user_id AND read = FALSE;

  RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create friend request notification
CREATE OR REPLACE FUNCTION create_friend_request_notification(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_sender_name TEXT
)
RETURNS INTEGER AS $$
DECLARE
  notification_id INTEGER;
BEGIN
  -- Create notification for the receiver
  SELECT create_notification(
    p_receiver_id,
    'friend_request',
    'New Friend Request',
    p_sender_name || ' sent you a friend request',
    '/friends',
    jsonb_build_object(
      'sender_id', p_sender_id,
      'sender_name', p_sender_name
    )
  ) INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create friend accepted notification
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
    NULL,
    jsonb_build_object(
      'acceptor_id', p_acceptor_id,
      'acceptor_name', p_acceptor_name
    )
  ) INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
