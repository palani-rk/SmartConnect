-- Migration: Add updated_at and deleted_at columns to organizations table
-- Created: 2025-01-19
-- Description: Adds audit trail and soft delete functionality to organizations table

-- Add updated_at column with default value of now()
ALTER TABLE organizations 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add deleted_at column for soft delete functionality (nullable)
ALTER TABLE organizations 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Create or replace function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Set initial updated_at value for existing records to match created_at
UPDATE organizations 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN organizations.updated_at IS 'Timestamp when the record was last updated';
COMMENT ON COLUMN organizations.deleted_at IS 'Timestamp when the record was soft deleted (NULL means not deleted)';

-- Update RLS policies to exclude soft-deleted records
-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "org_admin_select_organizations" ON organizations;
DROP POLICY IF EXISTS "god_user_select_organizations" ON organizations;

-- Recreate policies with soft delete filtering
CREATE POLICY "god_user_select_organizations" 
ON organizations FOR SELECT 
TO authenticated 
USING (
    auth.jwt() ->> 'role' = 'god' AND 
    deleted_at IS NULL
);

CREATE POLICY "org_admin_select_organizations" 
ON organizations FOR SELECT 
TO authenticated 
USING (
    auth.jwt() ->> 'role' = 'admin' AND 
    auth.jwt() ->> 'organization_id'::text = id::text AND 
    deleted_at IS NULL
);

-- Add policy for soft delete (update deleted_at) - only god users can soft delete
CREATE POLICY "god_user_soft_delete_organizations" 
ON organizations FOR UPDATE 
TO authenticated 
USING (auth.jwt() ->> 'role' = 'god')
WITH CHECK (auth.jwt() ->> 'role' = 'god');