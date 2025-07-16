-- Migration: Create channel_memberships table
-- Created: 2025-07-03
-- Description: Creates channel_memberships table if it doesn't exist

-- Create channel_memberships table if it doesn't exist
CREATE TABLE IF NOT EXISTS channel_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_channel_memberships_channel_id ON channel_memberships(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_memberships_user_id ON channel_memberships(user_id);

-- Enable RLS
ALTER TABLE channel_memberships ENABLE ROW LEVEL SECURITY;

-- RLS policies for channel_memberships
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

-- Add comments
COMMENT ON TABLE channel_memberships IS 'User memberships in channels';
COMMENT ON COLUMN channel_memberships.role IS 'User role in the channel: admin (can manage) or member (can participate)';