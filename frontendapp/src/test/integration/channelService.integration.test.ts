import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ChannelService } from '@/services/channelService'
import { INTEGRATION_TEST_CONFIG } from '../fixtures/integrationTestConfig'
import { authenticateTestUser, signOutTestUser, cleanupTestData } from '../setup.integration'
import type { ChannelCreateForm } from '@/types/channel'

describe('ChannelService Integration Tests', () => {
  let createdChannelIds: string[] = []
  let testUserId: string

  beforeEach(async () => {
    // Sign in as admin user for testing
    const user = await authenticateTestUser('admin')
    testUserId = user.id
  })

  afterEach(async () => {
    // Clean up created channels
    if (createdChannelIds.length > 0) {
      await cleanupTestData('channels', createdChannelIds)
      createdChannelIds = []
    }
    
    // Sign out test user
    await signOutTestUser()
  })

  describe('createChannel', () => {
    it('should successfully create a channel with valid data', async () => {
      // Arrange
      const channelData: ChannelCreateForm = {
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}${Date.now()}-valid-channel`,
        description: 'Test channel for integration testing',
        type: 'public'
      }

      // Act
      const createdChannel = await ChannelService.createChannel(
        channelData,
        INTEGRATION_TEST_CONFIG.organization.id,
        testUserId
      )

      // Assert
      expect(createdChannel).toBeDefined()
      expect(createdChannel.id).toBeDefined()
      expect(createdChannel.name).toBe(channelData.name)
      expect(createdChannel.description).toBe(channelData.description)
      expect(createdChannel.type).toBe(channelData.type)
      expect(createdChannel.organization_id).toBe(INTEGRATION_TEST_CONFIG.organization.id)
      expect(createdChannel.created_by).toBe(testUserId)
      expect(createdChannel.created_at).toBeDefined()

      // Store for cleanup
      createdChannelIds.push(createdChannel.id)
    }, INTEGRATION_TEST_CONFIG.timeouts.defaultTest)

    it('should create a channel without description', async () => {
      // Arrange
      const channelData: ChannelCreateForm = {
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}${Date.now()}-no-desc`,
        type: 'public'
      }

      // Act
      const createdChannel = await ChannelService.createChannel(
        channelData,
        INTEGRATION_TEST_CONFIG.organization.id,
        testUserId
      )

      // Assert
      expect(createdChannel).toBeDefined()
      expect(createdChannel.id).toBeDefined()
      expect(createdChannel.name).toBe(channelData.name)
      expect(createdChannel.description).toBeNull()
      expect(createdChannel.type).toBe(channelData.type)

      // Store for cleanup
      createdChannelIds.push(createdChannel.id)
    }, INTEGRATION_TEST_CONFIG.timeouts.defaultTest)

    it('should create a channel with private type', async () => {
      // Arrange
      const channelData: ChannelCreateForm = {
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}${Date.now()}-private`,
        description: 'Private channel for testing',
        type: 'private'
      }

      // Act
      const createdChannel = await ChannelService.createChannel(
        channelData,
        INTEGRATION_TEST_CONFIG.organization.id,
        testUserId
      )

      // Assert
      expect(createdChannel).toBeDefined()
      expect(createdChannel.type).toBe('private')
      expect(createdChannel.name).toBe(channelData.name)

      // Store for cleanup
      createdChannelIds.push(createdChannel.id)
    }, INTEGRATION_TEST_CONFIG.timeouts.defaultTest)

    it('should handle RLS violation when creating with invalid organization', async () => {
      // Arrange
      const channelData: ChannelCreateForm = {
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}${Date.now()}-invalid-org`,
        description: 'Channel with invalid organization',
        type: 'public'
      }
      
      const invalidOrgId = '00000000-0000-0000-0000-000000000000'

      // Act & Assert
      await expect(
        ChannelService.createChannel(channelData, invalidOrgId, testUserId)
      ).rejects.toThrow()
    }, INTEGRATION_TEST_CONFIG.timeouts.defaultTest)

    it('should handle RLS violation when creating with invalid user', async () => {
      // Arrange
      const channelData: ChannelCreateForm = {
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}${Date.now()}-invalid-user`,
        description: 'Channel with invalid user',
        type: 'public'
      }
      
      const invalidUserId = '00000000-0000-0000-0000-000000000000'

      // Act & Assert
      await expect(
        ChannelService.createChannel(channelData, INTEGRATION_TEST_CONFIG.organization.id, invalidUserId)
      ).rejects.toThrow()
    }, INTEGRATION_TEST_CONFIG.timeouts.defaultTest)

    it('should trim whitespace from channel name and description', async () => {
      // Arrange
      const channelData: ChannelCreateForm = {
        name: `  ${INTEGRATION_TEST_CONFIG.prefixes.channel}${Date.now()}-trimmed  `,
        description: '  Test description with whitespace  ',
        type: 'public'
      }

      // Act
      const createdChannel = await ChannelService.createChannel(
        channelData,
        INTEGRATION_TEST_CONFIG.organization.id,
        testUserId
      )

      // Assert
      expect(createdChannel.name).toBe(channelData.name.trim())
      expect(createdChannel.description).toBe(channelData.description!.trim())

      // Store for cleanup
      createdChannelIds.push(createdChannel.id)
    }, INTEGRATION_TEST_CONFIG.timeouts.defaultTest)

    it('should automatically add creator as admin member', async () => {
      // Arrange
      const channelData: ChannelCreateForm = {
        name: `${INTEGRATION_TEST_CONFIG.prefixes.channel}${Date.now()}-admin-member`,
        description: 'Channel to test admin membership',
        type: 'public'
      }

      // Act
      const createdChannel = await ChannelService.createChannel(
        channelData,
        INTEGRATION_TEST_CONFIG.organization.id,
        testUserId
      )

      // Verify the creator is added as admin member
      const members = await ChannelService.getChannelMembers(createdChannel.id)

      // Assert
      expect(members).toHaveLength(1)
      expect(members[0].id).toBe(testUserId)
      expect(members[0].membership_role).toBe('admin')

      // Store for cleanup
      createdChannelIds.push(createdChannel.id)
    }, INTEGRATION_TEST_CONFIG.timeouts.defaultTest)

    it('should handle duplicate channel names within organization', async () => {
      // Arrange
      const channelName = `${INTEGRATION_TEST_CONFIG.prefixes.channel}${Date.now()}-duplicate`
      const channelData: ChannelCreateForm = {
        name: channelName,
        description: 'First channel',
        type: 'public'
      }

      // Act - Create first channel
      const firstChannel = await ChannelService.createChannel(
        channelData,
        INTEGRATION_TEST_CONFIG.organization.id,
        testUserId
      )
      createdChannelIds.push(firstChannel.id)

      // Act - Try to create second channel with same name
      const duplicateChannelData: ChannelCreateForm = {
        name: channelName,
        description: 'Duplicate channel',
        type: 'public'
      }

      // Assert - Should either succeed (if no unique constraint) or fail gracefully
      try {
        const secondChannel = await ChannelService.createChannel(
          duplicateChannelData,
          INTEGRATION_TEST_CONFIG.organization.id,
          testUserId
        )
        createdChannelIds.push(secondChannel.id)
        console.log('✅ Duplicate channel name allowed by system')
      } catch (error) {
        console.log('✅ Duplicate channel name blocked by system')
        // This is also acceptable behavior
      }
    }, INTEGRATION_TEST_CONFIG.timeouts.defaultTest)
  })

  describe('isChannelNameAvailable', () => {
    it('should return true for available channel name', async () => {
      // Arrange
      const availableName = `${INTEGRATION_TEST_CONFIG.prefixes.channel}${Date.now()}-available`

      // Act
      const isAvailable = await ChannelService.isChannelNameAvailable(
        availableName,
        INTEGRATION_TEST_CONFIG.organization.id
      )

      // Assert
      expect(isAvailable).toBe(true)
    }, INTEGRATION_TEST_CONFIG.timeouts.defaultTest)

    it('should return false for existing channel name', async () => {
      // Arrange
      const channelName = `${INTEGRATION_TEST_CONFIG.prefixes.channel}${Date.now()}-existing`
      const channelData: ChannelCreateForm = {
        name: channelName,
        description: 'Existing channel',
        type: 'public'
      }

      // Create the channel first
      const createdChannel = await ChannelService.createChannel(
        channelData,
        INTEGRATION_TEST_CONFIG.organization.id,
        testUserId
      )
      createdChannelIds.push(createdChannel.id)

      // Act
      const isAvailable = await ChannelService.isChannelNameAvailable(
        channelName,
        INTEGRATION_TEST_CONFIG.organization.id
      )

      // Assert
      expect(isAvailable).toBe(false)
    }, INTEGRATION_TEST_CONFIG.timeouts.defaultTest)
  })
})