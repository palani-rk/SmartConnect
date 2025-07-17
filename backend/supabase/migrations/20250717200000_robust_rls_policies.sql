-- Migration: Comprehensive RLS Policies for Robust Security
-- Created: 2025-07-17
-- Description: Implements secure, performant RLS policies following best practices

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to check if user is org admin (admin role only)
CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.jwt() -> 'user_metadata' ->> 'role' = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organization ID
CREATE OR REPLACE FUNCTION user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has channel access
CREATE OR REPLACE FUNCTION has_channel_access(channel_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM channel_memberships cm
    JOIN channels c ON c.id = cm.channel_id
    WHERE cm.channel_id = channel_uuid
    AND cm.user_id = auth.uid()
    AND c.organization_id = user_org_id()
    AND c.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CHANNELS TABLE RLS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "god_admin_view_channels" ON channels;
DROP POLICY IF EXISTS "members_view_channels" ON channels;
DROP POLICY IF EXISTS "god_admin_create_channels" ON channels;
DROP POLICY IF EXISTS "god_admin_update_channels" ON channels;
DROP POLICY IF EXISTS "god_admin_delete_channels" ON channels;

-- Policy 1: View channels - Authenticated users can read channels they have access to
CREATE POLICY "view_accessible_channels" ON channels
  FOR SELECT TO authenticated
  USING (
    organization_id = user_org_id()
    AND deleted_at IS NULL
    AND (
      is_org_admin() OR 
      has_channel_access(id)
    )
  );

-- Policy 2: Create channels - Only org admins can create channels
CREATE POLICY "admin_create_channels" ON channels
  FOR INSERT TO authenticated
  WITH CHECK (
    is_org_admin()
    AND organization_id = user_org_id()
    AND created_by = auth.uid()
  );

-- Policy 3: Update channels - Only org admins can update channels in their org
CREATE POLICY "admin_update_channels" ON channels
  FOR UPDATE TO authenticated
  USING (
    is_org_admin()
    AND organization_id = user_org_id()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    is_org_admin()
    AND organization_id = user_org_id()
  );

-- Policy 4: Delete channels - Only org admins can delete channels in their org
CREATE POLICY "admin_delete_channels" ON channels
  FOR DELETE TO authenticated
  USING (
    is_org_admin()
    AND organization_id = user_org_id()
  );

-- =============================================================================
-- CHANNEL_MEMBERSHIPS TABLE RLS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "god_admin_view_memberships" ON channel_memberships;
DROP POLICY IF EXISTS "users_view_own_memberships" ON channel_memberships;
DROP POLICY IF EXISTS "god_admin_manage_memberships" ON channel_memberships;

-- Policy 1: View memberships - Users can see memberships for channels they access
CREATE POLICY "view_channel_memberships" ON channel_memberships
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_id
      AND c.organization_id = user_org_id()
      AND c.deleted_at IS NULL
      AND (
        is_org_admin() OR 
        has_channel_access(channel_id)
      )
    )
  );

-- Policy 2: Manage memberships - Only org admins can manage memberships
CREATE POLICY "admin_manage_memberships" ON channel_memberships
  FOR ALL TO authenticated
  USING (
    is_org_admin()
    AND EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_id
      AND c.organization_id = user_org_id()
      AND c.deleted_at IS NULL
    )
  )
  WITH CHECK (
    is_org_admin()
    AND EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_id
      AND c.organization_id = user_org_id()
      AND c.deleted_at IS NULL
    )
  );

-- =============================================================================
-- MESSAGES TABLE RLS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in their organization channels" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their organization channels" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can soft delete their own messages" ON messages;

-- Policy 1: View messages - Users can view messages in channels they have access to
CREATE POLICY "view_channel_messages" ON messages
  FOR SELECT TO authenticated
  USING (
    has_channel_access(channel_id)
    AND deleted_at IS NULL
  );

-- Policy 2: Create messages - Users can create messages in channels they belong to
CREATE POLICY "create_channel_messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND has_channel_access(channel_id)
  );

-- Policy 3: Update own messages - Users can edit their own messages
CREATE POLICY "update_own_messages" ON messages
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND has_channel_access(channel_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_id = auth.uid()
    AND has_channel_access(channel_id)
  );

-- Policy 4: Delete own messages - Users can delete their own messages
CREATE POLICY "delete_own_messages" ON messages
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND has_channel_access(channel_id)
  );

-- Policy 5: Admin delete any message - Org admins can delete any message in their channels
CREATE POLICY "admin_delete_any_message" ON messages
  FOR DELETE TO authenticated
  USING (
    is_org_admin()
    AND EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_id
      AND c.organization_id = user_org_id()
      AND c.deleted_at IS NULL
    )
  );

-- =============================================================================
-- MESSAGE_REACTIONS TABLE RLS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view reactions in accessible channels" ON message_reactions;
DROP POLICY IF EXISTS "Users can add reactions to accessible messages" ON message_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON message_reactions;

-- Policy 1: View reactions - Users can see reactions on messages in accessible channels
CREATE POLICY "view_message_reactions" ON message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
      AND has_channel_access(m.channel_id)
      AND m.deleted_at IS NULL
    )
  );

-- Policy 2: Create reactions - Users can react to messages in accessible channels
CREATE POLICY "create_message_reactions" ON message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
      AND has_channel_access(m.channel_id)
      AND m.deleted_at IS NULL
    )
  );

-- Policy 3: Update own reactions - Users can modify their own reactions
CREATE POLICY "update_own_reactions" ON message_reactions
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
      AND has_channel_access(m.channel_id)
      AND m.deleted_at IS NULL
    )
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- Policy 4: Delete own reactions - Users can remove their own reactions
CREATE POLICY "delete_own_reactions" ON message_reactions
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
      AND has_channel_access(m.channel_id)
      AND m.deleted_at IS NULL
    )
  );

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION is_org_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION has_channel_access(UUID) TO authenticated;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION is_org_admin() IS 'Returns true if current user is org admin (admin role only)';
COMMENT ON FUNCTION user_org_id() IS 'Returns the organization ID of current authenticated user';
COMMENT ON FUNCTION has_channel_access(UUID) IS 'Returns true if current user has access to specified channel';

-- Migration completed successfully
-- This migration provides:
-- 1. Secure channel access based on memberships
-- 2. Org admin privileges for channel and message management (admin role only)
-- 3. User ownership controls for messages and reactions
-- 4. Performance-optimized helper functions
-- 5. Consistent security boundaries across all tables