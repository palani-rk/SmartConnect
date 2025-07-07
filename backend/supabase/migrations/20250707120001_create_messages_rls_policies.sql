-- Migration: create_messages_rls_policies.sql
-- Create comprehensive RLS policies for messages table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages in their organization channels" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their organization channels" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can soft delete their own messages" ON messages;

-- RLS Policy: Users can view messages in their organization channels
CREATE POLICY "Users can view messages in their organization channels" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM channel_memberships cm
      JOIN channels c ON c.id = cm.channel_id
      WHERE cm.channel_id = messages.channel_id
      AND cm.user_id = auth.uid()
      AND c.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- RLS Policy: Users can insert messages in their organization channels
CREATE POLICY "Users can insert messages in their organization channels" ON messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM channel_memberships cm
      JOIN channels c ON c.id = cm.channel_id
      WHERE cm.channel_id = messages.channel_id
      AND cm.user_id = auth.uid()
      AND c.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- RLS Policy: Users can update their own messages
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM channel_memberships cm
      JOIN channels c ON c.id = cm.channel_id
      WHERE cm.channel_id = messages.channel_id
      AND cm.user_id = auth.uid()
      AND c.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- RLS Policy: Users can soft delete their own messages
CREATE POLICY "Users can soft delete their own messages" ON messages
  FOR UPDATE USING (
    user_id = auth.uid() AND
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM channel_memberships cm
      JOIN channels c ON c.id = cm.channel_id
      WHERE cm.channel_id = messages.channel_id
      AND cm.user_id = auth.uid()
      AND c.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Create function for secure message operations
CREATE OR REPLACE FUNCTION can_access_message(message_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_org_id UUID;
  message_channel_id UUID;
  channel_org_id UUID;
  is_member BOOLEAN;
BEGIN
  -- Get user's organization ID
  SELECT organization_id INTO user_org_id
  FROM users WHERE id = auth.uid();
  
  -- Get message's channel ID
  SELECT channel_id INTO message_channel_id
  FROM messages WHERE id = message_id;
  
  -- Get channel's organization ID
  SELECT organization_id INTO channel_org_id
  FROM channels WHERE id = message_channel_id;
  
  -- Check if user is a member of the channel
  SELECT EXISTS(
    SELECT 1 FROM channel_memberships cm
    WHERE cm.channel_id = message_channel_id
    AND cm.user_id = auth.uid()
  ) INTO is_member;
  
  -- Return true if user is in same org and is channel member
  RETURN (user_org_id = channel_org_id AND is_member);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION can_access_message(UUID) TO authenticated;