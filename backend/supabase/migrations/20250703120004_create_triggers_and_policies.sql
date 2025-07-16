-- Migration: Create triggers and RLS policies for channels
-- Created: 2025-07-03
-- Description: Creates triggers and policies that may have failed in original migration

-- Create trigger to update updated_at column for channels
DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on both tables (idempotent)
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_memberships ENABLE ROW LEVEL SECURITY;

-- Channel RLS policies
DROP POLICY IF EXISTS "users_view_accessible_channels" ON channels;
CREATE POLICY "users_view_accessible_channels" ON channels
    FOR SELECT 
    TO authenticated 
    USING (
        -- Channel must be in user's organization
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND deleted_at IS NULL
        AND (
            -- God users can see all channels
            auth.jwt() -> 'user_metadata' ->> 'role' = 'god'
            OR 
            -- Admin users can see all channels in their org
            auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
            OR
            -- Regular users can only see channels they're members of
            (
                auth.jwt() -> 'user_metadata' ->> 'role' IN ('user', 'client')
                AND EXISTS (
                    SELECT 1 FROM channel_memberships cm
                    WHERE cm.channel_id = channels.id
                    AND cm.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "admins_create_channels" ON channels;
CREATE POLICY "admins_create_channels" ON channels
    FOR INSERT 
    TO authenticated 
    WITH CHECK (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
        AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "admins_update_channels" ON channels;
CREATE POLICY "admins_update_channels" ON channels
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

DROP POLICY IF EXISTS "admins_delete_channels" ON channels;
CREATE POLICY "admins_delete_channels" ON channels
    FOR DELETE 
    TO authenticated 
    USING (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
    );