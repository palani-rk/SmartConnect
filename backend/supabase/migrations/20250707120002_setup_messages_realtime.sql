-- Migration: setup_messages_realtime.sql
-- Configure Realtime subscriptions for messages table

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Create function to notify on message insert
CREATE OR REPLACE FUNCTION notify_message_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify all channel members about new message
  PERFORM pg_notify(
    'message_insert',
    json_build_object(
      'channel_id', NEW.channel_id,
      'message_id', NEW.id,
      'user_id', NEW.user_id,
      'created_at', NEW.created_at
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to notify on message update
CREATE OR REPLACE FUNCTION notify_message_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify all channel members about message update
  PERFORM pg_notify(
    'message_update',
    json_build_object(
      'channel_id', NEW.channel_id,
      'message_id', NEW.id,
      'user_id', NEW.user_id,
      'updated_at', NEW.updated_at,
      'is_edited', NEW.is_edited,
      'deleted_at', NEW.deleted_at
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for realtime notifications
DROP TRIGGER IF EXISTS trigger_notify_message_insert ON messages;
CREATE TRIGGER trigger_notify_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_insert();

DROP TRIGGER IF EXISTS trigger_notify_message_update ON messages;
CREATE TRIGGER trigger_notify_message_update
  AFTER UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_update();

-- Create function to get channel members for realtime filtering
CREATE OR REPLACE FUNCTION get_channel_members(p_channel_id UUID)
RETURNS TABLE (user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT cm.user_id
  FROM channel_memberships cm
  WHERE cm.channel_id = p_channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_channel_members(UUID) TO authenticated;