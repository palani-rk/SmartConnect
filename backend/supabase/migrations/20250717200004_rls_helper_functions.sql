-- Migration: RLS Helper Functions for Code Reusability
-- Created: 2025-07-17
-- Description: Create reusable helper functions for RLS policies

-- =============================================================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- =============================================================================

-- Function 1: Check if user is authenticated
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function 2: Get user's organization ID from JWT
CREATE OR REPLACE FUNCTION user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function 3: Get user's role from JWT
CREATE OR REPLACE FUNCTION user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.jwt() -> 'user_metadata' ->> 'role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function 4: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function 5: Check if user is authenticated and in organization
CREATE OR REPLACE FUNCTION is_authenticated_org_user(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth_user_id() IS NOT NULL 
    AND user_organization_id() = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function 6: Check if user has channel membership
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

-- Function 7: Check if channel exists and is active in user's org
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

-- Function 8: Check if user can access channel (member or admin)
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

-- Function 9: Check if user can manage channel operations (admin only)
CREATE OR REPLACE FUNCTION can_manage_channel(channel_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_authenticated_org_user(
    (SELECT organization_id FROM channels WHERE id = channel_uuid)
  ) AND is_admin_user() 
  AND is_valid_org_channel(channel_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function 10: Check if user owns a message
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

-- Function 11: Check if message is in accessible channel
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

-- Function 12: Check if user can delete message (own message or admin)
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

-- Function 13: Check if user owns a reaction
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

-- Function 14: Check if reaction is on accessible message
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
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION auth_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION is_authenticated_org_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_channel_membership(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_org_channel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_channel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_channel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION owns_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION owns_reaction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_reaction(UUID) TO authenticated;

-- =============================================================================
-- DOCUMENTATION COMMENTS
-- =============================================================================

COMMENT ON FUNCTION auth_user_id() IS 'Returns the authenticated user ID or NULL if not authenticated';
COMMENT ON FUNCTION user_organization_id() IS 'Returns the authenticated user organization ID from JWT metadata';
COMMENT ON FUNCTION user_role() IS 'Returns the authenticated user role from JWT metadata';
COMMENT ON FUNCTION is_admin_user() IS 'Returns true if authenticated user has admin role';
COMMENT ON FUNCTION is_authenticated_org_user(UUID) IS 'Returns true if user is authenticated and belongs to specified organization';
COMMENT ON FUNCTION has_channel_membership(UUID) IS 'Returns true if authenticated user is a member of specified channel';
COMMENT ON FUNCTION is_valid_org_channel(UUID) IS 'Returns true if channel exists, is active, and belongs to user organization';
COMMENT ON FUNCTION can_access_channel(UUID) IS 'Returns true if user can access channel (member or admin in same org)';
COMMENT ON FUNCTION can_manage_channel(UUID) IS 'Returns true if user can manage channel operations (admin only)';
COMMENT ON FUNCTION owns_message(UUID) IS 'Returns true if authenticated user owns the specified message';
COMMENT ON FUNCTION can_access_message(UUID) IS 'Returns true if user can access message (in accessible channel)';
COMMENT ON FUNCTION can_delete_message(UUID) IS 'Returns true if user can delete message (owner or admin)';
COMMENT ON FUNCTION owns_reaction(UUID) IS 'Returns true if authenticated user owns the specified reaction';
COMMENT ON FUNCTION can_access_reaction(UUID) IS 'Returns true if user can access reaction (on accessible message)';

-- Migration completed successfully
-- Helper functions created for:
-- 1. Authentication and user identity
-- 2. Organization and role validation
-- 3. Channel access control
-- 4. Message and reaction permissions
-- 5. Code reusability across RLS policies