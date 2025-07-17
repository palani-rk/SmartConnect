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

describe('Message Database Functions Integration', () => {
  let testChannelId: string;
  let testMessages: any[] = [];
  let testUserId: string;
  let adminUserId: string;

  beforeAll(async () => {
    // Setup test users
    const adminUser = await authenticateTestUser('admin');
    const regularUser = await authenticateTestUser('user');
    
    adminUserId = adminUser.id;
    testUserId = regularUser.id;
    
    // Create test channel
    const channelName = generateTestName('test-ch-functions-');
    const { data: channelData, error: channelError } = await supabase
      .from('channels')
      .insert({
        name: channelName,
        organization_id: TEST_ORG_ID,
        created_by: adminUserId,
        type: 'public',
        description: 'Test channel for database functions testing'
      })
      .select()
      .single();
    
    if (channelError) throw channelError;
    testChannelId = channelData.id;
    trackTestData('channel', testChannelId);
    
    // Create test messages
    const messages = [
      {
        channel_id: testChannelId,
        user_id: adminUserId,
        content: 'First test message',
        message_type: 'text',
        metadata: {}
      },
      {
        channel_id: testChannelId,
        user_id: testUserId,
        content: 'Second test message',
        message_type: 'text',
        metadata: {}
      },
      {
        channel_id: testChannelId,
        user_id: adminUserId,
        content: 'Test image message',
        message_type: 'image',
        metadata: {
          url: 'test-image.jpg',
          filename: 'test-image.jpg',
          size: 1024,
          mimeType: 'image/jpeg',
          width: 800,
          height: 600
        }
      },
      {
        channel_id: testChannelId,
        user_id: testUserId,
        content: 'Test audio message',
        message_type: 'audio',
        metadata: {
          url: 'test-audio.wav',
          filename: 'test-audio.wav',
          size: 2048,
          mimeType: 'audio/wav',
          duration: 5.5
        }
      }
    ];
    
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert(messages)
      .select();
    
    if (messageError) throw messageError;
    testMessages = messageData;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Clean up any reactions from previous tests
    await supabase
      .from('message_reactions')
      .delete()
      .in('message_id', testMessages.map(m => m.id));
  });

  describe('get_reaction_counts function', () => {
    it('should return empty results for message with no reactions', async () => {
      const messageId = testMessages[0].id;
      
      const { data, error } = await supabase
        .rpc('get_reaction_counts', { p_message_id: messageId });
      
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('should return correct reaction counts', async () => {
      const messageId = testMessages[0].id;
      
      // Add reactions
      await supabase.from('message_reactions').insert([
        { message_id: messageId, user_id: adminUserId, emoji: '👍' },
        { message_id: messageId, user_id: testUserId, emoji: '👍' },
        { message_id: messageId, user_id: adminUserId, emoji: '❤️' },
        { message_id: messageId, user_id: testUserId, emoji: '😊' }
      ]);
      
      const { data, error } = await supabase
        .rpc('get_reaction_counts', { p_message_id: messageId });
      
      expect(error).toBeNull();
      expect(data).toHaveLength(3);
      
      // Should be ordered by count DESC
      expect(data[0]).toEqual({ emoji: '👍', count: 2 });
      expect(data).toContainEqual({ emoji: '❤️', count: 1 });
      expect(data).toContainEqual({ emoji: '😊', count: 1 });
    });

    it('should handle non-existent message ID', async () => {
      const fakeMessageId = '00000000-0000-0000-0000-000000000000';
      
      const { data, error } = await supabase
        .rpc('get_reaction_counts', { p_message_id: fakeMessageId });
      
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('should group reactions by emoji correctly', async () => {
      const messageId = testMessages[1].id;
      
      // Add multiple reactions with same emoji
      await supabase.from('message_reactions').insert([
        { message_id: messageId, user_id: adminUserId, emoji: '🚀' },
        { message_id: messageId, user_id: testUserId, emoji: '🚀' },
        { message_id: messageId, user_id: adminUserId, emoji: '🎉' }
      ]);
      
      const { data, error } = await supabase
        .rpc('get_reaction_counts', { p_message_id: messageId });
      
      expect(error).toBeNull();
      expect(data).toHaveLength(2);
      expect(data).toContainEqual({ emoji: '🚀', count: 2 });
      expect(data).toContainEqual({ emoji: '🎉', count: 1 });
    });
  });

  describe('get_messages_with_reactions function', () => {
    it('should return messages with empty reactions array when no reactions', async () => {
      const { data, error } = await supabase
        .rpc('get_messages_with_reactions', { 
          p_channel_id: testChannelId,
          p_limit: 10
        });
      
      expect(error).toBeNull();
      expect(data).toHaveLength(testMessages.length);
      
      // Check that all messages have empty reactions array
      data.forEach(message => {
        expect(message.reactions).toEqual([]);
      });
    });

    it('should return messages with correct reaction data', async () => {
      const messageId = testMessages[0].id;
      
      // Add reactions to first message
      await supabase.from('message_reactions').insert([
        { message_id: messageId, user_id: adminUserId, emoji: '👍' },
        { message_id: messageId, user_id: testUserId, emoji: '👍' },
        { message_id: messageId, user_id: adminUserId, emoji: '❤️' }
      ]);
      
      const { data, error } = await supabase
        .rpc('get_messages_with_reactions', { 
          p_channel_id: testChannelId,
          p_limit: 10
        });
      
      expect(error).toBeNull();
      expect(data).toHaveLength(testMessages.length);
      
      // Find the message with reactions
      const messageWithReactions = data.find(m => m.id === messageId);
      expect(messageWithReactions).toBeDefined();
      expect(messageWithReactions.reactions).toHaveLength(2);
      expect(messageWithReactions.reactions).toContainEqual({ emoji: '👍', count: 2 });
      expect(messageWithReactions.reactions).toContainEqual({ emoji: '❤️', count: 1 });
      
      // Other messages should have empty reactions
      const otherMessages = data.filter(m => m.id !== messageId);
      otherMessages.forEach(message => {
        expect(message.reactions).toEqual([]);
      });
    });

    it('should include all message fields', async () => {
      const { data, error } = await supabase
        .rpc('get_messages_with_reactions', { 
          p_channel_id: testChannelId,
          p_limit: 10
        });
      
      expect(error).toBeNull();
      expect(data).toHaveLength(testMessages.length);
      
      // Check that all required fields are present
      data.forEach(message => {
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('channel_id');
        expect(message).toHaveProperty('user_id');
        expect(message).toHaveProperty('content');
        expect(message).toHaveProperty('message_type');
        expect(message).toHaveProperty('metadata');
        expect(message).toHaveProperty('thread_id');
        expect(message).toHaveProperty('is_pinned');
        expect(message).toHaveProperty('is_edited');
        expect(message).toHaveProperty('created_at');
        expect(message).toHaveProperty('updated_at');
        expect(message).toHaveProperty('deleted_at');
        expect(message).toHaveProperty('author_email');
        expect(message).toHaveProperty('author_role');
        expect(message).toHaveProperty('channel_name');
        expect(message).toHaveProperty('reactions');
      });
    });

    it('should respect the limit parameter', async () => {
      const { data, error } = await supabase
        .rpc('get_messages_with_reactions', { 
          p_channel_id: testChannelId,
          p_limit: 2
        });
      
      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });

    it('should order messages by created_at DESC', async () => {
      const { data, error } = await supabase
        .rpc('get_messages_with_reactions', { 
          p_channel_id: testChannelId,
          p_limit: 10
        });
      
      expect(error).toBeNull();
      expect(data).toHaveLength(testMessages.length);
      
      // Check that messages are ordered by created_at DESC
      for (let i = 0; i < data.length - 1; i++) {
        const currentTime = new Date(data[i].created_at).getTime();
        const nextTime = new Date(data[i + 1].created_at).getTime();
        expect(currentTime).toBeGreaterThanOrEqual(nextTime);
      }
    });

    it('should not return deleted messages', async () => {
      // Soft delete one message
      const messageToDelete = testMessages[0];
      await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageToDelete.id);
      
      const { data, error } = await supabase
        .rpc('get_messages_with_reactions', { 
          p_channel_id: testChannelId,
          p_limit: 10
        });
      
      expect(error).toBeNull();
      expect(data).toHaveLength(testMessages.length - 1);
      
      // Verify the deleted message is not included
      const deletedMessage = data.find(m => m.id === messageToDelete.id);
      expect(deletedMessage).toBeUndefined();
      
      // Restore the message for cleanup
      await supabase
        .from('messages')
        .update({ deleted_at: null })
        .eq('id', messageToDelete.id);
    });

    it('should handle non-existent channel ID', async () => {
      const fakeChannelId = '00000000-0000-0000-0000-000000000000';
      
      const { data, error } = await supabase
        .rpc('get_messages_with_reactions', { 
          p_channel_id: fakeChannelId,
          p_limit: 10
        });
      
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe('get_messages_paginated function', () => {
    it('should return paginated messages', async () => {
      const { data, error } = await supabase
        .rpc('get_messages_paginated', { 
          p_channel_id: testChannelId,
          p_limit: 2
        });
      
      expect(error).toBeNull();
      expect(data).toHaveLength(2);
      
      // Check that all required fields are present
      data.forEach(message => {
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('channel_id');
        expect(message).toHaveProperty('user_id');
        expect(message).toHaveProperty('content');
        expect(message).toHaveProperty('message_type');
        expect(message).toHaveProperty('metadata');
        expect(message).toHaveProperty('author_email');
        expect(message).toHaveProperty('author_role');
        expect(message).toHaveProperty('channel_name');
      });
    });

    it('should handle cursor-based pagination', async () => {
      // Get first page
      const { data: firstPage, error: firstError } = await supabase
        .rpc('get_messages_paginated', { 
          p_channel_id: testChannelId,
          p_limit: 2
        });
      
      expect(firstError).toBeNull();
      expect(firstPage).toHaveLength(2);
      
      // Get second page using cursor
      const cursor = firstPage[1].created_at;
      const { data: secondPage, error: secondError } = await supabase
        .rpc('get_messages_paginated', { 
          p_channel_id: testChannelId,
          p_limit: 2,
          p_cursor: cursor
        });
      
      expect(secondError).toBeNull();
      expect(secondPage).toHaveLength(testMessages.length - 2);
      
      // Verify no overlap between pages
      const firstPageIds = firstPage.map(m => m.id);
      const secondPageIds = secondPage.map(m => m.id);
      const intersection = firstPageIds.filter(id => secondPageIds.includes(id));
      expect(intersection).toHaveLength(0);
    });

    it('should include correct message metadata by type', async () => {
      const { data, error } = await supabase
        .rpc('get_messages_paginated', { 
          p_channel_id: testChannelId,
          p_limit: 10
        });
      
      expect(error).toBeNull();
      
      // Find image message
      const imageMessage = data.find(m => m.message_type === 'image');
      expect(imageMessage).toBeDefined();
      expect(imageMessage.metadata).toHaveProperty('url');
      expect(imageMessage.metadata).toHaveProperty('filename');
      expect(imageMessage.metadata).toHaveProperty('size');
      expect(imageMessage.metadata).toHaveProperty('mimeType');
      expect(imageMessage.metadata).toHaveProperty('width');
      expect(imageMessage.metadata).toHaveProperty('height');
      
      // Find audio message
      const audioMessage = data.find(m => m.message_type === 'audio');
      expect(audioMessage).toBeDefined();
      expect(audioMessage.metadata).toHaveProperty('url');
      expect(audioMessage.metadata).toHaveProperty('filename');
      expect(audioMessage.metadata).toHaveProperty('size');
      expect(audioMessage.metadata).toHaveProperty('mimeType');
      expect(audioMessage.metadata).toHaveProperty('duration');
      
      // Find text messages
      const textMessages = data.filter(m => m.message_type === 'text');
      expect(textMessages.length).toBeGreaterThan(0);
      textMessages.forEach(message => {
        expect(message.metadata).toEqual({});
      });
    });
  });

  describe('Function Performance', () => {
    it('should execute get_reaction_counts efficiently', async () => {
      const messageId = testMessages[0].id;
      
      // Add many reactions
      const reactions = [];
      for (let i = 0; i < 50; i++) {
        reactions.push({
          message_id: messageId,
          user_id: i % 2 === 0 ? adminUserId : testUserId,
          emoji: ['👍', '❤️', '😊', '🚀', '🎉'][i % 5]
        });
      }
      
      await supabase.from('message_reactions').insert(reactions);
      
      const startTime = Date.now();
      const { data, error } = await supabase
        .rpc('get_reaction_counts', { p_message_id: messageId });
      const endTime = Date.now();
      
      expect(error).toBeNull();
      expect(data).toHaveLength(5); // 5 different emojis
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should execute get_messages_with_reactions efficiently', async () => {
      const startTime = Date.now();
      const { data, error } = await supabase
        .rpc('get_messages_with_reactions', { 
          p_channel_id: testChannelId,
          p_limit: 50
        });
      const endTime = Date.now();
      
      expect(error).toBeNull();
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in under 2 seconds
    });
  });
});