-- Migration: Fix Function Parameter Conflicts
-- Created: 2025-07-17
-- Description: Drop and recreate functions that have parameter name conflicts

-- Drop existing function with conflicting parameter name
DROP FUNCTION IF EXISTS can_access_message(uuid);

-- Recreate function with correct parameter name
CREATE OR REPLACE FUNCTION can_access_message(message_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  msg_channel_id UUID;
BEGIN
  SELECT channel_id INTO msg_channel_id
  FROM messages 
  WHERE id = message_uuid AND deleted_at IS NULL;
  
  RETURN msg_channel_id IS NOT NULL 
    AND can_access_channel(msg_channel_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_access_message(UUID) TO authenticated;

-- Add documentation
COMMENT ON FUNCTION can_access_message(UUID) IS 'Returns true if user can access message';