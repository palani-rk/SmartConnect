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

describe('Message Performance Integration Tests', () => {
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
    const channelName = generateTestName('test-ch-perf-');
    const { data: channelData, error: channelError } = await supabase
      .from('channels')
      .insert({
        name: channelName,
        organization_id: TEST_ORG_ID,
        created_by: adminUserId,
        type: 'public',
        description: 'Test channel for performance testing'
      })
      .select()
      .single();
    
    if (channelError) throw channelError;
    testChannelId = channelData.id;
    trackTestData('channel', testChannelId);
    
    // Create bulk test messages for performance testing
    const bulkMessages = [];
    for (let i = 0; i < 100; i++) {
      bulkMessages.push({
        channel_id: testChannelId,
        user_id: i % 2 === 0 ? adminUserId : testUserId,
        content: `Performance test message ${i}`,
        message_type: i % 4 === 0 ? 'image' : i % 4 === 1 ? 'audio' : i % 4 === 2 ? 'file' : 'text',
        metadata: i % 4 === 0 ? {
          url: `test-image-${i}.jpg`,
          filename: `test-image-${i}.jpg`,
          size: 1024 * (i + 1),
          mimeType: 'image/jpeg',
          width: 800,
          height: 600
        } : i % 4 === 1 ? {
          url: `test-audio-${i}.wav`,
          filename: `test-audio-${i}.wav`,
          size: 2048 * (i + 1),
          mimeType: 'audio/wav',
          duration: 5.5 + i
        } : i % 4 === 2 ? {
          url: `test-file-${i}.pdf`,
          filename: `test-file-${i}.pdf`,
          size: 4096 * (i + 1),
          mimeType: 'application/pdf'
        } : {}
      });
    }
    
    // Insert messages in batches to avoid timeouts
    const batchSize = 10;
    for (let i = 0; i < bulkMessages.length; i += batchSize) {
      const batch = bulkMessages.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('messages')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        throw error;
      }
      
      testMessages.push(...data);
    }
    
    console.log(`Created ${testMessages.length} test messages for performance testing`);
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

  describe('Message Query Performance', () => {
    it('should fetch 50 messages within performance target', async () => {
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .rpc('get_messages_paginated', {
          p_channel_id: testChannelId,
          p_limit: 50
        });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(data).toHaveLength(50);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      
      console.log(`✅ Fetched 50 messages in ${duration}ms`);
    });

    it('should fetch messages with reactions within performance target', async () => {
      // Add some reactions to test with
      const reactionsToAdd = [];
      for (let i = 0; i < 20; i++) {
        reactionsToAdd.push({
          message_id: testMessages[i].id,
          user_id: i % 2 === 0 ? adminUserId : testUserId,
          emoji: ['👍', '❤️', '😊', '🚀', '🎉'][i % 5]
        });
      }
      
      await supabase.from('message_reactions').insert(reactionsToAdd);
      
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .rpc('get_messages_with_reactions', {
          p_channel_id: testChannelId,
          p_limit: 50
        });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(data).toHaveLength(50);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      
      console.log(`✅ Fetched 50 messages with reactions in ${duration}ms`);
    });

    it('should handle pagination efficiently', async () => {
      const pageSize = 20;
      const totalPages = 5;
      const timings = [];
      
      let cursor = null;
      
      for (let page = 0; page < totalPages; page++) {
        const startTime = Date.now();
        
        const { data, error } = await supabase
          .rpc('get_messages_paginated', {
            p_channel_id: testChannelId,
            p_limit: pageSize,
            p_cursor: cursor
          });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(error).toBeNull();
        expect(data.length).toBeLessThanOrEqual(pageSize);
        expect(duration).toBeLessThan(1000);
        
        timings.push(duration);
        
        if (data.length > 0) {
          cursor = data[data.length - 1].created_at;
        }
      }
      
      // Check that pagination performance is consistent
      const avgTiming = timings.reduce((sum, time) => sum + time, 0) / timings.length;
      expect(avgTiming).toBeLessThan(500); // Average should be under 500ms
      
      console.log(`✅ Paginated ${totalPages} pages with average timing: ${avgTiming.toFixed(2)}ms`);
    });
  });

  describe('Reaction Performance', () => {
    it('should add reactions within performance target', async () => {
      const messageId = testMessages[0].id;
      const reactionsToAdd = [];
      
      // Prepare 100 reactions
      for (let i = 0; i < 100; i++) {
        reactionsToAdd.push({
          message_id: messageId,
          user_id: i % 2 === 0 ? adminUserId : testUserId,
          emoji: ['👍', '❤️', '😊', '🚀', '🎉', '💯', '🔥', '⚡'][i % 8]
        });
      }
      
      const startTime = Date.now();
      
      // Add reactions in batches
      const batchSize = 10;
      for (let i = 0; i < reactionsToAdd.length; i += batchSize) {
        const batch = reactionsToAdd.slice(i, i + batchSize);
        const { error } = await supabase
          .from('message_reactions')
          .insert(batch);
        
        if (error) {
          // Handle unique constraint violations gracefully
          if (error.code !== '23505') {
            throw error;
          }
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
      
      console.log(`✅ Added reactions in ${duration}ms`);
    });

    it('should get reaction counts efficiently for many reactions', async () => {
      const messageId = testMessages[1].id;
      
      // Add many reactions to the message
      const reactionsToAdd = [];
      for (let i = 0; i < 50; i++) {
        reactionsToAdd.push({
          message_id: messageId,
          user_id: i % 2 === 0 ? adminUserId : testUserId,
          emoji: ['👍', '❤️', '😊', '🚀', '🎉'][i % 5]
        });
      }
      
      await supabase.from('message_reactions').insert(reactionsToAdd);
      
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .rpc('get_reaction_counts', { p_message_id: messageId });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(data).toHaveLength(5); // 5 different emojis
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      
      console.log(`✅ Got reaction counts in ${duration}ms`);
    });

    it('should handle concurrent reaction operations', async () => {
      const messageIds = testMessages.slice(0, 10).map(m => m.id);
      
      // Create concurrent reaction operations
      const promises = messageIds.map(async (messageId, index) => {
        const startTime = Date.now();
        
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: index % 2 === 0 ? adminUserId : testUserId,
            emoji: '⚡'
          });
        
        const endTime = Date.now();
        
        return {
          duration: endTime - startTime,
          error: error
        };
      });
      
      const results = await Promise.all(promises);
      
      // Check that most operations completed successfully
      const successfulOps = results.filter(r => !r.error);
      expect(successfulOps.length).toBeGreaterThan(8); // Allow for some failures
      
      // Check that individual operations were fast
      const avgDuration = successfulOps.reduce((sum, r) => sum + r.duration, 0) / successfulOps.length;
      expect(avgDuration).toBeLessThan(500);
      
      console.log(`✅ Concurrent operations completed with average duration: ${avgDuration.toFixed(2)}ms`);
    });
  });

  describe('Storage Performance', () => {
    it('should handle file metadata queries efficiently', async () => {
      const startTime = Date.now();
      
      // Query for messages with file metadata
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', testChannelId)
        .in('message_type', ['image', 'audio', 'file'])
        .limit(30);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
      
      // Verify metadata structure
      data.forEach(message => {
        expect(message.metadata).toBeDefined();
        expect(typeof message.metadata).toBe('object');
        
        if (message.message_type === 'image') {
          expect(message.metadata).toHaveProperty('url');
          expect(message.metadata).toHaveProperty('filename');
          expect(message.metadata).toHaveProperty('size');
          expect(message.metadata).toHaveProperty('mimeType');
        }
      });
      
      console.log(`✅ Queried ${data.length} file messages in ${duration}ms`);
    });

    it('should efficiently filter messages by type', async () => {
      const messageTypes = ['text', 'image', 'audio', 'file'];
      const timings = [];
      
      for (const messageType of messageTypes) {
        const startTime = Date.now();
        
        const { data, error } = await supabase
          .from('messages')
          .select('id, message_type, content')
          .eq('channel_id', testChannelId)
          .eq('message_type', messageType)
          .limit(25);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(error).toBeNull();
        expect(duration).toBeLessThan(300); // Should complete in under 300ms
        
        timings.push({ type: messageType, duration, count: data.length });
      }
      
      // Check that index is working effectively
      const avgTiming = timings.reduce((sum, t) => sum + t.duration, 0) / timings.length;
      expect(avgTiming).toBeLessThan(200);
      
      console.log(`✅ Message type filtering performance:`);
      timings.forEach(t => {
        console.log(`   ${t.type}: ${t.count} messages in ${t.duration}ms`);
      });
    });
  });

  describe('Edge Function Performance', () => {
    it('should handle message operations efficiently', async () => {
      const messageId = testMessages[0].id;
      
      // Test reaction operations through edge function
      const startTime = Date.now();
      
      const response = await fetch(`${BACKEND_TEST_CONFIG.supabase.url}/functions/v1/message-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BACKEND_TEST_CONFIG.supabase.anonKey}`
        },
        body: JSON.stringify({
          action: 'add_reaction',
          message_id: messageId,
          emoji: '⚡'
        })
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(response.status).toBeLessThan(500); // Should not error
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
      
      console.log(`✅ Edge function operation completed in ${duration}ms`);
    });

    it('should handle file validation efficiently', async () => {
      const startTime = Date.now();
      
      const response = await fetch(`${BACKEND_TEST_CONFIG.supabase.url}/functions/v1/message-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BACKEND_TEST_CONFIG.supabase.anonKey}`
        },
        body: JSON.stringify({
          action: 'upload_file',
          file_data: {
            filename: 'test.jpg',
            content_type: 'image/jpeg',
            file_size: 1024 * 1024 // 1MB
          }
        })
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(response.status).toBeLessThan(500); // Should not error
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      
      console.log(`✅ File validation completed in ${duration}ms`);
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain consistent performance under load', async () => {
      const iterations = 5;
      const timings = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        // Simulate typical user operations
        const { data: messages, error: messagesError } = await supabase
          .rpc('get_messages_with_reactions', {
            p_channel_id: testChannelId,
            p_limit: 20
          });
        
        if (messagesError) throw messagesError;
        
        // Add a reaction
        const messageId = messages[0]?.id;
        if (messageId) {
          await supabase
            .from('message_reactions')
            .insert({
              message_id: messageId,
              user_id: testUserId,
              emoji: `🔥${i}` // Unique emoji for each iteration
            });
        }
        
        const endTime = Date.now();
        timings.push(endTime - startTime);
      }
      
      // Check for performance consistency
      const avgTiming = timings.reduce((sum, time) => sum + time, 0) / timings.length;
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      
      expect(avgTiming).toBeLessThan(1000); // Average should be under 1 second
      expect(maxTiming - minTiming).toBeLessThan(500); // Variance should be reasonable
      
      console.log(`✅ Performance consistency check:`);
      console.log(`   Average: ${avgTiming.toFixed(2)}ms`);
      console.log(`   Min: ${minTiming}ms, Max: ${maxTiming}ms`);
      console.log(`   Variance: ${(maxTiming - minTiming)}ms`);
    });
  });

  describe('Performance Targets Validation', () => {
    it('should meet all defined performance targets', async () => {
      console.log('📊 Performance Targets Summary:');
      
      // Target 1: Message Load < 1s for 50 messages
      const messageLoadStart = Date.now();
      const { data: messages, error: messagesError } = await supabase
        .rpc('get_messages_with_reactions', {
          p_channel_id: testChannelId,
          p_limit: 50
        });
      const messageLoadDuration = Date.now() - messageLoadStart;
      
      expect(messagesError).toBeNull();
      expect(messageLoadDuration).toBeLessThan(1000);
      console.log(`   ✅ Message Load: ${messageLoadDuration}ms (target: <1000ms)`);
      
      // Target 2: Reaction Response < 100ms
      const reactionStart = Date.now();
      const { error: reactionError } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messages[0].id,
          user_id: testUserId,
          emoji: '🎯'
        });
      const reactionDuration = Date.now() - reactionStart;
      
      expect(reactionError).toBeNull();
      expect(reactionDuration).toBeLessThan(100);
      console.log(`   ✅ Reaction Response: ${reactionDuration}ms (target: <100ms)`);
      
      // Target 3: File Upload Validation < 500ms
      const fileValidationStart = Date.now();
      const response = await fetch(`${BACKEND_TEST_CONFIG.supabase.url}/functions/v1/message-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BACKEND_TEST_CONFIG.supabase.anonKey}`
        },
        body: JSON.stringify({
          action: 'upload_file',
          file_data: {
            filename: 'performance-test.jpg',
            content_type: 'image/jpeg',
            file_size: 5 * 1024 * 1024 // 5MB
          }
        })
      });
      const fileValidationDuration = Date.now() - fileValidationStart;
      
      expect(response.status).toBeLessThan(500);
      expect(fileValidationDuration).toBeLessThan(500);
      console.log(`   ✅ File Validation: ${fileValidationDuration}ms (target: <500ms)`);
      
      console.log('🎉 All performance targets met!');
    });
  });
});