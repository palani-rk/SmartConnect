-- Check RLS status on channels table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasrls
FROM pg_tables 
WHERE tablename = 'channels' AND schemaname = 'public';

-- Also check for existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'channels' AND schemaname = 'public';