-- Migration: Create channel management system
-- Created: 2025-07-03
-- Description: Creates channels and channel_memberships tables with proper RLS policies

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(organization_id, name)
);

-- Create channel memberships table
CREATE TABLE IF NOT EXISTS channel_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_channels_organization_id ON channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON channels(created_by);
CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);
CREATE INDEX IF NOT EXISTS idx_channel_memberships_channel_id ON channel_memberships(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_memberships_user_id ON channel_memberships(user_id);

-- Create trigger to update updated_at column for channels
DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on both tables
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_memberships ENABLE ROW LEVEL SECURITY;

-- Channel RLS policies
-- Users can view channels in their organization (if they have access)
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

-- Only admins and god users can create channels
DROP POLICY IF EXISTS "admins_create_channels" ON channels;
CREATE POLICY "admins_create_channels" ON channels
    FOR INSERT 
    TO authenticated 
    WITH CHECK (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
        AND created_by = auth.uid()
    );

-- Only admins and god users can update channels (in their org)
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

-- Only admins and god users can delete channels (soft delete via updated_at)
DROP POLICY IF EXISTS "admins_delete_channels" ON channels;
CREATE POLICY "admins_delete_channels" ON channels
    FOR DELETE 
    TO authenticated 
    USING (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
    );

-- Channel membership RLS policies
-- Users can view memberships for channels they have access to
DROP POLICY IF EXISTS "users_view_channel_memberships" ON channel_memberships;
CREATE POLICY "users_view_channel_memberships" ON channel_memberships
    FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = channel_id
            AND c.organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
            AND c.deleted_at IS NULL
            AND (
                -- God users can see all memberships
                auth.jwt() -> 'user_metadata' ->> 'role' = 'god'
                OR 
                -- Admin users can see all memberships in their org
                auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
                OR
                -- Regular users can only see memberships for channels they're in
                (
                    auth.jwt() -> 'user_metadata' ->> 'role' IN ('user', 'client')
                    AND EXISTS (
                        SELECT 1 FROM channel_memberships cm2
                        WHERE cm2.channel_id = channel_id
                        AND cm2.user_id = auth.uid()
                    )
                )
            )
        )
    );

-- Only admins and god users can manage channel memberships
DROP POLICY IF EXISTS "admins_manage_channel_memberships" ON channel_memberships;
CREATE POLICY "admins_manage_channel_memberships" ON channel_memberships
    FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = channel_id
            AND c.organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
            AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
            AND c.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = channel_id
            AND c.organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
            AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
            AND c.deleted_at IS NULL
        )
    );

-- Add comments for documentation
COMMENT ON TABLE channels IS 'Channels for organizing communication within organizations';
COMMENT ON TABLE channel_memberships IS 'User memberships in channels';
COMMENT ON COLUMN channels.type IS 'Channel visibility: public (visible to all org members) or private (invite-only)';
COMMENT ON COLUMN channels.deleted_at IS 'Timestamp when channel was soft deleted (NULL means active)';
COMMENT ON COLUMN channel_memberships.role IS 'User role in the channel: admin (can manage) or member (can participate)';