-- Migration: Add deleted_at column to channels table
-- Created: 2025-07-03
-- Description: Adds deleted_at column for soft deletion functionality

-- Add deleted_at column to channels table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'channels' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE channels ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;