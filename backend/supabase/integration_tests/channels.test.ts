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

describe('Channel Management API Integration Tests', () => {
  // Test data tracking
  let testChannelIds: string[] = []
  let testMembershipIds: string[] = []

  beforeEach(async () => {
    // Reset tracking arrays
    testChannelIds = []
    testMembershipIds = []
    
    // Add a small delay between tests to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  })

  afterEach(async () => {
    // Clean up test data after each test
    // First authenticate as admin to ensure we have permissions for cleanup
    try {
      await authenticateTestUser('admin')
      await cleanupTestData()
    } catch (error) {
      console.error('Error during test cleanup:', error)
    }
    // Don't sign out between tests to avoid rate limiting
    // await signOutTestUser()
  })

  describe('Channel CRUD Operations', () => {
    it('should allow admin to create a public channel', async () => {
      // Authenticate as admin user
      const adminUser = await authenticateTestUser('admin')
      expect(adminUser.id).toBe(TEST_ADMIN_USER.id)

      // Create a test channel
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      const channelData = {
        name: channelName,
        description: 'Test channel for integration testing',
        type: 'public',
        organization_id: TEST_ORG_ID,
        created_by: adminUser.id
      }

      const { data: channel, error } = await supabase
        .from('channels')
        .insert(channelData)
        .select()
        .single()

      // Verify channel creation
      expect(error).toBeNull()
      expect(channel).toBeDefined()
      expect(channel.id).toBeDefined()
      expect(channel.name).toBe(channelName)
      expect(channel.type).toBe('public')
      expect(channel.organization_id).toBe(TEST_ORG_ID)
      expect(channel.created_by).toBe(adminUser.id)
      expect(channel.created_at).toBeDefined()
      expect(channel.updated_at).toBeDefined()

      // Track for cleanup
      trackTestData('channel', channel.id)
    })

    it('should allow admin to create a private channel', async () => {
      // Authenticate as admin user
      const adminUser = await authenticateTestUser('admin')

      // Create a private test channel
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      const channelData = {
        name: channelName,
        description: 'Private test channel',
        type: 'private',
        organization_id: TEST_ORG_ID,
        created_by: adminUser.id
      }

      const { data: channel, error } = await supabase
        .from('channels')
        .insert(channelData)
        .select()
        .single()

      // Verify private channel creation
      expect(error).toBeNull()
      expect(channel).toBeDefined()
      expect(channel.type).toBe('private')

      // Track for cleanup
      trackTestData('channel', channel.id)
    })

    it('should prevent duplicate channel names within organization', async () => {
      // Authenticate as admin user
      const adminUser = await authenticateTestUser('admin')

      // Create first channel
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      const channelData = {
        name: channelName,
        description: 'First channel',
        type: 'public',
        organization_id: TEST_ORG_ID,
        created_by: adminUser.id
      }

      const { data: firstChannel, error: firstError } = await supabase
        .from('channels')
        .insert(channelData)
        .select()
        .single()

      expect(firstError).toBeNull()
      expect(firstChannel).toBeDefined()
      trackTestData('channel', firstChannel.id)

      // Try to create second channel with same name
      const { data: secondChannel, error: secondError } = await supabase
        .from('channels')
        .insert(channelData)
        .select()
        .single()

      // Should fail due to unique constraint
      expect(secondError).toBeDefined()
      expect(secondError?.code).toBe('23505') // PostgreSQL unique violation
      expect(secondChannel).toBeNull()
    })

    it('should allow admin to update channel details', async () => {
      // Authenticate as admin user
      const adminUser = await authenticateTestUser('admin')

      // Create a test channel first
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      const { data: channel, error: createError } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          description: 'Original description',
          type: 'public',
          organization_id: TEST_ORG_ID,
          created_by: adminUser.id
        })
        .select()
        .single()

      expect(createError).toBeNull()
      trackTestData('channel', channel.id)

      // Update the channel
      const updatedName = `${channelName}-updated`
      const { data: updatedChannel, error: updateError } = await supabase
        .from('channels')
        .update({
          name: updatedName,
          description: 'Updated description',
          type: 'private'
        })
        .eq('id', channel.id)
        .select()
        .single()

      // Verify update
      expect(updateError).toBeNull()
      expect(updatedChannel).toBeDefined()
      expect(updatedChannel.name).toBe(updatedName)
      expect(updatedChannel.description).toBe('Updated description')
      expect(updatedChannel.type).toBe('private')
      expect(updatedChannel.updated_at).not.toBe(channel.updated_at)
    })

    it('should allow admin to delete a channel', async () => {
      // Authenticate as admin user
      const adminUser = await authenticateTestUser('admin')

      // Create a test channel first
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      const { data: channel, error: createError } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          description: 'Channel to be deleted',
          type: 'public',
          organization_id: TEST_ORG_ID,
          created_by: adminUser.id
        })
        .select()
        .single()

      expect(createError).toBeNull()
      trackTestData('channel', channel.id)

      // Soft delete the channel (set deleted_at) - use rpc or direct approach
      const { error: deleteError } = await supabase
        .from('channels')
        .delete()
        .eq('id', channel.id)

      // Verify delete succeeded
      expect(deleteError).toBeNull()

      // Verify channel is no longer accessible via normal queries
      const { data: accessibleChannels, error: accessError } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channel.id)

      expect(accessError).toBeNull()
      expect(accessibleChannels).toHaveLength(0) // Should be deleted
      
      // Remove from tracking since we manually deleted
      const channelIndex = testDataTracker.channelIds.indexOf(channel.id)
      if (channelIndex > -1) {
        testDataTracker.channelIds.splice(channelIndex, 1)
      }
    })

    it('should prevent regular user from creating channels', async () => {
      // Authenticate as regular user
      const regularUser = await authenticateTestUser('user')
      expect(regularUser.id).toBe(TEST_REGULAR_USER.id)

      // Try to create a channel
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          description: 'Unauthorized channel creation attempt',
          type: 'public',
          organization_id: TEST_ORG_ID,
          created_by: regularUser.id
        })
        .select()
        .single()

      // Should fail due to RLS policy
      expect(error).toBeDefined()
      expect(error?.code).toBe('42501') // PostgreSQL insufficient privilege
      expect(channel).toBeNull()
    })

    it('should prevent unauthenticated users from accessing channels API', async () => {
      // Ensure no user is authenticated
      await signOutTestUser()
      
      // Verify no authentication
      const { data: { user } } = await supabase.auth.getUser()
      expect(user).toBeNull()

      console.log('🔒 Testing unauthenticated access to channels API...')

      // Test 1: Attempt to create channel without authentication
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel + 'unauth-')
      const { data: createData, error: createError } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          description: 'Unauthorized creation attempt',
          type: 'public',
          organization_id: TEST_ORG_ID,
          created_by: TEST_REGULAR_USER.id
        })
        .select()
        .single()

      // Should fail - unauthenticated users cannot create channels
      expect(createError).toBeDefined()
      expect(createData).toBeNull()
      console.log('✅ Channel creation blocked for unauthenticated users')

      // Test 2: Attempt to read channels without authentication
      const { data: readData, error: readError } = await supabase
        .from('channels')
        .select('*')
        .eq('organization_id', TEST_ORG_ID)
        .limit(1)

      // Should fail - unauthenticated users cannot read channels
      expect(readError).toBeDefined()
      expect(readData).toBeNull()
      console.log('✅ Channel reading blocked for unauthenticated users')

      // Test 3: Attempt to update channels without authentication
      // First get any existing channel ID (this will also fail but we need an ID)
      const { data: updateData, error: updateError } = await supabase
        .from('channels')
        .update({ description: 'Unauthorized update attempt' })
        .eq('organization_id', TEST_ORG_ID)
        .select()
        .limit(1)

      // Should fail - unauthenticated users cannot update channels
      expect(updateError).toBeDefined()
      expect(updateData).toBeNull()
      console.log('✅ Channel updates blocked for unauthenticated users')

      // Test 4: Attempt to delete channels without authentication
      const { data: deleteData, error: deleteError } = await supabase
        .from('channels')
        .delete()
        .eq('organization_id', TEST_ORG_ID)
        .select()
        .limit(1)

      // Should fail - unauthenticated users cannot delete channels
      expect(deleteError).toBeDefined()
      expect(deleteData).toBeNull()
      console.log('✅ Channel deletion blocked for unauthenticated users')

      console.log('🛡️ All unauthenticated access attempts properly blocked')
    })
  })

  describe('Channel Membership Operations', () => {
    let testChannel: any

    beforeEach(async () => {
      // Create a test channel for membership tests
      const adminUser = await authenticateTestUser('admin')
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          description: 'Channel for membership testing',
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

    it('should allow admin to add users to channel', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Add regular user to channel
      const { data: membership, error } = await supabase
        .from('channel_memberships')
        .insert({
          channel_id: testChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        })
        .select()
        .single()

      // Verify membership creation
      expect(error).toBeNull()
      expect(membership).toBeDefined()
      expect(membership.channel_id).toBe(testChannel.id)
      expect(membership.user_id).toBe(TEST_REGULAR_USER.id)
      expect(membership.role).toBe('member')
      expect(membership.joined_at).toBeDefined()

      trackTestData('membership', membership.id)
    })

    it('should allow admin to add multiple users to channel', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Add multiple users to channel
      const memberships = [
        {
          channel_id: testChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        },
        {
          channel_id: testChannel.id,
          user_id: TEST_CLIENT_USER.id,
          role: 'member'
        }
      ]

      const { data: createdMemberships, error } = await supabase
        .from('channel_memberships')
        .insert(memberships)
        .select()

      // Verify bulk membership creation
      expect(error).toBeNull()
      expect(createdMemberships).toHaveLength(2)
      
      createdMemberships.forEach(membership => {
        expect(membership.channel_id).toBe(testChannel.id)
        expect([TEST_REGULAR_USER.id, TEST_CLIENT_USER.id]).toContain(membership.user_id)
        trackTestData('membership', membership.id)
      })
    })

    it('should prevent duplicate memberships', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Add user to channel first time
      const membershipData = {
        channel_id: testChannel.id,
        user_id: TEST_REGULAR_USER.id,
        role: 'member'
      }

      const { data: firstMembership, error: firstError } = await supabase
        .from('channel_memberships')
        .insert(membershipData)
        .select()
        .single()

      expect(firstError).toBeNull()
      trackTestData('membership', firstMembership.id)

      // Try to add same user again
      const { data: secondMembership, error: secondError } = await supabase
        .from('channel_memberships')
        .insert(membershipData)
        .select()
        .single()

      // Should fail due to unique constraint
      expect(secondError).toBeDefined()
      expect(secondError?.code).toBe('23505') // PostgreSQL unique violation
      expect(secondMembership).toBeNull()
    })

    it('should allow admin to update user role in channel', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Add user as member first
      const { data: membership, error: createError } = await supabase
        .from('channel_memberships')
        .insert({
          channel_id: testChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        })
        .select()
        .single()

      expect(createError).toBeNull()
      trackTestData('membership', membership.id)

      // Update role to admin
      const { data: updatedMembership, error: updateError } = await supabase
        .from('channel_memberships')
        .update({ role: 'admin' })
        .eq('id', membership.id)
        .select()
        .single()

      // Verify role update
      expect(updateError).toBeNull()
      expect(updatedMembership).toBeDefined()
      expect(updatedMembership.role).toBe('admin')
    })

    it('should allow admin to remove users from channel', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Add user to channel first
      const { data: membership, error: createError } = await supabase
        .from('channel_memberships')
        .insert({
          channel_id: testChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        })
        .select()
        .single()

      expect(createError).toBeNull()
      trackTestData('membership', membership.id)

      // Remove user from channel
      const { error: deleteError } = await supabase
        .from('channel_memberships')
        .delete()
        .eq('id', membership.id)

      // Verify removal
      expect(deleteError).toBeNull()

      // Verify membership no longer exists
      const { data: checkMembership, error: checkError } = await supabase
        .from('channel_memberships')
        .select('*')
        .eq('id', membership.id)
        .single()

      expect(checkError).toBeDefined() // Should not find the record
      expect(checkMembership).toBeNull()
      
      // Remove from tracking since we manually deleted
      const membershipIndex = testDataTracker.membershipIds.indexOf(membership.id)
      if (membershipIndex > -1) {
        testDataTracker.membershipIds.splice(membershipIndex, 1)
      }
    })

    it('should prevent regular user from managing channel memberships', async () => {
      // Authenticate as regular user
      await authenticateTestUser('user')

      // Try to add someone to channel
      const { data: membership, error } = await supabase
        .from('channel_memberships')
        .insert({
          channel_id: testChannel.id,
          user_id: TEST_CLIENT_USER.id,
          role: 'member'
        })
        .select()
        .single()

      // Should fail due to RLS policy
      expect(error).toBeDefined()
      expect(error?.code).toBe('42501') // PostgreSQL insufficient privilege
      expect(membership).toBeNull()
    })
  })

  describe('Channel Access Control', () => {
    let publicChannel: any
    let privateChannel: any

    beforeEach(async () => {
      // Create test channels as admin
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

    it('should allow admin to see all channels in organization', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Query all channels
      const { data: channels, error } = await supabase
        .from('channels')
        .select('*')
        .eq('organization_id', TEST_ORG_ID)
        .in('id', [publicChannel.id, privateChannel.id])

      // Admin should see both channels
      expect(error).toBeNull()
      expect(channels).toHaveLength(2)
      
      const channelTypes = channels.map(c => c.type)
      expect(channelTypes).toContain('public')
      expect(channelTypes).toContain('private')
    })

    it('should prevent regular user from seeing channels they are not members of', async () => {
      // Authenticate as regular user
      await authenticateTestUser('user')

      // Query channels (user is not member of any)
      const { data: channels, error } = await supabase
        .from('channels')
        .select('*')
        .eq('organization_id', TEST_ORG_ID)
        .in('id', [publicChannel.id, privateChannel.id])

      // Regular user should not see any channels they're not members of
      expect(error).toBeNull()
      expect(channels).toHaveLength(0)
    })

    it('should allow regular user to see channels they are members of', async () => {
      // First, authenticate as admin to add user to public channel
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

      // Now authenticate as regular user
      await signOutTestUser()
      await authenticateTestUser('user')

      // Query channels
      const { data: channels, error } = await supabase
        .from('channels')
        .select('*')
        .eq('organization_id', TEST_ORG_ID)
        .in('id', [publicChannel.id, privateChannel.id])

      // User should see only the public channel they're a member of
      expect(error).toBeNull()
      expect(channels).toHaveLength(1)
      expect(channels[0].id).toBe(publicChannel.id)
      expect(channels[0].type).toBe('public')
    })

    it('should prevent access to channels from different organizations', async () => {
      // This test would require a second organization and user
      // For now, we'll test that the organization_id constraint works
      
      // Authenticate as admin
      const adminUser = await authenticateTestUser('admin')

      // Try to create channel with different organization_id (should fail due to auth context)
      const fakeOrgId = '00000000-0000-0000-0000-000000000000'
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: generateTestName(BACKEND_TEST_CONFIG.prefixes.channel),
          description: 'Cross-org channel attempt',
          type: 'public',
          organization_id: fakeOrgId, // Different org
          created_by: adminUser.id
        })
        .select()
        .single()

      // Should fail due to RLS policy checking organization_id
      expect(error).toBeDefined()
      expect(channel).toBeNull()
    })
  })

  describe('Data Integrity and Constraints', () => {
    it('should enforce foreign key constraints', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Try to create channel with non-existent organization_id
      const fakeOrgId = '00000000-0000-0000-0000-000000000000'
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: generateTestName(BACKEND_TEST_CONFIG.prefixes.channel),
          description: 'Invalid org test',
          type: 'public',
          organization_id: fakeOrgId,
          created_by: TEST_ADMIN_USER.id
        })
        .select()
        .single()

      // Should fail due to foreign key constraint or RLS
      expect(error).toBeDefined()
      expect(channel).toBeNull()
    })

    it('should enforce channel type constraints', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Try to create channel with invalid type
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: generateTestName(BACKEND_TEST_CONFIG.prefixes.channel),
          description: 'Invalid type test',
          type: 'invalid_type', // Should only accept 'public' or 'private'
          organization_id: TEST_ORG_ID,
          created_by: TEST_ADMIN_USER.id
        })
        .select()
        .single()

      // Should fail due to check constraint
      expect(error).toBeDefined()
      expect(error?.code).toBe('23514') // PostgreSQL check violation
      expect(channel).toBeNull()
    })

    it('should cascade delete memberships when channel is deleted', async () => {
      // Authenticate as admin
      await authenticateTestUser('admin')

      // Create a test channel
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          description: 'Cascade test channel',
          type: 'public',
          organization_id: TEST_ORG_ID,
          created_by: TEST_ADMIN_USER.id
        })
        .select()
        .single()

      expect(channelError).toBeNull()
      trackTestData('channel', channel.id)

      // Add a membership
      const { data: membership, error: membershipError } = await supabase
        .from('channel_memberships')
        .insert({
          channel_id: channel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        })
        .select()
        .single()

      expect(membershipError).toBeNull()
      trackTestData('membership', membership.id)

      // Delete the channel (hard delete for this test)
      const { error: deleteError } = await supabase
        .from('channels')
        .delete()
        .eq('id', channel.id)

      expect(deleteError).toBeNull()

      // Verify membership was cascade deleted
      const { data: remainingMembership, error: checkError } = await supabase
        .from('channel_memberships')
        .select('*')
        .eq('id', membership.id)
        .single()

      expect(checkError).toBeDefined() // Should not find the record
      expect(remainingMembership).toBeNull()
      
      // Remove from tracking since we manually deleted
      const channelIndex = testDataTracker.channelIds.indexOf(channel.id)
      if (channelIndex > -1) {
        testDataTracker.channelIds.splice(channelIndex, 1)
      }
      const membershipIndex = testDataTracker.membershipIds.indexOf(membership.id)
      if (membershipIndex > -1) {
        testDataTracker.membershipIds.splice(membershipIndex, 1)
      }
    })
  })
})