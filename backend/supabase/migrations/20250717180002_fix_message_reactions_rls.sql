-- Migration: fix_message_reactions_rls.sql
-- Fix RLS policies for message_reactions to allow proper reaction management

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view reactions in their channels" ON message_reactions;
DROP POLICY IF EXISTS "Users can manage their own reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can insert their own reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON message_reactions;

-- Create improved RLS policies
-- Policy 1: Allow viewing reactions for messages in channels user has access to
CREATE POLICY "Users can view reactions in accessible channels" ON message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN channel_memberships cm ON m.channel_id = cm.channel_id
      WHERE m.id = message_reactions.message_id 
      AND cm.user_id = auth.uid()
    )
  );

-- Policy 2: Allow users to insert reactions for messages in their channels
CREATE POLICY "Users can add reactions to accessible messages" ON message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM messages m
      JOIN channel_memberships cm ON m.channel_id = cm.channel_id
      WHERE m.id = message_reactions.message_id 
      AND cm.user_id = auth.uid()
    )
  );

-- Policy 3: Allow users to update their own reactions
CREATE POLICY "Users can update their own reactions" ON message_reactions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Allow users to delete their own reactions
CREATE POLICY "Users can delete their own reactions" ON message_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());