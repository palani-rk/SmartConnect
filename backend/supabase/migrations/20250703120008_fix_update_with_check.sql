-- Migration: Fix UPDATE WITH CHECK policy to allow soft deletion
-- Created: 2025-07-03
-- Description: Allow setting deleted_at in the WITH CHECK clause

-- Drop and recreate the update policy to allow soft deletion in WITH CHECK
DROP POLICY IF EXISTS "god_admin_update_channels" ON channels;

CREATE POLICY "god_admin_update_channels" ON channels
    FOR UPDATE 
    TO authenticated 
    USING (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
    )
    WITH CHECK (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
        AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('god', 'admin')
        -- Allow the updated row to have any deleted_at value (including setting it for soft delete)
    );