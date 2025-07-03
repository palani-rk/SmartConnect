-- Migration: Fix invalid user roles
-- Created: 2025-01-20
-- Description: Updates any invalid user roles to valid values and ensures consistency

-- First, let's see what roles currently exist
-- (Run this query manually first to see current state)
-- SELECT role, COUNT(*) FROM users GROUP BY role;

-- Update any users with invalid roles to 'user' as default
-- You may want to customize this based on your specific needs
UPDATE users 
SET role = 'user' 
WHERE role NOT IN ('god', 'admin', 'user', 'client');

-- If you need to create a god user for testing, uncomment and modify:
-- INSERT INTO users (id, organization_id, email, role) 
-- VALUES (
--     'your-auth-user-id-here',  -- Replace with actual auth user ID
--     (SELECT id FROM organizations LIMIT 1),  -- Use first organization
--     'admin@yourapp.com',  -- Replace with your email
--     'god'
-- ) ON CONFLICT (id) DO UPDATE SET role = 'god';

-- Ensure the role constraint is still in place
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('god', 'admin', 'user', 'client'));

-- Update any RLS policies that might be using incorrect role references
-- The policies should reference the database column, not JWT claims for this use case

-- Drop and recreate organization policies to use database roles instead of JWT
DROP POLICY IF EXISTS "god_user_select_organizations" ON organizations;
DROP POLICY IF EXISTS "god_user_insert_organizations" ON organizations;
DROP POLICY IF EXISTS "god_user_update_organizations" ON organizations;
DROP POLICY IF EXISTS "god_user_delete_organizations" ON organizations;
DROP POLICY IF EXISTS "god_user_soft_delete_organizations" ON organizations;

-- Create new policies using database user roles
CREATE POLICY "god_user_all_organizations" 
ON organizations FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'god'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'god'
    )
);

-- Policy for admin users to access their organization
CREATE POLICY "admin_user_own_organization" 
ON organizations FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'admin' 
        AND organization_id = organizations.id
    )
);

-- Add index for better performance on role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(id);