-- Debug RLS policies and status
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('channels', 'channel_memberships', 'messages', 'message_reactions') 
AND schemaname = 'public';

-- Check current policies on channels
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'channels' 
AND schemaname = 'public'
ORDER BY policyname;

-- Check current policies on channel_memberships
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'channel_memberships' 
AND schemaname = 'public'
ORDER BY policyname;

-- Check if there are any permissive anon policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND 'anon' = ANY(roles)
AND permissive = 'PERMISSIVE'
ORDER BY tablename, policyname;