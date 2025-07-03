-- Migration: Fix recursive RLS policies
-- Created: 2025-07-03
-- Description: Fixes infinite recursion in RLS policies by simplifying the logic

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "users_view_accessible_channels" ON channels;
DROP POLICY IF EXISTS "users_view_channel_memberships" ON channel_memberships;

-- Create simplified channel viewing policy (without checking memberships for regular users)
CREATE POLICY "users_view_accessible_channels" ON channels
    FOR SELECT 
    TO authenticated 
    USING (
        -- Channel must be in user's organization and not deleted
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND deleted_at IS NULL
        AND (
            -- God users can see all channels
            auth.jwt() -> 'user_metadata' ->> 'role' = 'god'
            OR 
            -- Admin users can see all channels in their org
            auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
            -- Note: Regular users will need to query memberships separately
            -- to determine which channels they can access
        )
    );

-- Create simplified membership viewing policy
CREATE POLICY "users_view_channel_memberships" ON channel_memberships
    FOR SELECT 
    TO authenticated 
    USING (
        -- God and admin users can see all memberships in their org
        auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
        OR
        -- Regular users can only see their own memberships
        (
            auth.jwt() -> 'user_metadata' ->> 'role' IN ('user', 'client')
            AND user_id = auth.uid()
        )
    );

-- Create a separate policy for regular users to view channels they're members of
CREATE POLICY "users_view_member_channels" ON channels
    FOR SELECT 
    TO authenticated 
    USING (
        -- Channel must be in user's organization and not deleted
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND deleted_at IS NULL
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('user', 'client')
        AND id IN (
            -- Check memberships directly without policy recursion
            SELECT cm.channel_id 
            FROM channel_memberships cm 
            WHERE cm.user_id = auth.uid()
        )
    );