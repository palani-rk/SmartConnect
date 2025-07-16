-- Migration: create_messages_table.sql
-- Create messages table with complete schema for messaging system foundation

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'file')),
  metadata JSONB DEFAULT '{}',
  thread_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_channel_id_created_at ON messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_channel_active ON messages(channel_id, created_at DESC) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_messages_updated_at ON messages;
CREATE TRIGGER trigger_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();

-- Create database function for message pagination
CREATE OR REPLACE FUNCTION get_messages_paginated(
  p_channel_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  channel_id UUID,
  user_id UUID,
  content TEXT,
  message_type TEXT,
  metadata JSONB,
  thread_id UUID,
  is_pinned BOOLEAN,
  is_edited BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  author_email TEXT,
  author_role TEXT,
  channel_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.channel_id,
    m.user_id,
    m.content,
    m.message_type,
    m.metadata,
    m.thread_id,
    m.is_pinned,
    m.is_edited,
    m.created_at,
    m.updated_at,
    m.deleted_at,
    u.email as author_email,
    u.role as author_role,
    c.name as channel_name
  FROM messages m
  JOIN users u ON m.user_id = u.id
  JOIN channels c ON m.channel_id = c.id
  WHERE m.channel_id = p_channel_id
    AND m.deleted_at IS NULL
    AND (p_cursor IS NULL OR m.created_at < p_cursor)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_messages_paginated(UUID, INTEGER, TIMESTAMPTZ) TO authenticated;