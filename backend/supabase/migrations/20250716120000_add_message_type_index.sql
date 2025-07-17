-- Migration: add_message_type_index.sql
-- Add index for message_type column to improve query performance for multi-modal messages

CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);

-- Enhanced metadata structure documentation:
/*
Metadata structure by message type:
- text: { formatting: { bold: [], italic: [], mentions: [] } }
- image: { url: string, thumbnail: string, width: number, height: number, size: number, filename: string }
- audio: { url: string, duration: number, size: number, waveform: number[], filename: string }
- file: { url: string, filename: string, size: number, mimeType: string, downloadUrl: string }
*/