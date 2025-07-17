-- Migration: create_reaction_functions.sql
-- Create database functions for reaction management

CREATE OR REPLACE FUNCTION get_reaction_counts(p_message_id UUID)
RETURNS TABLE (emoji TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
    SELECT mr.emoji, COUNT(*)
    FROM message_reactions mr
    WHERE mr.message_id = p_message_id
    GROUP BY mr.emoji
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_messages_with_reactions(p_channel_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID, channel_id UUID, user_id UUID, content TEXT, message_type TEXT,
  metadata JSONB, thread_id UUID, is_pinned BOOLEAN, is_edited BOOLEAN,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ,
  author_email TEXT, author_role TEXT, channel_name TEXT,
  reactions JSONB
) AS $$
BEGIN
  RETURN QUERY
    SELECT 
      m.id, m.channel_id, m.user_id, m.content, m.message_type,
      m.metadata, m.thread_id, m.is_pinned, m.is_edited,
      m.created_at, m.updated_at, m.deleted_at,
      u.email as author_email, u.role as author_role, c.name as channel_name,
      COALESCE(
        (SELECT json_agg(json_build_object('emoji', emoji, 'count', count))
         FROM get_reaction_counts(m.id)), '[]'::json
      )::JSONB as reactions
    FROM messages m
    JOIN users u ON m.user_id = u.id
    JOIN channels c ON m.channel_id = c.id
    WHERE m.channel_id = p_channel_id
      AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_reaction_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_messages_with_reactions(UUID, INTEGER) TO authenticated;