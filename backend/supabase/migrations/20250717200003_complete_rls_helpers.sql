-- Migration: Complete RLS Helper Functions
-- Created: 2025-07-17
-- Description: All helper functions needed for RLS policies

-- =============================================================================
-- CORE AUTHENTICATION & USER FUNCTIONS
-- =============================================================================

-- Get authenticated user ID
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's organization ID from JWT
CREATE OR REPLACE FUNCTION user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Legacy alias for existing policies
CREATE OR REPLACE FUNCTION user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN user_organization_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's role from JWT
CREATE OR REPLACE FUNCTION user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.jwt() -> 'user_metadata' ->> 'role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is admin (current naming)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Legacy alias for existing policies
CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is authenticated and in specific organization
CREATE OR REPLACE FUNCTION is_authenticated_org_user(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth_user_id() IS NOT NULL 
    AND user_organization_id() = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- CHANNEL ACCESS FUNCTIONS
-- =============================================================================

-- Check if user has channel membership
CREATE OR REPLACE FUNCTION has_channel_membership(channel_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM channel_memberships cm
    WHERE cm.channel_id = channel_uuid
    AND cm.user_id = auth_user_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Legacy alias for existing policies
CREATE OR REPLACE FUNCTION has_channel_access(channel_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM channel_memberships cm
    JOIN channels c ON c.id = cm.channel_id
    WHERE cm.channel_id = channel_uuid
    AND cm.user_id = auth_user_id()
    AND c.organization_id = user_org_id()
    AND c.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if channel exists and is active in user's org
CREATE OR REPLACE FUNCTION is_valid_org_channel(channel_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = channel_uuid
    AND c.organization_id = user_organization_id()
    AND c.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can access channel (member or admin)
CREATE OR REPLACE FUNCTION can_access_channel(channel_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_authenticated_org_user(
    (SELECT organization_id FROM channels WHERE id = channel_uuid)
  ) AND (
    is_admin_user() OR 
    has_channel_membership(channel_uuid)
  ) AND is_valid_org_channel(channel_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can manage channel operations (admin only)
CREATE OR REPLACE FUNCTION can_manage_channel(channel_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_authenticated_org_user(
    (SELECT organization_id FROM channels WHERE id = channel_uuid)
  ) AND is_admin_user() 
  AND is_valid_org_channel(channel_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- MESSAGE ACCESS FUNCTIONS
-- =============================================================================

-- Check if user owns a message
CREATE OR REPLACE FUNCTION owns_message(message_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = message_uuid
    AND m.user_id = auth_user_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if message is in accessible channel
-- Drop existing function to avoid parameter name conflicts
DROP FUNCTION IF EXISTS can_access_message(uuid);

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

-- Check if user can delete message (own message or admin)
CREATE OR REPLACE FUNCTION can_delete_message(message_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  msg_channel_id UUID;
BEGIN
  SELECT channel_id INTO msg_channel_id
  FROM messages 
  WHERE id = message_uuid;
  
  RETURN msg_channel_id IS NOT NULL AND (
    owns_message(message_uuid) OR 
    can_manage_channel(msg_channel_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- REACTION ACCESS FUNCTIONS
-- =============================================================================

-- Check if user owns a reaction
CREATE OR REPLACE FUNCTION owns_reaction(reaction_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM message_reactions mr
    WHERE mr.id = reaction_uuid
    AND mr.user_id = auth_user_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if reaction is on accessible message
CREATE OR REPLACE FUNCTION can_access_reaction(reaction_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  msg_id UUID;
BEGIN
  SELECT message_id INTO msg_id
  FROM message_reactions 
  WHERE id = reaction_uuid;
  
  RETURN msg_id IS NOT NULL 
    AND can_access_message(msg_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION auth_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_authenticated_org_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_channel_membership(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_channel_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_org_channel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_channel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_channel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION owns_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION owns_reaction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_reaction(UUID) TO authenticated;

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION auth_user_id() IS 'Returns authenticated user ID or NULL';
COMMENT ON FUNCTION user_organization_id() IS 'Returns user org ID from JWT metadata';
COMMENT ON FUNCTION user_org_id() IS 'Legacy alias for user_organization_id()';
COMMENT ON FUNCTION user_role() IS 'Returns user role from JWT metadata';
COMMENT ON FUNCTION is_admin_user() IS 'Returns true if user has admin role';
COMMENT ON FUNCTION is_org_admin() IS 'Legacy alias for is_admin_user()';
COMMENT ON FUNCTION is_authenticated_org_user(UUID) IS 'Returns true if user is authenticated and in specified org';
COMMENT ON FUNCTION has_channel_membership(UUID) IS 'Returns true if user is member of channel';
COMMENT ON FUNCTION has_channel_access(UUID) IS 'Legacy function - returns true if user can access channel';
COMMENT ON FUNCTION is_valid_org_channel(UUID) IS 'Returns true if channel is active in user org';
COMMENT ON FUNCTION can_access_channel(UUID) IS 'Returns true if user can access channel (member or admin)';
COMMENT ON FUNCTION can_manage_channel(UUID) IS 'Returns true if user can manage channel (admin only)';
COMMENT ON FUNCTION owns_message(UUID) IS 'Returns true if user owns the message';
COMMENT ON FUNCTION can_access_message(UUID) IS 'Returns true if user can access message';
COMMENT ON FUNCTION can_delete_message(UUID) IS 'Returns true if user can delete message (owner or admin)';
COMMENT ON FUNCTION owns_reaction(UUID) IS 'Returns true if user owns the reaction';
COMMENT ON FUNCTION can_access_reaction(UUID) IS 'Returns true if user can access reaction';

-- Migration completed - all helper functions defined