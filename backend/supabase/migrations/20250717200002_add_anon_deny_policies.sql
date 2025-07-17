-- Migration: Add explicit deny policies for anonymous users
-- Created: 2025-07-17
-- Description: Add policies to explicitly deny anonymous access to all tables

-- =============================================================================
-- DENY POLICIES FOR ANONYMOUS USERS
-- =============================================================================

-- Channels table - deny all anonymous access
CREATE POLICY "deny_anon_channels_select" ON channels
  FOR SELECT TO anon
  USING (false);

CREATE POLICY "deny_anon_channels_insert" ON channels
  FOR INSERT TO anon
  WITH CHECK (false);

CREATE POLICY "deny_anon_channels_update" ON channels
  FOR UPDATE TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "deny_anon_channels_delete" ON channels
  FOR DELETE TO anon
  USING (false);

-- Channel memberships table - deny all anonymous access
CREATE POLICY "deny_anon_memberships_select" ON channel_memberships
  FOR SELECT TO anon
  USING (false);

CREATE POLICY "deny_anon_memberships_insert" ON channel_memberships
  FOR INSERT TO anon
  WITH CHECK (false);

CREATE POLICY "deny_anon_memberships_update" ON channel_memberships
  FOR UPDATE TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "deny_anon_memberships_delete" ON channel_memberships
  FOR DELETE TO anon
  USING (false);

-- Messages table - deny all anonymous access
CREATE POLICY "deny_anon_messages_select" ON messages
  FOR SELECT TO anon
  USING (false);

CREATE POLICY "deny_anon_messages_insert" ON messages
  FOR INSERT TO anon
  WITH CHECK (false);

CREATE POLICY "deny_anon_messages_update" ON messages
  FOR UPDATE TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "deny_anon_messages_delete" ON messages
  FOR DELETE TO anon
  USING (false);

-- Message reactions table - deny all anonymous access
CREATE POLICY "deny_anon_reactions_select" ON message_reactions
  FOR SELECT TO anon
  USING (false);

CREATE POLICY "deny_anon_reactions_insert" ON message_reactions
  FOR INSERT TO anon
  WITH CHECK (false);

CREATE POLICY "deny_anon_reactions_update" ON message_reactions
  FOR UPDATE TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "deny_anon_reactions_delete" ON message_reactions
  FOR DELETE TO anon
  USING (false);

-- Migration completed successfully
-- All tables now explicitly deny anonymous access