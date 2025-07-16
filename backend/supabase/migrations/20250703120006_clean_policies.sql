-- Migration: Clean and rebuild all RLS policies
-- Created: 2025-07-03
-- Description: Remove all policies and create clean, non-recursive ones

-- Drop all existing policies on channels
DROP POLICY IF EXISTS "users_view_accessible_channels" ON channels;
DROP POLICY IF EXISTS "users_view_member_channels" ON channels;
DROP POLICY IF EXISTS "admins_create_channels" ON channels;
DROP POLICY IF EXISTS "admins_update_channels" ON channels;
DROP POLICY IF EXISTS "admins_delete_channels" ON channels;

-- Drop all existing policies on channel_memberships
DROP POLICY IF EXISTS "users_view_channel_memberships" ON channel_memberships;
DROP POLICY IF EXISTS "admins_manage_channel_memberships" ON channel_memberships;

-- Create simple, non-recursive policies for channels
-- Policy 1: God and admin users can view all channels in their org
CREATE POLICY "god_admin_view_channels" ON channels
    FOR SELECT 
    TO authenticated 
    USING (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND deleted_at IS NULL
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
    );

-- Policy 2: Regular users can view channels where they have membership
CREATE POLICY "members_view_channels" ON channels
    FOR SELECT 
    TO authenticated 
    USING (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND deleted_at IS NULL
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('user', 'client')
        AND EXISTS (
            SELECT 1 FROM channel_memberships 
            WHERE channel_id = channels.id 
            AND user_id = auth.uid()
        )
    );

-- Policy 3: Only god and admin users can create channels
CREATE POLICY "god_admin_create_channels" ON channels
    FOR INSERT 
    TO authenticated 
    WITH CHECK (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
        AND created_by = auth.uid()
    );

-- Policy 4: Only god and admin users can update channels
CREATE POLICY "god_admin_update_channels" ON channels
    FOR UPDATE 
    TO authenticated 
    USING (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
        AND deleted_at IS NULL
    )
    WITH CHECK (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
    );

-- Policy 5: Only god and admin users can delete channels
CREATE POLICY "god_admin_delete_channels" ON channels
    FOR DELETE 
    TO authenticated 
    USING (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
    );

-- Create simple policies for channel_memberships
-- Policy 1: God and admin users can view all memberships in their org
CREATE POLICY "god_admin_view_memberships" ON channel_memberships
    FOR SELECT 
    TO authenticated 
    USING (
        auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
    );

-- Policy 2: Regular users can view their own memberships
CREATE POLICY "users_view_own_memberships" ON channel_memberships
    FOR SELECT 
    TO authenticated 
    USING (
        auth.jwt() -> 'user_metadata' ->> 'role' IN ('user', 'client')
        AND user_id = auth.uid()
    );

-- Policy 3: Only god and admin users can manage memberships
CREATE POLICY "god_admin_manage_memberships" ON channel_memberships
    FOR ALL 
    TO authenticated 
    USING (
        auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
    )
    WITH CHECK (
        auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
    );