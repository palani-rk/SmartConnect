import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../supabase';
import { 
  BACKEND_TEST_CONFIG,
  TEST_ORG_ID,
  TEST_REGULAR_USER,
  validateBackendTestConfig,
  generateTestName
} from './fixtures/testConfig';

describe('Messages Database Foundation', () => {
  let supabase: SupabaseClient<Database>;
  let testUserId: string;
  let testChannelId: string;
  let testOrganizationId: string;
  let createdTestChannels: string[] = [];

  beforeAll(async () => {
    // Validate test configuration
    validateBackendTestConfig();
    
    // Initialize Supabase client
    supabase = createClient(
      BACKEND_TEST_CONFIG.supabase.url,
      BACKEND_TEST_CONFIG.supabase.anonKey
    );
    
    // Use existing test organization and user
    testOrganizationId = TEST_ORG_ID;
    testUserId = TEST_REGULAR_USER.id;

    // Create test channel for messages testing
    const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel + 'messages-');
    const { data: channelData, error: channelError } = await supabase
      .from('channels')
      .insert({
        name: channelName,
        organization_id: testOrganizationId,
        created_by: testUserId,
        type: 'public', // Use valid channel type
        description: 'Test channel for message testing'
      })
      .select()
      .single();

    if (channelError) throw channelError;
    testChannelId = channelData.id;
    createdTestChannels.push(testChannelId);

    // Add user to channel
    await supabase
      .from('channel_memberships')
      .insert({
        channel_id: testChannelId,
        user_id: testUserId,
        role: 'member'
      });
  });

  afterAll(async () => {
    // Clean up only test data we created
    await supabase.from('messages').delete().eq('channel_id', testChannelId);
    await supabase.from('channel_memberships').delete().eq('channel_id', testChannelId);
    
    // Clean up test channels
    for (const channelId of createdTestChannels) {
      await supabase.from('channels').delete().eq('id', channelId);
    }
  });

  beforeEach(async () => {
    // Clean up messages before each test
    await supabase.from('messages').delete().eq('channel_id', testChannelId);
  });

  describe('Messages Table Structure', () => {
    it('should allow inserting a basic text message', async () => {
      const messageData = {
        channel_id: testChannelId,
        user_id: testUserId,
        content: 'Hello, this is a test message!',
        message_type: 'text',
        metadata: {}
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.content).toBe(messageData.content);
      expect(data.message_type).toBe('text');
      expect(data.is_edited).toBe(false);
      expect(data.is_pinned).toBe(false);
      expect(data.deleted_at).toBeNull();
    });

    it('should auto-generate id, created_at, and updated_at fields', async () => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: testChannelId,
          user_id: testUserId,
          content: 'Test message for auto fields'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.id).toBeDefined();
      expect(data.created_at).toBeDefined();
      expect(data.updated_at).toBeDefined();
    });

    it('should support different message types', async () => {
      const messageTypes = ['text', 'image', 'audio', 'file'];
      
      for (const type of messageTypes) {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            channel_id: testChannelId,
            user_id: testUserId,
            content: `Test ${type} message`,
            message_type: type
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data.message_type).toBe(type);
      }
    });

    it('should reject invalid message types', async () => {
      const { error } = await supabase
        .from('messages')
        .insert({
          channel_id: testChannelId,
          user_id: testUserId,
          content: 'Test message',
          message_type: 'invalid_type'
        });

      expect(error).toBeDefined();
      expect(error?.message).toContain('violates check constraint');
    });
  });

  describe('Message Metadata and Threading', () => {
    it('should support JSON metadata', async () => {
      const metadata = {
        fileName: 'test.jpg',
        fileSize: 1024,
        dimensions: { width: 800, height: 600 }
      };

      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: testChannelId,
          user_id: testUserId,
          content: 'Message with metadata',
          metadata
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.metadata).toEqual(metadata);
    });

    it('should support message threading', async () => {
      // Create parent message
      const { data: parentMessage, error: parentError } = await supabase
        .from('messages')
        .insert({
          channel_id: testChannelId,
          user_id: testUserId,
          content: 'Parent message'
        })
        .select()
        .single();

      expect(parentError).toBeNull();

      // Create reply message
      const { data: replyMessage, error: replyError } = await supabase
        .from('messages')
        .insert({
          channel_id: testChannelId,
          user_id: testUserId,
          content: 'Reply to parent message',
          thread_id: parentMessage.id
        })
        .select()
        .single();

      expect(replyError).toBeNull();
      expect(replyMessage.thread_id).toBe(parentMessage.id);
    });
  });

  describe('Message Pagination Function', () => {
    it('should retrieve messages with pagination', async () => {
      // Create multiple test messages
      const messages = Array.from({ length: 10 }, (_, i) => ({
        channel_id: testChannelId,
        user_id: testUserId,
        content: `Test message ${i + 1}`
      }));

      await supabase.from('messages').insert(messages);

      // Test pagination function
      const { data, error } = await supabase
        .rpc('get_messages_paginated', {
          p_channel_id: testChannelId,
          p_limit: 5
        });

      expect(error).toBeNull();
      expect(data).toHaveLength(5);
      expect(data[0].author_email).toBe(TEST_REGULAR_USER.email);
      expect(data[0].channel_name).toBeDefined();
    });

    it('should support cursor-based pagination', async () => {
      // Create messages with distinct timestamps
      const messages = [];
      for (let i = 0; i < 5; i++) {
        const { data: message, error } = await supabase
          .from('messages')
          .insert({
            channel_id: testChannelId,
            user_id: testUserId,
            content: `Paginated message ${i + 1}`
          })
          .select()
          .single();
        
        expect(error).toBeNull();
        messages.push(message);
        
        // Small delay to ensure different timestamps
        if (i < 4) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Get first page
      const { data: firstPage, error: firstError } = await supabase
        .rpc('get_messages_paginated', {
          p_channel_id: testChannelId,
          p_limit: 3
        });

      expect(firstError).toBeNull();
      expect(firstPage).toHaveLength(3);

      // Get second page using cursor
      const cursor = firstPage[firstPage.length - 1].created_at;
      const { data: secondPage, error: secondError } = await supabase
        .rpc('get_messages_paginated', {
          p_channel_id: testChannelId,
          p_limit: 3,
          p_cursor: cursor
        });

      expect(secondError).toBeNull();
      expect(secondPage).toHaveLength(2);
    });
  });

  describe('Message Updates and Soft Deletes', () => {
    it('should update message content and set is_edited flag', async () => {
      const { data: message, error: insertError } = await supabase
        .from('messages')
        .insert({
          channel_id: testChannelId,
          user_id: testUserId,
          content: 'Original content'
        })
        .select()
        .single();

      expect(insertError).toBeNull();

      // Update the message
      const { data: updatedMessage, error: updateError } = await supabase
        .from('messages')
        .update({
          content: 'Updated content',
          is_edited: true
        })
        .eq('id', message.id)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedMessage.content).toBe('Updated content');
      expect(updatedMessage.is_edited).toBe(true);
      expect(updatedMessage.updated_at).not.toBe(message.updated_at);
    });

    it('should support soft delete of messages', async () => {
      const { data: message, error: insertError } = await supabase
        .from('messages')
        .insert({
          channel_id: testChannelId,
          user_id: testUserId,
          content: 'Message to be deleted'
        })
        .select()
        .single();

      expect(insertError).toBeNull();

      // Soft delete the message
      const { data: deletedMessage, error: deleteError } = await supabase
        .from('messages')
        .update({
          deleted_at: new Date().toISOString()
        })
        .eq('id', message.id)
        .select()
        .single();

      expect(deleteError).toBeNull();
      expect(deletedMessage.deleted_at).toBeDefined();
    });
  });

  describe('Message Helper Functions', () => {
    it('should verify can_access_message function works', async () => {
      // First authenticate as the test user
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: TEST_REGULAR_USER.email,
        password: TEST_REGULAR_USER.password
      });

      expect(authError).toBeNull();

      const { data: message, error: insertError } = await supabase
        .from('messages')
        .insert({
          channel_id: testChannelId,
          user_id: testUserId,
          content: 'Access test message'
        })
        .select()
        .single();

      expect(insertError).toBeNull();

      // Test access function
      const { data: canAccess, error: accessError } = await supabase
        .rpc('can_access_message', {
          message_id: message.id
        });

      expect(accessError).toBeNull();
      expect(canAccess).toBe(true);

      // Sign out after test
      await supabase.auth.signOut();
    });

    it('should get channel members correctly', async () => {
      const { data: members, error } = await supabase
        .rpc('get_channel_members', {
          p_channel_id: testChannelId
        });

      expect(error).toBeNull();
      expect(members).toHaveLength(1);
      expect(members[0].user_id).toBe(testUserId);
    });
  });
});