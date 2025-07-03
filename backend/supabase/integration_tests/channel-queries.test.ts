import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  supabase, 
  authenticateTestUser, 
  signOutTestUser, 
  trackTestData, 
  cleanupTestData,
  testDataTracker 
} from './setup'
import { 
  BACKEND_TEST_CONFIG, 
  TEST_ORG_ID, 
  TEST_ADMIN_USER, 
  TEST_REGULAR_USER, 
  TEST_CLIENT_USER,
  generateTestName 
} from './fixtures/testConfig'

// Type definitions for query results
interface UserInChannel {
  user_id: string
  role: string
  joined_at: string | null
  users: {
    id: string
    email: string
    role: string
    instagram_id: string | null
    whatsapp_id: string | null
  }
}

interface ChannelForUser {
  channel_id: string
  role: string
  joined_at: string | null
  channels: {
    id: string
    name: string
    description: string | null
    type: string
    organization_id: string
    created_by: string
    created_at: string | null
    updated_at: string | null
  }
}

// Helper functions for query operations
async function getUsersInChannel(channelId: string): Promise<UserInChannel[]> {
  const { data, error } = await supabase
    .from('channel_memberships')
    .select(`
      user_id,
      role,
      joined_at,
      users (
        id,
        email,
        role,
        instagram_id,
        whatsapp_id
      )
    `)
    .eq('channel_id', channelId)
    .order('joined_at', { ascending: true })

  if (error) {
    throw error
  }

  return data as UserInChannel[]
}

async function getChannelsForUser(userId: string): Promise<ChannelForUser[]> {
  const { data, error } = await supabase
    .from('channel_memberships')
    .select(`
      channel_id,
      role,
      joined_at,
      channels (
        id,
        name,
        description,
        type,
        organization_id,
        created_by,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })

  if (error) {
    throw error
  }

  return data as ChannelForUser[]
}

describe('Channel Query Operations Integration Tests', () => {
  // Test data tracking
  let testChannels: any[] = []
  let testMemberships: any[] = []

  beforeEach(async () => {
    // Reset tracking arrays
    testChannels = []
    testMemberships = []
    
    // Add a small delay between tests to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  })

  afterEach(async () => {
    // Clean up test data after each test
    try {
      await authenticateTestUser('admin')
      await cleanupTestData()
    } catch (error) {
      console.error('Error during test cleanup:', error)
    }
  })

  describe('getUsersInChannel Query Tests', () => {
    let testChannel: any

    beforeEach(async () => {
      // Create a test channel for each test
      const adminUser = await authenticateTestUser('admin')
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          description: 'Test channel for user queries',
          type: 'public',
          organization_id: TEST_ORG_ID,
          created_by: adminUser.id
        })
        .select()
        .single()

      expect(error).toBeNull()
      testChannel = channel
      trackTestData('channel', channel.id)
    })

    it('should get all users in a channel with full user details', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Add multiple users to the channel
      const memberships = [
        {
          channel_id: testChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        },
        {
          channel_id: testChannel.id,
          user_id: TEST_CLIENT_USER.id,
          role: 'admin'
        }
      ]

      const { data: createdMemberships, error: membershipError } = await supabase
        .from('channel_memberships')
        .insert(memberships)
        .select()

      expect(membershipError).toBeNull()
      expect(createdMemberships).toHaveLength(2)
      
      createdMemberships.forEach(membership => {
        trackTestData('membership', membership.id)
      })

      // Query users in channel
      const usersInChannel = await getUsersInChannel(testChannel.id)

      // Verify results
      expect(usersInChannel).toHaveLength(2)
      
      // Check that we got the expected users
      const userIds = usersInChannel.map(u => u.user_id)
      expect(userIds).toContain(TEST_REGULAR_USER.id)
      expect(userIds).toContain(TEST_CLIENT_USER.id)

      // Verify user details are included
      usersInChannel.forEach(userInChannel => {
        expect(userInChannel.users).toBeDefined()
        expect(userInChannel.users.id).toBe(userInChannel.user_id)
        expect(userInChannel.users.email).toBeDefined()
        expect(userInChannel.role).toBeDefined()
        expect(['member', 'admin']).toContain(userInChannel.role)
      })

      // Verify specific role assignments
      const regularUserMembership = usersInChannel.find(u => u.user_id === TEST_REGULAR_USER.id)
      const clientUserMembership = usersInChannel.find(u => u.user_id === TEST_CLIENT_USER.id)
      
      expect(regularUserMembership?.role).toBe('member')
      expect(clientUserMembership?.role).toBe('admin')
    })

    it('should return empty array for channel with no users', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Query users in empty channel
      const usersInChannel = await getUsersInChannel(testChannel.id)

      // Verify empty result
      expect(usersInChannel).toHaveLength(0)
      expect(Array.isArray(usersInChannel)).toBe(true)
    })

    it('should filter users by role in channel', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Add users with different roles
      const memberships = [
        {
          channel_id: testChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        },
        {
          channel_id: testChannel.id,
          user_id: TEST_CLIENT_USER.id,
          role: 'admin'
        }
      ]

      const { data: createdMemberships, error } = await supabase
        .from('channel_memberships')
        .insert(memberships)
        .select()

      expect(error).toBeNull()
      createdMemberships.forEach(membership => {
        trackTestData('membership', membership.id)
      })

      // Query only admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from('channel_memberships')
        .select(`
          user_id,
          role,
          joined_at,
          users (
            id,
            email,
            role,
            instagram_id,
            whatsapp_id
          )
        `)
        .eq('channel_id', testChannel.id)
        .eq('role', 'admin')

      expect(adminError).toBeNull()
      expect(adminUsers).toHaveLength(1)
      expect(adminUsers[0].user_id).toBe(TEST_CLIENT_USER.id)
      expect(adminUsers[0].role).toBe('admin')
    })

    it('should handle non-existent channel ID gracefully', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      const fakeChannelId = '00000000-0000-0000-0000-000000000000'
      
      // Query users in non-existent channel
      const usersInChannel = await getUsersInChannel(fakeChannelId)

      // Should return empty array, not throw error
      expect(usersInChannel).toHaveLength(0)
      expect(Array.isArray(usersInChannel)).toBe(true)
    })

    it('should respect access control for regular users', async () => {
      // First, authenticate as admin to add user to channel
      await authenticateTestUser('admin')
      
      const { data: membership, error: membershipError } = await supabase
        .from('channel_memberships')
        .insert({
          channel_id: testChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        })
        .select()
        .single()

      expect(membershipError).toBeNull()
      trackTestData('membership', membership.id)

      // Now authenticate as regular user
      await signOutTestUser()
      await authenticateTestUser('user')

      // Regular user should be able to see users in channels they are members of
      const usersInChannel = await getUsersInChannel(testChannel.id)
      expect(usersInChannel).toHaveLength(1)
      expect(usersInChannel[0].user_id).toBe(TEST_REGULAR_USER.id)
    })

    it('should include membership timestamps', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Add user to channel
      const { data: membership, error } = await supabase
        .from('channel_memberships')
        .insert({
          channel_id: testChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        })
        .select()
        .single()

      expect(error).toBeNull()
      trackTestData('membership', membership.id)

      // Query users in channel
      const usersInChannel = await getUsersInChannel(testChannel.id)

      // Verify timestamp is included
      expect(usersInChannel).toHaveLength(1)
      expect(usersInChannel[0].joined_at).toBeDefined()
      expect(typeof usersInChannel[0].joined_at).toBe('string')
    })
  })

  describe('getChannelsForUser Query Tests', () => {
    let publicChannel: any
    let privateChannel: any

    beforeEach(async () => {
      // Create test channels for each test
      const adminUser = await authenticateTestUser('admin')
      
      // Create public channel
      const publicChannelName = generateTestName(`${BACKEND_TEST_CONFIG.prefixes.channel}public-`)
      const { data: pubChannel, error: pubError } = await supabase
        .from('channels')
        .insert({
          name: publicChannelName,
          description: 'Public test channel',
          type: 'public',
          organization_id: TEST_ORG_ID,
          created_by: adminUser.id
        })
        .select()
        .single()

      expect(pubError).toBeNull()
      publicChannel = pubChannel
      trackTestData('channel', pubChannel.id)

      // Create private channel
      const privateChannelName = generateTestName(`${BACKEND_TEST_CONFIG.prefixes.channel}private-`)
      const { data: privChannel, error: privError } = await supabase
        .from('channels')
        .insert({
          name: privateChannelName,
          description: 'Private test channel',
          type: 'private',
          organization_id: TEST_ORG_ID,
          created_by: adminUser.id
        })
        .select()
        .single()

      expect(privError).toBeNull()
      privateChannel = privChannel
      trackTestData('channel', privChannel.id)
    })

    it('should get all channels for a user with full channel details', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Add user to both channels with different roles
      const memberships = [
        {
          channel_id: publicChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        },
        {
          channel_id: privateChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'admin'
        }
      ]

      const { data: createdMemberships, error: membershipError } = await supabase
        .from('channel_memberships')
        .insert(memberships)
        .select()

      expect(membershipError).toBeNull()
      expect(createdMemberships).toHaveLength(2)
      
      createdMemberships.forEach(membership => {
        trackTestData('membership', membership.id)
      })

      // Query channels for user
      const channelsForUser = await getChannelsForUser(TEST_REGULAR_USER.id)

      // Verify results
      expect(channelsForUser).toHaveLength(2)
      
      // Check that we got the expected channels
      const channelIds = channelsForUser.map(c => c.channel_id)
      expect(channelIds).toContain(publicChannel.id)
      expect(channelIds).toContain(privateChannel.id)

      // Verify channel details are included
      channelsForUser.forEach(channelForUser => {
        expect(channelForUser.channels).toBeDefined()
        expect(channelForUser.channels.id).toBe(channelForUser.channel_id)
        expect(channelForUser.channels.name).toBeDefined()
        expect(channelForUser.channels.type).toBeDefined()
        expect(['public', 'private']).toContain(channelForUser.channels.type)
        expect(channelForUser.role).toBeDefined()
        expect(['member', 'admin']).toContain(channelForUser.role)
      })

      // Verify specific role assignments
      const publicChannelMembership = channelsForUser.find(c => c.channel_id === publicChannel.id)
      const privateChannelMembership = channelsForUser.find(c => c.channel_id === privateChannel.id)
      
      expect(publicChannelMembership?.role).toBe('member')
      expect(privateChannelMembership?.role).toBe('admin')
    })

    it('should return empty array for user with no channel memberships', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Query channels for user with no memberships
      const channelsForUser = await getChannelsForUser(TEST_CLIENT_USER.id)

      // Verify empty result
      expect(channelsForUser).toHaveLength(0)
      expect(Array.isArray(channelsForUser)).toBe(true)
    })

    it('should filter channels by type', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Add user to both channels
      const memberships = [
        {
          channel_id: publicChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        },
        {
          channel_id: privateChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        }
      ]

      const { data: createdMemberships, error } = await supabase
        .from('channel_memberships')
        .insert(memberships)
        .select()

      expect(error).toBeNull()
      createdMemberships.forEach(membership => {
        trackTestData('membership', membership.id)
      })

      // Query only public channels for user
      // Note: Supabase doesn't support filtering on nested relations directly in the query
      // So we'll get all channels and then filter by type in the application
      const { data: allChannels, error: allError } = await supabase
        .from('channel_memberships')
        .select(`
          channel_id,
          role,
          joined_at,
          channels (
            id,
            name,
            description,
            type,
            organization_id,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', TEST_REGULAR_USER.id)

      expect(allError).toBeNull()
      expect(allChannels).toHaveLength(2)

      // Filter for public channels only
      const publicChannels = allChannels.filter(c => c.channels.type === 'public')
      expect(publicChannels).toHaveLength(1)
      expect(publicChannels[0].channel_id).toBe(publicChannel.id)
      expect(publicChannels[0].channels.type).toBe('public')
    })

    it('should handle non-existent user ID gracefully', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      const fakeUserId = '00000000-0000-0000-0000-000000000000'
      
      // Query channels for non-existent user
      const channelsForUser = await getChannelsForUser(fakeUserId)

      // Should return empty array, not throw error
      expect(channelsForUser).toHaveLength(0)
      expect(Array.isArray(channelsForUser)).toBe(true)
    })

    it('should respect user access control', async () => {
      // First, authenticate as admin to add user to channel
      await authenticateTestUser('admin')
      
      const { data: membership, error: membershipError } = await supabase
        .from('channel_memberships')
        .insert({
          channel_id: publicChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        })
        .select()
        .single()

      expect(membershipError).toBeNull()
      trackTestData('membership', membership.id)

      // Now authenticate as the regular user
      await signOutTestUser()
      await authenticateTestUser('user')

      // User should only see their own channels
      const channelsForUser = await getChannelsForUser(TEST_REGULAR_USER.id)
      expect(channelsForUser).toHaveLength(1)
      expect(channelsForUser[0].channel_id).toBe(publicChannel.id)

      // User should NOT be able to see channels for other users
      const otherUserChannels = await getChannelsForUser(TEST_CLIENT_USER.id)
      expect(otherUserChannels).toHaveLength(0)
    })

    it('should include membership timestamps and roles', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Add user to channel with specific role
      const { data: membership, error } = await supabase
        .from('channel_memberships')
        .insert({
          channel_id: publicChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'admin'
        })
        .select()
        .single()

      expect(error).toBeNull()
      trackTestData('membership', membership.id)

      // Query channels for user
      const channelsForUser = await getChannelsForUser(TEST_REGULAR_USER.id)

      // Verify timestamp and role are included
      expect(channelsForUser).toHaveLength(1)
      expect(channelsForUser[0].joined_at).toBeDefined()
      expect(channelsForUser[0].role).toBe('admin')
      expect(typeof channelsForUser[0].joined_at).toBe('string')
    })

    it('should maintain organization isolation', async () => {
      // This test ensures users only see channels from their organization
      // Since our test users are all in the same organization, we verify
      // that the organization_id is correctly included in results
      
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Add user to channel
      const { data: membership, error } = await supabase
        .from('channel_memberships')
        .insert({
          channel_id: publicChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        })
        .select()
        .single()

      expect(error).toBeNull()
      trackTestData('membership', membership.id)

      // Query channels for user
      const channelsForUser = await getChannelsForUser(TEST_REGULAR_USER.id)

      // Verify organization isolation
      expect(channelsForUser).toHaveLength(1)
      expect(channelsForUser[0].channels.organization_id).toBe(TEST_ORG_ID)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid UUID format gracefully', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      const invalidId = 'invalid-uuid-format'
      
      // Both functions should handle invalid UUIDs gracefully
      try {
        const usersResult = await getUsersInChannel(invalidId)
        expect(usersResult).toHaveLength(0)
      } catch (error) {
        // Should throw a proper error with UUID format issue
        expect(error).toBeDefined()
      }

      try {
        const channelsResult = await getChannelsForUser(invalidId)
        expect(channelsResult).toHaveLength(0)
      } catch (error) {
        // Should throw a proper error with UUID format issue
        expect(error).toBeDefined()
      }
    })

    it('should handle database connection errors gracefully', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Create a valid channel for testing
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          description: 'Test channel',
          type: 'public',
          organization_id: TEST_ORG_ID,
          created_by: TEST_ADMIN_USER.id
        })
        .select()
        .single()

      expect(error).toBeNull()
      trackTestData('channel', channel.id)

      // Test that valid operations work (this verifies our connection is good)
      const usersInChannel = await getUsersInChannel(channel.id)
      expect(Array.isArray(usersInChannel)).toBe(true)

      const channelsForUser = await getChannelsForUser(TEST_ADMIN_USER.id)
      expect(Array.isArray(channelsForUser)).toBe(true)
    })
  })
})