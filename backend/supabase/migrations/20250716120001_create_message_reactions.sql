-- Migration: create_message_reactions.sql
-- Create message_reactions table for emoji reactions to messages

CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(message_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_reactions_user_id ON message_reactions(user_id);
CREATE INDEX idx_reactions_emoji ON message_reactions(emoji);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view reactions in their channels" ON message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN channel_memberships cm ON m.channel_id = cm.channel_id
      WHERE m.id = message_reactions.message_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own reactions" ON message_reactions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());