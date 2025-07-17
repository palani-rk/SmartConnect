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
    trackTestData('channel', testChannelId);
    
    // Add admin user to channel as member
    const { error: membershipError } = await supabase
      .from('channel_memberships')
      .insert({
        channel_id: testChannelId,
        user_id: adminUser.id,
        role: 'admin',
        joined_at: new Date().toISOString()
      });
    
    if (membershipError) throw membershipError;
    
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
    
    // Add regular user to channel as member
    const { error: userMembershipError } = await supabase
      .from('channel_memberships')
      .insert({
        channel_id: testChannelId,
        user_id: regularUser.id,
        role: 'member',
        joined_at: new Date().toISOString()
      });
    
    if (userMembershipError) throw userMembershipError;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Clean up any reactions from previous tests with proper authentication
    const adminUser = await authenticateTestUser('admin');
    await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', testMessageId);
    
    // Also clean up as regular user to ensure complete cleanup
    const regularUser = await authenticateTestUser('user');
    await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', testMessageId)
      .eq('user_id', regularUser.id);
    
    createdReactions = [];
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
      // Add initial reaction
      await supabase
        .from('message_reactions')
        .insert({
          message_id: testMessageId,
          user_id: testUserId,
          emoji: '👍'
        });

      // Try to add duplicate reaction
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

    it('should allow same emoji from different users', async () => {
      // Add reaction from regular user
      await supabase
        .from('message_reactions')
        .insert({
          message_id: testMessageId,
          user_id: testUserId,
          emoji: '👍'
        });

      // Switch to admin user and add same emoji
      const adminUser = await authenticateTestUser('admin');
      const { data, error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: testMessageId,
          user_id: adminUser.id,
          emoji: '👍'
        })
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data).toMatchObject({
        message_id: testMessageId,
        user_id: adminUser.id,
        emoji: '👍'
      });
    });

    it('should allow user to update their reaction emoji', async () => {
      // Add initial reaction
      const { data: reaction1, error: error1 } = await supabase
        .from('message_reactions')
        .insert({
          message_id: testMessageId,
          user_id: testUserId,
          emoji: '👍'
        })
        .select()
        .single();
      
      expect(error1).toBeNull();
      expect(reaction1.emoji).toBe('👍');

      // Update reaction to different emoji
      const { data: reaction2, error: error2 } = await supabase
        .from('message_reactions')
        .update({ emoji: '❤️' })
        .eq('id', reaction1.id)
        .select()
        .single();
      
      expect(error2).toBeNull();
      expect(reaction2.emoji).toBe('❤️');
      expect(reaction2.id).toBe(reaction1.id); // Same reaction, updated emoji
    });
  });

  describe('Removing Reactions', () => {
    beforeEach(async () => {
      // Add a reaction to test removal
      await supabase
        .from('message_reactions')
        .insert({
          message_id: testMessageId,
          user_id: testUserId,
          emoji: '👍'
        });
    });

    it('should remove reaction from message', async () => {
      const { data, error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', testMessageId)
        .eq('user_id', testUserId)
        .eq('emoji', '👍')
        .select();
      
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].emoji).toBe('👍');

      // Verify reaction was removed
      const { data: remaining, error: queryError } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', testMessageId)
        .eq('user_id', testUserId)
        .eq('emoji', '👍');
      
      expect(queryError).toBeNull();
      expect(remaining).toHaveLength(0);
    });

    it('should only remove users own reactions', async () => {
      // Add reaction from admin user
      const adminUser = await authenticateTestUser('admin');
      await supabase
        .from('message_reactions')
        .insert({
          message_id: testMessageId,
          user_id: adminUser.id,
          emoji: '👍'
        });

      // Switch back to regular user and try to remove admin's reaction
      await authenticateTestUser('user');
      const { data, error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', testMessageId)
        .eq('user_id', adminUser.id)
        .eq('emoji', '👍')
        .select();
      
      // Should be blocked by RLS policy
      expect(data).toHaveLength(0);
    });
  });

  describe('Reaction Queries', () => {
    beforeEach(async () => {
      // Add reactions for testing - one emoji per user per message
      const adminUser = await authenticateTestUser('admin');
      await supabase.from('message_reactions').insert([
        { message_id: testMessageId, user_id: testUserId, emoji: '👍' },
        { message_id: testMessageId, user_id: adminUser.id, emoji: '❤️' }
      ]);
    });

    it('should get reactions for message', async () => {
      // Create test reactions directly in this test
      const adminUser = await authenticateTestUser('admin');
      const regularUser = await authenticateTestUser('user');
      
      // Insert test reactions
      const { error: insertError } = await supabase.from('message_reactions').insert([
        { message_id: testMessageId, user_id: regularUser.id, emoji: '👍' },
        { message_id: testMessageId, user_id: adminUser.id, emoji: '❤️' }
      ]);
      
      if (insertError) {
        console.error('Failed to insert test reactions:', insertError);
        throw insertError;
      }
      
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', testMessageId);
      
      expect(error).toBeNull();
      expect(data).toHaveLength(2);
      
      const emojis = data.map(r => r.emoji);
      expect(emojis).toContain('👍');
      expect(emojis).toContain('❤️');
    });

    it('should get reaction counts by emoji', async () => {
      // Create test reactions directly in this test
      const adminUser = await authenticateTestUser('admin');
      const regularUser = await authenticateTestUser('user');
      
      // Insert test reactions
      await supabase.from('message_reactions').insert([
        { message_id: testMessageId, user_id: regularUser.id, emoji: '👍' },
        { message_id: testMessageId, user_id: adminUser.id, emoji: '❤️' }
      ]);
      
      const { data, error } = await supabase
        .rpc('get_reaction_counts', { p_message_id: testMessageId });
      
      expect(error).toBeNull();
      expect(data).toContainEqual({ emoji: '👍', count: 1 });
      expect(data).toContainEqual({ emoji: '❤️', count: 1 });
    });

    it('should get messages with reactions', async () => {
      // Create test reactions directly in this test
      const adminUser = await authenticateTestUser('admin');
      const regularUser = await authenticateTestUser('user');
      
      // Insert test reactions
      await supabase.from('message_reactions').insert([
        { message_id: testMessageId, user_id: regularUser.id, emoji: '👍' },
        { message_id: testMessageId, user_id: adminUser.id, emoji: '❤️' }
      ]);
      
      const { data, error } = await supabase
        .rpc('get_messages_with_reactions', { 
          p_channel_id: testChannelId, 
          p_limit: 10 
        });
      
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(testMessageId);
      expect(data[0].reactions).toBeDefined();
      
      const reactions = data[0].reactions;
      expect(reactions).toContainEqual({ emoji: '👍', count: 1 });
      expect(reactions).toContainEqual({ emoji: '❤️', count: 1 });
    });
  });

  describe('RLS Policies', () => {
    it('should only allow viewing reactions in user channels', async () => {
      // Create a channel without the test user as member
      const adminUser = await authenticateTestUser('admin');
      const channelName = generateTestName('test-ch-private-');
      const { data: privateChannel } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          organization_id: TEST_ORG_ID,
          created_by: adminUser.id,
          type: 'private',
          description: 'Private channel for RLS testing'
        })
        .select()
        .single();
      
      trackTestData('channel', privateChannel.id);

      // Add admin user as member of private channel
      await supabase
        .from('channel_memberships')
        .insert({
          channel_id: privateChannel.id,
          user_id: adminUser.id,
          role: 'admin',
          joined_at: new Date().toISOString()
        });

      // Create message in private channel
      const { data: privateMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          channel_id: privateChannel.id,
          user_id: adminUser.id,
          content: 'Private message',
          message_type: 'text'
        })
        .select()
        .single();
      
      if (messageError) {
        console.error('Failed to create private message:', messageError);
        throw messageError;
      }

      // Add reaction to private message
      await supabase
        .from('message_reactions')
        .insert({
          message_id: privateMessage.id,
          user_id: adminUser.id,
          emoji: '🔒'
        });

      // Switch to regular user (not in private channel)
      await authenticateTestUser('user');
      
      // Should not be able to see reactions in private channel
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', privateMessage.id);
      
      expect(data).toHaveLength(0);
    });

    it('should allow users to manage their own reactions', async () => {
      // Regular user should be able to add their own reaction
      const { data, error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: testMessageId,
          user_id: testUserId,
          emoji: '✅'
        })
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data.user_id).toBe(testUserId);
      
      // And remove their own reaction
      const { error: deleteError } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', data.id);
      
      expect(deleteError).toBeNull();
    });
  });
});