# Phase 2: Multi-Modal Support System Design

## Overview
This document outlines the system design for Phase 2 of the messaging system implementation, focusing on multi-modal message support including images, audio, files, and reactions.

**Key Finding**: The messaging foundation from Phase 1 is already implemented with multi-modal support. The `messages` table already includes `message_type` and `metadata` JSONB fields that support text, image, audio, and file message types. This phase focuses on implementing the frontend components and backend file handling logic.

## Requirements Summary

### Core Features
- **Image Upload & Preview**: Users can share images with automatic preview generation
- **File Attachment Handling**: Support for various file types with validation and download
- **Audio Message Recording**: Record and playback voice messages
- **Message Reactions**: Emoji reactions to messages with user tracking
- **Rich Text Formatting**: Markdown support with mentions and formatting

### Non-Functional Requirements
- **Performance**: File upload progress < 2s for images, < 5s for audio
- **Scalability**: Support 100+ concurrent file uploads
- **Security**: File type validation, malware scanning, access controls
- **Storage**: Efficient file storage with CDN delivery

## System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Storage       │
│   React App     │◄──►│   Supabase      │◄──►│   File Storage  │
│                 │    │   Edge Functions│    │   CDN           │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   State Mgmt    │    │   Database      │    │   Media         │
│   Zustand       │    │   PostgreSQL    │    │   Processing    │
│   Optimistic    │    │   RLS Policies  │    │   Optimization  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

# Backend Implementation

## Database Schema

### Existing Messages Table (Already Implemented)
Based on the existing implementation, the `messages` table already supports multi-modal messages:

```sql
-- Messages table is already implemented with multi-modal support
CREATE TABLE messages (
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

-- Existing indexes
CREATE INDEX idx_messages_channel_id_created_at ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_messages_channel_active ON messages(channel_id, created_at DESC) WHERE deleted_at IS NULL;
```

### Required Schema Extensions for Phase 2

#### Additional Message Indexes
```sql
-- File: /migrations/20250716120000_add_message_type_index.sql
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);

-- Enhanced metadata structure documentation:
/*
Metadata structure by message type:
- text: { formatting: { bold: [], italic: [], mentions: [] } }
- image: { url: string, thumbnail: string, width: number, height: number, size: number, filename: string }
- audio: { url: string, duration: number, size: number, waveform: number[], filename: string }
- file: { url: string, filename: string, size: number, mimeType: string, downloadUrl: string }
*/
```

#### Message Reactions Table
```sql
-- File: /migrations/20250716120001_create_message_reactions.sql
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(message_id, user_id, emoji)
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
```

#### Database Functions for Reactions
```sql
-- File: /migrations/20250716120002_create_reaction_functions.sql
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
```

## Supabase Storage Configuration

### Storage Buckets Setup
```sql
-- File: /migrations/20250716120003_setup_storage_buckets.sql
-- Create storage buckets for different file types
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES 
  ('message-images', 'message-images', true, 
   '{"image/jpeg","image/png","image/gif","image/webp"}', 
   10485760), -- 10MB
  ('message-audio', 'message-audio', true, 
   '{"audio/mpeg","audio/wav","audio/ogg","audio/webm"}', 
   26214400), -- 25MB
  ('message-files', 'message-files', false, 
   '{"*"}', 
   104857600); -- 100MB

-- Storage policies
CREATE POLICY "Users can upload files to their channels" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('message-images', 'message-audio', 'message-files')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view files in their channels" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('message-images', 'message-audio', 'message-files')
    AND (
      bucket_id IN ('message-images', 'message-audio') -- Public buckets
      OR auth.uid()::text = (storage.foldername(name))[1] -- Private files
    )
  );
```

## Edge Functions

### Message Operations Function
```typescript
// File: /functions/message-operations/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface MessageOperationRequest {
  action: 'add_reaction' | 'remove_reaction' | 'upload_file' | 'process_audio';
  message_id?: string;
  emoji?: string;
  file_data?: {
    filename: string;
    content_type: string;
    file_size: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const { action, message_id, emoji, file_data } = await req.json()

    switch (action) {
      case 'add_reaction':
        return await handleAddReaction(message_id, emoji, user.id)
      case 'remove_reaction':
        return await handleRemoveReaction(message_id, emoji, user.id)
      case 'upload_file':
        return await handleFileUpload(file_data, user.id)
      case 'process_audio':
        return await handleAudioProcessing(message_id, user.id)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: corsHeaders }
        )
    }
  } catch (error) {
    console.error('Error in message-operations:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})

async function handleAddReaction(messageId: string, emoji: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        emoji: emoji
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return new Response(
          JSON.stringify({ error: 'Reaction already exists' }),
          { status: 409, headers: corsHeaders }
        )
      }
      throw error
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 201, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error adding reaction:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to add reaction' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

async function handleRemoveReaction(messageId: string, emoji: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error removing reaction:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to remove reaction' }),
      { status: 500, headers: corsHeaders }
    )
  }
}

async function handleFileUpload(fileData: any, userId: string) {
  // File upload logic would go here
  // This is a placeholder for the actual implementation
  return new Response(
    JSON.stringify({ success: true, message: 'File upload handled' }),
    { status: 200, headers: corsHeaders }
  )
}

async function handleAudioProcessing(messageId: string, userId: string) {
  // Audio processing logic would go here
  // This is a placeholder for the actual implementation
  return new Response(
    JSON.stringify({ success: true, message: 'Audio processing handled' }),
    { status: 200, headers: corsHeaders }
  )
}
```

## Backend Integration Testing Strategy

### Test Organization Setup
Based on existing test infrastructure from `/backend/supabase/integration_tests/`:
- **Test Organization**: `Integration_Testing` (ID: d5b7b961-9005-4443-8680-4b16f7181a51)
- **Test Users**: 
  - Admin: purajan.rk@gmail.com
  - User: testuser@test.com  
  - Client: testclient@test.com
- **Test Prefixes**: `test-ch-`, `test-mem-`, `test-msg-`

### Message Reactions Integration Tests
```typescript
// File: /backend/supabase/integration_tests/message-reactions.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Database } from '../supabase';
import { 
  BACKEND_TEST_CONFIG,
  TEST_ORG_ID,
  TEST_ADMIN_USER,
  TEST_REGULAR_USER,
  generateTestName
} from './fixtures/testConfig';
import { 
  supabase, 
  authenticateTestUser, 
  signOutTestUser, 
  trackTestData, 
  cleanupTestData 
} from './setup';

describe('Message Reactions Backend Integration', () => {
  let testChannelId: string;
  let testMessageId: string;
  let testUserId: string;
  let createdReactions: string[] = [];

  beforeAll(async () => {
    // Setup test channel and message using existing patterns
    const adminUser = await authenticateTestUser('admin');
    
    // Create test channel
    const channelName = generateTestName('test-ch-reactions-');
    const { data: channelData, error: channelError } = await supabase
      .from('channels')
      .insert({
        name: channelName,
        organization_id: TEST_ORG_ID,
        created_by: adminUser.id,
        type: 'public',
        description: 'Test channel for reaction testing'
      })
      .select()
      .single();
    
    if (channelError) throw channelError;
    testChannelId = channelData.id;
    
    // Create test message
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        channel_id: testChannelId,
        user_id: adminUser.id,
        content: 'Test message for reactions',
        message_type: 'text'
      })
      .select()
      .single();
    
    if (messageError) throw messageError;
    testMessageId = messageData.id;
    
    // Switch to regular user for reaction tests
    const regularUser = await authenticateTestUser('user');
    testUserId = regularUser.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Adding Reactions', () => {
    it('should add reaction to message', async () => {
      const { data, error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: testMessageId,
          user_id: testUserId,
          emoji: '👍'
        })
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data).toMatchObject({
        message_id: testMessageId,
        user_id: testUserId,
        emoji: '👍'
      });
      
      createdReactions.push(data.id);
    });

    it('should prevent duplicate reactions', async () => {
      const { data, error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: testMessageId,
          user_id: testUserId,
          emoji: '👍'
        })
        .select()
        .single();
      
      expect(error).toBeDefined();
      expect(error?.code).toBe('23505'); // Unique constraint violation
    });
  });

  describe('Reaction Queries', () => {
    it('should get reactions for message', async () => {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', testMessageId);
      
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].emoji).toBe('👍');
    });

    it('should get reaction counts by emoji', async () => {
      // Add more reactions
      await supabase.from('message_reactions').insert([
        { message_id: testMessageId, user_id: TEST_ADMIN_USER.id, emoji: '👍' },
        { message_id: testMessageId, user_id: TEST_ADMIN_USER.id, emoji: '❤️' }
      ]);

      const { data, error } = await supabase
        .rpc('get_reaction_counts', { p_message_id: testMessageId });
      
      expect(error).toBeNull();
      expect(data).toContainEqual({ emoji: '👍', count: 2 });
      expect(data).toContainEqual({ emoji: '❤️', count: 1 });
    });
  });
});
```

### File Upload Integration Tests
```typescript
// File: /backend/supabase/integration_tests/message-file-uploads.test.ts
describe('Message File Uploads Backend Integration', () => {
  let testChannelId: string;
  let testUserId: string;

  beforeAll(async () => {
    const adminUser = await authenticateTestUser('admin');
    testUserId = adminUser.id;
    
    const channelName = generateTestName('test-ch-files-');
    const { data: channelData } = await supabase
      .from('channels')
      .insert({
        name: channelName,
        organization_id: TEST_ORG_ID,
        created_by: adminUser.id,
        type: 'public'
      })
      .select()
      .single();
    
    testChannelId = channelData.id;
  });

  describe('Image Upload', () => {
    it('should upload image and create message', async () => {
      // Create test image file
      const imageBuffer = new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46
      ]); // JPEG header
      
      const filename = `test-image-${Date.now()}.jpg`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-images')
        .upload(`${testUserId}/${filename}`, imageBuffer, {
          contentType: 'image/jpeg'
        });
      
      expect(uploadError).toBeNull();
      expect(uploadData?.path).toBeDefined();
      
      // Create message with image metadata
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          channel_id: testChannelId,
          user_id: testUserId,
          content: 'Image message',
          message_type: 'image',
          metadata: {
            url: uploadData.path,
            filename: filename,
            size: imageBuffer.length,
            mimeType: 'image/jpeg'
          }
        })
        .select()
        .single();
      
      expect(messageError).toBeNull();
      expect(messageData.message_type).toBe('image');
      expect(messageData.metadata).toMatchObject({
        url: uploadData.path,
        filename: filename
      });
    });
  });

  describe('Audio Upload', () => {
    it('should upload audio and create message', async () => {
      // Create test audio file (minimal WAV header)
      const audioBuffer = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x00, 0x00, 0x00, // File size
        0x57, 0x41, 0x56, 0x45  // "WAVE"
      ]);
      
      const filename = `test-audio-${Date.now()}.wav`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-audio')
        .upload(`${testUserId}/${filename}`, audioBuffer, {
          contentType: 'audio/wav'
        });
      
      expect(uploadError).toBeNull();
      
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          channel_id: testChannelId,
          user_id: testUserId,
          content: 'Audio message',
          message_type: 'audio',
          metadata: {
            url: uploadData.path,
            filename: filename,
            size: audioBuffer.length,
            mimeType: 'audio/wav',
            duration: 1.5
          }
        })
        .select()
        .single();
      
      expect(messageError).toBeNull();
      expect(messageData.message_type).toBe('audio');
    });
  });

  describe('File Upload Validation', () => {
    it('should reject files exceeding size limit', async () => {
      // Create oversized file (simulate 101MB)
      const oversizedBuffer = new Uint8Array(101 * 1024 * 1024);
      
      const { data, error } = await supabase.storage
        .from('message-files')
        .upload(`${testUserId}/oversized.pdf`, oversizedBuffer, {
          contentType: 'application/pdf'
        });
      
      expect(error).toBeDefined();
      expect(error?.message).toContain('file size');
    });

    it('should reject invalid image types', async () => {
      const invalidBuffer = new Uint8Array([0x00, 0x01, 0x02]);
      
      const { data, error } = await supabase.storage
        .from('message-images')
        .upload(`${testUserId}/invalid.exe`, invalidBuffer, {
          contentType: 'application/exe'
        });
      
      expect(error).toBeDefined();
      expect(error?.message).toContain('mime type');
    });
  });
});
```

---

# Frontend Implementation

## Component Architecture

### Frontend Structure
Based on existing patterns in `/frontendapp/src/`:

```
src/features/messaging/
├── components/
│   ├── MessageInput.tsx (enhanced)
│   ├── MessageItem.tsx (enhanced)
│   ├── MessageList.tsx (enhanced)
│   ├── FileUploader.tsx (new)
│   ├── AudioRecorder.tsx (new)
│   ├── MessageReactions.tsx (new)
│   ├── ImageMessage.tsx (new)
│   ├── AudioMessage.tsx (new)
│   └── FileMessage.tsx (new)
├── hooks/
│   ├── useFileUpload.ts (new)
│   ├── useAudioRecorder.ts (new)
│   ├── useMessageReactions.ts (new)
│   └── useRealTimeMessages.ts (enhanced)
├── services/
│   ├── messageService.ts (enhanced)
│   ├── fileService.ts (new)
│   └── reactionService.ts (new)
├── stores/
│   ├── messageStore.ts (enhanced)
│   └── fileUploadStore.ts (new)
└── utils/
    ├── messageUtils.ts (enhanced)
    ├── fileUtils.ts (new)
    └── audioUtils.ts (new)
```

## Enhanced Components

### MessageInput Component (Enhanced)
```typescript
// File: /frontendapp/src/features/messaging/components/MessageInput.tsx
import React, { useState, useRef, useCallback } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { FileUploader } from './FileUploader';
import { AudioRecorder } from './AudioRecorder';

interface MessageInputProps {
  channelId: string;
  onSendMessage: (message: MessageData) => void;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  channelId,
  onSendMessage,
  placeholder = "Type a message..."
}) => {
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const { uploadFile } = useFileUpload();
  const { startRecording, stopRecording, isRecording } = useAudioRecorder();

  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        const uploadResult = await uploadFile(file, channelId, (progress) => {
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        });
        
        // Create message with file metadata
        await onSendMessage({
          content: file.name,
          message_type: getMessageType(file.type),
          metadata: {
            url: uploadResult.path,
            filename: file.name,
            size: file.size,
            mimeType: file.type,
            ...uploadResult.metadata
          }
        });
      }
    } catch (error) {
      console.error('File upload failed:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  }, [channelId, onSendMessage, uploadFile]);

  const handleSendMessage = useCallback(async () => {
    if (content.trim()) {
      await onSendMessage({
        content,
        message_type: 'text',
        metadata: {}
      });
      setContent('');
    }
  }, [content, onSendMessage]);

  return (
    <div className="message-input border-t bg-white p-4">
      <div className="flex items-end space-x-2">
        <FileUploader 
          onUpload={handleFileUpload}
          isUploading={isUploading}
          progress={uploadProgress}
        />
        
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="w-full resize-none border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={1}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
        </div>
        
        <AudioRecorder 
          onRecord={async () => {
            if (isRecording) {
              const audioBlob = await stopRecording();
              const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
                type: 'audio/webm'
              });
              await handleFileUpload(new FileList([audioFile]));
            } else {
              await startRecording();
            }
          }}
          isRecording={isRecording}
        />
        
        <button
          onClick={handleSendMessage}
          disabled={!content.trim() || isUploading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
};

function getMessageType(mimeType: string): 'text' | 'image' | 'audio' | 'file' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
}
```

### MessageReactions Component (New)
```typescript
// File: /frontendapp/src/features/messaging/components/MessageReactions.tsx
import React from 'react';
import { useMessageReactions } from '../hooks/useMessageReactions';

interface MessageReactionsProps {
  messageId: string;
  reactions: Array<{
    emoji: string;
    count: number;
    userIds: string[];
  }>;
  currentUserId: string;
  onReactionToggle: (emoji: string) => void;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  currentUserId,
  onReactionToggle
}) => {
  const { addReaction, removeReaction } = useMessageReactions();

  const handleReactionClick = async (emoji: string) => {
    const userReacted = reactions
      .find(r => r.emoji === emoji)
      ?.userIds.includes(currentUserId);

    if (userReacted) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
    
    onReactionToggle(emoji);
  };

  const commonEmojis = ['👍', '👎', '❤️', '😊', '😢', '😮'];

  return (
    <div className="message-reactions mt-2">
      <div className="flex flex-wrap gap-1">
        {reactions.map(({ emoji, count, userIds }) => (
          <button
            key={emoji}
            onClick={() => handleReactionClick(emoji)}
            className={`
              reaction-button px-2 py-1 rounded-full text-sm border
              ${userIds.includes(currentUserId) 
                ? 'bg-blue-100 border-blue-300 text-blue-800' 
                : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
              }
            `}
          >
            {emoji} {count}
          </button>
        ))}
      </div>
      
      <div className="emoji-picker mt-2">
        {commonEmojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => handleReactionClick(emoji)}
            className="emoji-button p-1 hover:bg-gray-100 rounded"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
```

### Enhanced MessageItem Component
```typescript
// File: /frontendapp/src/features/messaging/components/MessageItem.tsx (enhanced)
import React, { useState } from 'react';
import { MessageReactions } from './MessageReactions';
import { ImageMessage } from './ImageMessage';
import { AudioMessage } from './AudioMessage';
import { FileMessage } from './FileMessage';

interface MessageItemProps {
  message: Message;
  currentUser: User;
  reactions: MessageReaction[];
  onReactionToggle: (emoji: string) => void;
  onEdit: (content: string) => void;
  onDelete: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  reactions,
  onReactionToggle,
  onEdit,
  onDelete
}) => {
  const [showReactions, setShowReactions] = useState(false);

  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <div className="message-text">
            {message.content}
          </div>
        );
      case 'image':
        return (
          <ImageMessage 
            metadata={message.metadata}
            caption={message.content}
          />
        );
      case 'audio':
        return (
          <AudioMessage 
            metadata={message.metadata}
            caption={message.content}
          />
        );
      case 'file':
        return (
          <FileMessage 
            metadata={message.metadata}
            caption={message.content}
          />
        );
      default:
        return <div>Unsupported message type</div>;
    }
  };

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        userIds: []
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].userIds.push(reaction.user_id);
    return acc;
  }, {} as Record<string, { emoji: string; count: number; userIds: string[] }>);

  return (
    <div className="message-item p-3 hover:bg-gray-50 group">
      <div className="flex space-x-3">
        <div className="message-avatar">
          {/* User avatar */}
        </div>
        
        <div className="flex-1">
          <div className="message-header flex items-center space-x-2">
            <span className="font-semibold">{message.author_email}</span>
            <span className="text-xs text-gray-500">
              {new Date(message.created_at).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="message-content mt-1">
            {renderMessageContent()}
          </div>
          
          {Object.keys(groupedReactions).length > 0 && (
            <MessageReactions
              messageId={message.id}
              reactions={Object.values(groupedReactions)}
              currentUserId={currentUser.id}
              onReactionToggle={onReactionToggle}
            />
          )}
          
          <div className="message-actions opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="text-gray-500 hover:text-gray-700 mr-2"
            >
              😊
            </button>
            
            {message.user_id === currentUser.id && (
              <>
                <button
                  onClick={() => onEdit(message.content)}
                  className="text-gray-500 hover:text-gray-700 mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={onDelete}
                  className="text-gray-500 hover:text-red-600"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Frontend Services

### Enhanced Message Service
```typescript
// File: /frontendapp/src/features/messaging/services/messageService.ts (enhanced)
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../types/supabase';

const supabase = createClient<Database>(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
);

export class MessageService {
  async sendMessage(channelId: string, content: string, messageType: string, metadata: any) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        channel_id: channelId,
        content,
        message_type: messageType,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getMessages(channelId: string, limit = 50, cursor?: string) {
    const { data, error } = await supabase
      .rpc('get_messages_paginated', {
        p_channel_id: channelId,
        p_limit: limit,
        p_cursor: cursor
      });

    if (error) throw error;
    return data;
  }

  async getMessagesWithReactions(channelId: string, limit = 50) {
    const { data, error } = await supabase
      .rpc('get_messages_with_reactions', {
        p_channel_id: channelId,
        p_limit: limit
      });

    if (error) throw error;
    return data;
  }

  subscribeToMessages(channelId: string, callback: (message: any) => void) {
    return supabase
      .channel(`messages:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      }, callback)
      .subscribe();
  }

  subscribeToReactions(channelId: string, callback: (reaction: any) => void) {
    return supabase
      .channel(`reactions:${channelId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reactions'
      }, callback)
      .subscribe();
  }
}

export const messageService = new MessageService();
```

### File Service (New)
```typescript
// File: /frontendapp/src/features/messaging/services/fileService.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
);

export class FileService {
  async uploadFile(
    file: File, 
    bucket: string, 
    userId: string,
    onProgress?: (progress: number) => void
  ) {
    const fileName = `${userId}/${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return {
      path: data.path,
      url: urlData.publicUrl,
      metadata: await this.extractMetadata(file)
    };
  }

  async extractMetadata(file: File): Promise<any> {
    const baseMetadata = {
      filename: file.name,
      size: file.size,
      mimeType: file.type
    };

    if (file.type.startsWith('image/')) {
      return {
        ...baseMetadata,
        ...(await this.extractImageMetadata(file))
      };
    }

    if (file.type.startsWith('audio/')) {
      return {
        ...baseMetadata,
        ...(await this.extractAudioMetadata(file))
      };
    }

    return baseMetadata;
  }

  private async extractImageMetadata(file: File): Promise<any> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
      };
      img.onerror = () => resolve({});
      img.src = URL.createObjectURL(file);
    });
  }

  private async extractAudioMetadata(file: File): Promise<any> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve({
          duration: audio.duration
        });
      };
      audio.onerror = () => resolve({});
      audio.src = URL.createObjectURL(file);
    });
  }

  getBucket(fileType: string): string {
    if (fileType.startsWith('image/')) return 'message-images';
    if (fileType.startsWith('audio/')) return 'message-audio';
    return 'message-files';
  }

  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSizes = {
      'image/': 10 * 1024 * 1024, // 10MB
      'audio/': 25 * 1024 * 1024, // 25MB
      'default': 100 * 1024 * 1024 // 100MB
    };

    const maxSize = Object.entries(maxSizes)
      .find(([type]) => file.type.startsWith(type))?.[1] || maxSizes.default;

    if (file.size > maxSize) {
      return { valid: false, error: 'File too large' };
    }

    return { valid: true };
  }
}

export const fileService = new FileService();
```

## Frontend Testing Strategy

### Component Testing with React Testing Library

#### MessageReactions Component Tests
```typescript
// File: /frontendapp/src/features/messaging/components/__tests__/MessageReactions.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageReactions } from '../MessageReactions';
import { useMessageReactions } from '../../hooks/useMessageReactions';

jest.mock('../../hooks/useMessageReactions');

describe('MessageReactions', () => {
  const mockAddReaction = jest.fn();
  const mockRemoveReaction = jest.fn();
  
  beforeEach(() => {
    (useMessageReactions as jest.Mock).mockReturnValue({
      addReaction: mockAddReaction,
      removeReaction: mockRemoveReaction
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    messageId: 'test-message-id',
    reactions: [
      { emoji: '👍', count: 2, userIds: ['user1', 'user2'] },
      { emoji: '❤️', count: 1, userIds: ['user3'] }
    ],
    currentUserId: 'user1',
    onReactionToggle: jest.fn()
  };

  it('should render reactions correctly', () => {
    render(<MessageReactions {...defaultProps} />);
    
    expect(screen.getByText('👍 2')).toBeInTheDocument();
    expect(screen.getByText('❤️ 1')).toBeInTheDocument();
  });

  it('should highlight user reactions', () => {
    render(<MessageReactions {...defaultProps} />);
    
    const thumbsUpButton = screen.getByText('👍 2');
    expect(thumbsUpButton).toHaveClass('bg-blue-100');
    
    const heartButton = screen.getByText('❤️ 1');
    expect(heartButton).toHaveClass('bg-gray-100');
  });

  it('should add reaction when clicked', async () => {
    render(<MessageReactions {...defaultProps} />);
    
    const heartButton = screen.getByText('❤️ 1');
    fireEvent.click(heartButton);
    
    await waitFor(() => {
      expect(mockAddReaction).toHaveBeenCalledWith('test-message-id', '❤️');
    });
  });

  it('should remove reaction when user has already reacted', async () => {
    render(<MessageReactions {...defaultProps} />);
    
    const thumbsUpButton = screen.getByText('👍 2');
    fireEvent.click(thumbsUpButton);
    
    await waitFor(() => {
      expect(mockRemoveReaction).toHaveBeenCalledWith('test-message-id', '👍');
    });
  });
});
```

### Integration Tests with Existing Patterns

#### Message Service Integration Tests
```typescript
// File: /frontendapp/src/features/messaging/services/__tests__/messageService.integration.test.ts
import { messageService } from '../messageService';
import { setupIntegrationTest, cleanupIntegrationTest } from '../../../test/helpers/integrationTestSetup';

describe('MessageService Integration', () => {
  let testChannelId: string;
  let testUserId: string;

  beforeAll(async () => {
    const setup = await setupIntegrationTest();
    testChannelId = setup.channelId;
    testUserId = setup.userId;
  });

  afterAll(async () => {
    await cleanupIntegrationTest();
  });

  describe('sendMessage', () => {
    it('should send text message', async () => {
      const result = await messageService.sendMessage(
        testChannelId,
        'Test message',
        'text',
        {}
      );

      expect(result).toMatchObject({
        content: 'Test message',
        message_type: 'text',
        channel_id: testChannelId
      });
    });

    it('should send image message', async () => {
      const metadata = {
        url: 'test-image.jpg',
        filename: 'test.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        width: 800,
        height: 600
      };

      const result = await messageService.sendMessage(
        testChannelId,
        'Image message',
        'image',
        metadata
      );

      expect(result.message_type).toBe('image');
      expect(result.metadata).toMatchObject(metadata);
    });
  });

  describe('getMessagesWithReactions', () => {
    it('should get messages with reactions', async () => {
      const messages = await messageService.getMessagesWithReactions(testChannelId);
      
      expect(messages).toBeArray();
      expect(messages[0]).toHaveProperty('reactions');
    });
  });
});
```

### E2E Testing with Playwright

#### Multi-Modal Message Flow Tests
```typescript
// File: /frontendapp/__tests__/playwright/messaging/multimodal-messages.spec.ts
import { test, expect } from '@playwright/test';
import { authHelpers } from '../utils/auth-helpers';

test.describe('Multi-Modal Message Flow', () => {
  test.beforeEach(async ({ page }) => {
    await authHelpers.loginAsUser(page);
    await page.goto('/messages');
  });

  test('should send and display text message', async ({ page }) => {
    const testMessage = 'Hello from Playwright test!';
    
    await page.fill('[data-testid="message-input"]', testMessage);
    await page.press('[data-testid="message-input"]', 'Enter');
    
    await expect(page.locator('[data-testid="message-item"]').last()).toContainText(testMessage);
  });

  test('should upload and display image message', async ({ page }) => {
    const fileInput = page.locator('[data-testid="file-input"]');
    
    await fileInput.setInputFiles('test-assets/test-image.jpg');
    
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-progress"]')).toBeHidden();
    
    await expect(page.locator('[data-testid="image-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="image-message"] img')).toBeVisible();
  });

  test('should add and remove reactions', async ({ page }) => {
    const testMessage = 'React to this message';
    
    await page.fill('[data-testid="message-input"]', testMessage);
    await page.press('[data-testid="message-input"]', 'Enter');
    
    const messageItem = page.locator('[data-testid="message-item"]').last();
    
    await messageItem.hover();
    await page.click('[data-testid="reaction-button"]');
    
    await page.click('[data-testid="emoji-👍"]');
    
    await expect(page.locator('[data-testid="reaction-👍"]')).toBeVisible();
    await expect(page.locator('[data-testid="reaction-👍"]')).toContainText('👍 1');
    
    await page.click('[data-testid="reaction-👍"]');
    
    await expect(page.locator('[data-testid="reaction-👍"]')).toBeHidden();
  });
});
```

---

# Success Metrics & Implementation Priority

## Performance Targets
- **Image Upload**: < 2s for images up to 10MB
- **Audio Upload**: < 3s for audio up to 25MB  
- **File Upload**: < 5s for files up to 100MB
- **Preview Generation**: < 1s for thumbnails
- **Reaction Response**: < 100ms for emoji reactions

## Implementation Priority

### High Priority (Week 1)
1. **Message Reactions**: Implement reactions table and real-time updates
2. **File Upload UI**: Frontend components for file selection and upload
3. **Image Processing**: Thumbnail generation and display
4. **Audio Recording**: Voice message recording and playback

### Medium Priority (Week 2)
1. **File Management**: Advanced file operations and metadata
2. **Performance Optimization**: Lazy loading and compression
3. **Security Enhancements**: File validation and access control

### Low Priority (Future)
1. **Advanced Features**: Video support, collaboration tools
2. **External Integration**: WhatsApp/Instagram file sharing
3. **Analytics**: Media usage tracking and insights

This design provides a comprehensive foundation for implementing multi-modal messaging support while leveraging existing infrastructure and maintaining compatibility with the current system architecture.