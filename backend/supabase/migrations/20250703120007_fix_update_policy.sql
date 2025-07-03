-- Migration: Fix UPDATE policy to allow soft deletion
-- Created: 2025-07-03
-- Description: Modify update policy to allow setting deleted_at

-- Drop and recreate the update policy to allow soft deletion
DROP POLICY IF EXISTS "god_admin_update_channels" ON channels;

CREATE POLICY "god_admin_update_channels" ON channels
    FOR UPDATE 
    TO authenticated 
    USING (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
        -- Remove the deleted_at IS NULL requirement from USING clause
        -- to allow updating channels for soft deletion
    )
    WITH CHECK (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
    );