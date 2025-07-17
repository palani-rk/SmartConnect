-- Migration: update_message_reactions_constraint.sql
-- Update message_reactions table to enforce one emoji per user per message

-- Drop the existing unique constraint
ALTER TABLE message_reactions DROP CONSTRAINT IF EXISTS message_reactions_message_id_user_id_emoji_key;

-- Add new unique constraint: one reaction per user per message
ALTER TABLE message_reactions ADD CONSTRAINT message_reactions_message_id_user_id_key UNIQUE (message_id, user_id);