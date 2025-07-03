import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { ChannelService } from '@/services/channelService'
import { cleanupTestData, authenticateTestUser, signOutTestUser } from '@/test/setup.integration'
import { 
  TEST_ORG_ID, 
  TEST_ADMIN_USER_ID,
  TEST_USER_ID,
  TEST_CLIENT_USER_ID,
  INTEGRATION_TEST_CONFIG
} from '@/test/fixtures/integrationTestConfig'
import type { 
  Channel, 
  CreateChannelRequest,
  ChannelWithMembers,
  ChannelSearchParams 
} from '@/types/channel'

describe('ChannelService Integration Tests', () => {
  let createdChannelIds: string[] = []

  afterEach(async () => {
    // Clean up created channels after each test
    await cleanupTestData('channels', createdChannelIds)
    createdChannelIds = []
    
    // Sign out after each test
    await signOutTestUser()
  })

  describe('Channel CRUD Operations', () => {
    beforeEach(async () => {
      // Authenticate with admin user for channel management operations
      await authenticateTestUser('admin')
    })

    it('should create a new channel successfully', async () => {
      const channelData: CreateChannelRequest = {
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}integration-test`,
        description: 'Integration test channel',
        type: 'public',
        organization_id: TEST_ORG_ID,
        created_by: TEST_ADMIN_USER_ID
      }

      const channel = await ChannelService.createChannel(channelData)
      createdChannelIds.push(channel.id)

      expect(channel).toBeDefined()
      expect(channel.name).toBe(channelData.name)
      expect(channel.description).toBe(channelData.description)
      expect(channel.type).toBe(channelData.type)
      expect(channel.organization_id).toBe(TEST_ORG_ID)
      expect(channel.created_by).toBe(TEST_ADMIN_USER_ID)
      expect(channel.id).toBeDefined()
      expect(channel.created_at).toBeDefined()
    })

    it('should create a private channel', async () => {
      const channelData: CreateChannelRequest = {
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}private-test`,
        description: 'Private integration test channel',
        type: 'private',
        organization_id: TEST_ORG_ID,
        created_by: TEST_ADMIN_USER_ID
      }

      const channel = await ChannelService.createChannel(channelData)
      createdChannelIds.push(channel.id)

      expect(channel.type).toBe('private')
      expect(channel.name).toBe(channelData.name)
    })

    it('should fail to create channel with duplicate name', async () => {
      const channelData: CreateChannelRequest = {
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}duplicate-test`,
        description: 'First channel',
        type: 'public',
        organization_id: TEST_ORG_ID,
        created_by: TEST_ADMIN_USER_ID
      }

      // Create first channel
      const firstChannel = await ChannelService.createChannel(channelData)
      createdChannelIds.push(firstChannel.id)

      // Try to create second channel with same name
      const duplicateChannelData: CreateChannelRequest = {
        ...channelData,
        description: 'Duplicate channel'
      }

      await expect(ChannelService.createChannel(duplicateChannelData))
        .rejects.toThrow()
    })

    it('should get channels by organization', async () => {
      // Create test channels
      const channel1 = await ChannelService.createChannel({
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}list-test-1`,
        description: 'Test channel 1',
        type: 'public',
        organization_id: TEST_ORG_ID,
        created_by: TEST_ADMIN_USER_ID
      })
      createdChannelIds.push(channel1.id)

      const channel2 = await ChannelService.createChannel({
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}list-test-2`,
        description: 'Test channel 2',
        type: 'private',
        organization_id: TEST_ORG_ID,
        created_by: TEST_ADMIN_USER_ID
      })
      createdChannelIds.push(channel2.id)

      const response = await ChannelService.getChannelsByOrganization(TEST_ORG_ID)

      expect(response.channels).toBeDefined()
      expect(response.total).toBeGreaterThanOrEqual(2)
      expect(response.channels.some(c => c.name === channel1.name)).toBe(true)
      expect(response.channels.some(c => c.name === channel2.name)).toBe(true)
    })

    it('should search channels by name', async () => {
      // Create test channel with specific name
      const channel = await ChannelService.createChannel({
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}searchable-nutrition-tips`,
        description: 'Searchable nutrition tips channel',
        type: 'public',
        organization_id: TEST_ORG_ID,
        created_by: TEST_ADMIN_USER_ID
      })
      createdChannelIds.push(channel.id)

      const searchParams: ChannelSearchParams = {
        search: 'nutrition'
      }

      const response = await ChannelService.getChannelsByOrganization(TEST_ORG_ID, searchParams)

      expect(response.channels).toBeDefined()
      expect(response.channels.some(c => c.name.includes('nutrition'))).toBe(true)
    })

    it('should filter channels by type', async () => {
      // Create channels of different types
      const publicChannel = await ChannelService.createChannel({
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}public-filter`,
        type: 'public',
        organization_id: TEST_ORG_ID,
        created_by: TEST_ADMIN_USER_ID
      })
      createdChannelIds.push(publicChannel.id)

      const privateChannel = await ChannelService.createChannel({
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}private-filter`,
        type: 'private',
        organization_id: TEST_ORG_ID,
        created_by: TEST_ADMIN_USER_ID
      })
      createdChannelIds.push(privateChannel.id)

      // Filter for private channels only
      const privateResponse = await ChannelService.getChannelsByOrganization(TEST_ORG_ID, {
        type: 'private'
      })

      expect(privateResponse.channels.every(c => c.type === 'private')).toBe(true)
      expect(privateResponse.channels.some(c => c.name === privateChannel.name)).toBe(true)
    })

    it('should get channel with members', async () => {
      const channel = await ChannelService.createChannel({
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}with-members`,
        description: 'Test channel for member retrieval',
        type: 'public',
        organization_id: TEST_ORG_ID,
        created_by: TEST_ADMIN_USER_ID
      })
      createdChannelIds.push(channel.id)

      const channelWithMembers = await ChannelService.getChannelWithMembers(channel.id)

      expect(channelWithMembers).toBeDefined()
      expect(channelWithMembers.id).toBe(channel.id)
      expect(channelWithMembers.members).toBeDefined()
      expect(channelWithMembers.member_count).toBeDefined()
      expect(Array.isArray(channelWithMembers.members)).toBe(true)
    })

    it('should update channel', async () => {
      const channel = await ChannelService.createChannel({
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}to-update`,
        description: 'Original description',
        type: 'public',
        organization_id: TEST_ORG_ID,
        created_by: TEST_ADMIN_USER_ID
      })
      createdChannelIds.push(channel.id)

      const updatedChannel = await ChannelService.updateChannel(channel.id, {
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}updated`,
        description: 'Updated description'
      })

      expect(updatedChannel.name).toBe(`${INTEGRATION_TEST_CONFIG.prefixes.channel}updated`)
      expect(updatedChannel.description).toBe('Updated description')
      expect(updatedChannel.updated_at).not.toBe(channel.updated_at)
    })

    it('should delete channel', async () => {
      const channel = await ChannelService.createChannel({
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}to-delete`,
        description: 'This channel will be deleted',
        type: 'public',
        organization_id: TEST_ORG_ID,
        created_by: TEST_ADMIN_USER_ID
      })

      await ChannelService.deleteChannel(channel.id)

      // Verify channel is deleted - don't add to cleanup list since it's already deleted
      await expect(ChannelService.getChannelWithMembers(channel.id))
        .rejects.toThrow()
    })
  })

  describe('Channel Membership Management', () => {
    let testChannel: Channel

    beforeEach(async () => {
      // Authenticate with admin user for membership management operations
      await authenticateTestUser('admin')
      
      testChannel = await ChannelService.createChannel({
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}membership-${Date.now()}`,
        description: 'Channel for testing membership operations',
        type: 'public',
        organization_id: TEST_ORG_ID,
        created_by: TEST_ADMIN_USER_ID
      })
      createdChannelIds.push(testChannel.id)
    })

    it('should add users to channel', async () => {
      const userIds = [TEST_USER_ID]
      
      const results = await ChannelService.addUsersToChannel(testChannel.id, userIds, 'member')

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].success).toBe(true)
      expect(results[0].user_id).toBe(TEST_USER_ID)
    })

    it('should add multiple users to channel', async () => {
      const userIds = [TEST_USER_ID, TEST_CLIENT_USER_ID]
      
      const results = await ChannelService.addUsersToChannel(testChannel.id, userIds, 'member')

      expect(results.length).toBe(2)
      expect(results.every(r => r.success)).toBe(true)
    })

    it('should get channel members', async () => {
      // Add user to channel first
      await ChannelService.addUsersToChannel(testChannel.id, [TEST_USER_ID], 'member')

      const members = await ChannelService.getChannelMembers(testChannel.id)

      expect(members).toBeDefined()
      expect(Array.isArray(members)).toBe(true)
      expect(members.some(m => m.user_id === TEST_USER_ID)).toBe(true)
    })

    it('should remove user from channel', async () => {
      // Add user first
      await ChannelService.addUsersToChannel(testChannel.id, [TEST_USER_ID], 'member')

      // Remove user
      const success = await ChannelService.removeUserFromChannel(testChannel.id, TEST_USER_ID)

      expect(success).toBe(true)

      // Verify user is removed
      const members = await ChannelService.getChannelMembers(testChannel.id)
      expect(members.some(m => m.user_id === TEST_USER_ID)).toBe(false)
    })

    it('should get user channels', async () => {
      // Add user to channel
      await ChannelService.addUsersToChannel(testChannel.id, [TEST_USER_ID], 'member')

      const userChannels = await ChannelService.getUserChannels(TEST_USER_ID)

      expect(userChannels).toBeDefined()
      expect(Array.isArray(userChannels)).toBe(true)
      expect(userChannels.some(c => c.channel_id === testChannel.id)).toBe(true)
    })

    it('should check if user can manage channel', async () => {
      // Test admin user (channel creator) - already authenticated as admin
      const adminCanManage = await ChannelService.canUserManageChannel(TEST_ADMIN_USER_ID, testChannel.id)
      expect(adminCanManage).toBe(true)

      // Test regular user permissions
      const userCanManage = await ChannelService.canUserManageChannel(TEST_USER_ID, testChannel.id)
      expect(userCanManage).toBe(false)
    })
  })

  describe('Utility Functions', () => {
    let testChannel: Channel

    beforeEach(async () => {
      // Authenticate with admin user for utility operations
      await authenticateTestUser('admin')
      
      testChannel = await ChannelService.createChannel({
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}utility-${Date.now()}`,
        type: 'public',
        organization_id: TEST_ORG_ID,
        created_by: TEST_ADMIN_USER_ID
      })
      createdChannelIds.push(testChannel.id)
    })

    it('should get users not in channel', async () => {
      const usersNotInChannel = await ChannelService.getUsersNotInChannel(testChannel.id, TEST_ORG_ID)

      expect(usersNotInChannel).toBeDefined()
      expect(Array.isArray(usersNotInChannel)).toBe(true)
      // Should include TEST_USER_ID since they're not added to channel yet
    })

    it('should get channel statistics', async () => {
      const stats = await ChannelService.getChannelStats(TEST_ORG_ID)

      expect(stats).toBeDefined()
      expect(stats.total).toBeGreaterThanOrEqual(1)
      expect(stats.byType).toBeDefined()
      expect(stats.publicChannels).toBeDefined()
      expect(stats.privateChannels).toBeDefined()
      expect(stats.publicChannels + stats.privateChannels).toBe(stats.total)
    })
  })

  describe('Error Scenarios', () => {
    beforeEach(async () => {
      // Authenticate with admin user for error scenario tests that need authentication
      await authenticateTestUser('admin')
    })

    it('should handle invalid channel ID', async () => {
      const invalidChannelId = '00000000-0000-0000-0000-000000000000'
      
      await expect(ChannelService.getChannelWithMembers(invalidChannelId))
        .rejects.toThrow()
    })

    it('should handle invalid organization ID', async () => {
      const invalidOrgId = '00000000-0000-0000-0000-000000000000'
      
      const response = await ChannelService.getChannelsByOrganization(invalidOrgId)
      expect(response.channels).toHaveLength(0)
      expect(response.total).toBe(0)
    })

    it('should handle invalid user ID when adding to channel', async () => {
      const channel = await ChannelService.createChannel({
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}error-test`,
        type: 'public',
        organization_id: TEST_ORG_ID,
        created_by: TEST_ADMIN_USER_ID
      })
      createdChannelIds.push(channel.id)

      const invalidUserId = '00000000-0000-0000-0000-000000000000'
      
      await expect(ChannelService.addUsersToChannel(channel.id, [invalidUserId], 'member'))
        .rejects.toThrow()
    })
  })
})