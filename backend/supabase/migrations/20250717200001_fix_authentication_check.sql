-- Migration: Fix Authentication Check in RLS Policies
-- Created: 2025-07-17
-- Description: Ensure all policies properly validate authentication

-- =============================================================================
-- FIX CHANNELS POLICIES TO REQUIRE AUTHENTICATION
-- =============================================================================

-- Drop and recreate policies with explicit authentication checks
DROP POLICY IF EXISTS "view_accessible_channels" ON channels;
DROP POLICY IF EXISTS "admin_create_channels" ON channels;
DROP POLICY IF EXISTS "admin_update_channels" ON channels;
DROP POLICY IF EXISTS "admin_delete_channels" ON channels;

-- Policy 1: View channels - Require authentication and proper access
CREATE POLICY "view_accessible_channels" ON channels
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND organization_id = user_org_id()
    AND deleted_at IS NULL
    AND (
      is_org_admin() OR 
      has_channel_access(id)
    )
  );

-- Policy 2: Create channels - Require authentication and admin role
CREATE POLICY "admin_create_channels" ON channels
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_org_admin()
    AND organization_id = user_org_id()
    AND created_by = auth.uid()
  );

-- Policy 3: Update channels - Require authentication and admin role
CREATE POLICY "admin_update_channels" ON channels
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND is_org_admin()
    AND organization_id = user_org_id()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_org_admin()
    AND organization_id = user_org_id()
  );

-- Policy 4: Delete channels - Require authentication and admin role
CREATE POLICY "admin_delete_channels" ON channels
  FOR DELETE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND is_org_admin()
    AND organization_id = user_org_id()
  );

-- =============================================================================
-- FIX CHANNEL_MEMBERSHIPS POLICIES TO REQUIRE AUTHENTICATION
-- =============================================================================

DROP POLICY IF EXISTS "view_channel_memberships" ON channel_memberships;
DROP POLICY IF EXISTS "admin_manage_memberships" ON channel_memberships;

-- Policy 1: View memberships - Require authentication
CREATE POLICY "view_channel_memberships" ON channel_memberships
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
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

-- Policy 2: Manage memberships - Require authentication and admin role
CREATE POLICY "admin_manage_memberships" ON channel_memberships
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND is_org_admin()
    AND EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_id
      AND c.organization_id = user_org_id()
      AND c.deleted_at IS NULL
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_org_admin()
    AND EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_id
      AND c.organization_id = user_org_id()
      AND c.deleted_at IS NULL
    )
  );

-- =============================================================================
-- FIX MESSAGES POLICIES TO REQUIRE AUTHENTICATION
-- =============================================================================

DROP POLICY IF EXISTS "view_channel_messages" ON messages;
DROP POLICY IF EXISTS "create_channel_messages" ON messages;
DROP POLICY IF EXISTS "update_own_messages" ON messages;
DROP POLICY IF EXISTS "delete_own_messages" ON messages;
DROP POLICY IF EXISTS "admin_delete_any_message" ON messages;

-- Policy 1: View messages - Require authentication
CREATE POLICY "view_channel_messages" ON messages
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND has_channel_access(channel_id)
    AND deleted_at IS NULL
  );

-- Policy 2: Create messages - Require authentication
CREATE POLICY "create_channel_messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND has_channel_access(channel_id)
  );

-- Policy 3: Update own messages - Require authentication
CREATE POLICY "update_own_messages" ON messages
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND has_channel_access(channel_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND has_channel_access(channel_id)
  );

-- Policy 4: Delete own messages - Require authentication
CREATE POLICY "delete_own_messages" ON messages
  FOR DELETE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND has_channel_access(channel_id)
  );

-- Policy 5: Admin delete any message - Require authentication and admin role
CREATE POLICY "admin_delete_any_message" ON messages
  FOR DELETE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND is_org_admin()
    AND EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_id
      AND c.organization_id = user_org_id()
      AND c.deleted_at IS NULL
    )
  );

-- =============================================================================
-- FIX MESSAGE_REACTIONS POLICIES TO REQUIRE AUTHENTICATION
-- =============================================================================

DROP POLICY IF EXISTS "view_message_reactions" ON message_reactions;
DROP POLICY IF EXISTS "create_message_reactions" ON message_reactions;
DROP POLICY IF EXISTS "update_own_reactions" ON message_reactions;
DROP POLICY IF EXISTS "delete_own_reactions" ON message_reactions;

-- Policy 1: View reactions - Require authentication
CREATE POLICY "view_message_reactions" ON message_reactions
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
      AND has_channel_access(m.channel_id)
      AND m.deleted_at IS NULL
    )
  );

-- Policy 2: Create reactions - Require authentication
CREATE POLICY "create_message_reactions" ON message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
      AND has_channel_access(m.channel_id)
      AND m.deleted_at IS NULL
    )
  );

-- Policy 3: Update own reactions - Require authentication
CREATE POLICY "update_own_reactions" ON message_reactions
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
      AND has_channel_access(m.channel_id)
      AND m.deleted_at IS NULL
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Policy 4: Delete own reactions - Require authentication
CREATE POLICY "delete_own_reactions" ON message_reactions
  FOR DELETE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
      AND has_channel_access(m.channel_id)
      AND m.deleted_at IS NULL
    )
  );

-- Migration completed successfully
-- All policies now explicitly check for authentication with auth.uid() IS NOT NULL