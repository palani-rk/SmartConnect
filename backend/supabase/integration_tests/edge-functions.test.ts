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
  generateTestName 
} from './fixtures/testConfig'

describe('Channel Management Edge Functions Integration Tests', () => {
  const EDGE_FUNCTION_BASE_URL = `${BACKEND_TEST_CONFIG.supabase.url}/functions/v1`
  let testChannelIds: string[] = []
  let authToken: string = ''

  beforeEach(async () => {
    // Reset tracking arrays
    testChannelIds = []
    
    // Authenticate as admin for most tests
    const adminUser = await authenticateTestUser('admin')
    const session = await supabase.auth.getSession()
    authToken = session.data.session?.access_token || ''
    
    expect(authToken).toBeTruthy()
  })

  afterEach(async () => {
    await cleanupTestData()
    await signOutTestUser()
    authToken = ''
  })

  describe('Channel CRUD Edge Function', () => {
    it('should create a channel via Edge Function', async () => {
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      const requestBody = {
        name: channelName,
        description: 'Test channel created via Edge Function',
        type: 'public',
        member_ids: [TEST_REGULAR_USER.id]
      }

      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-crud`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.status).toBe(201)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.channel).toBeDefined()
      expect(result.channel.name).toBe(channelName)
      expect(result.channel.type).toBe('public')
      expect(result.channel.organization_id).toBe(TEST_ORG_ID)
      expect(result.channel.member_count).toBeGreaterThanOrEqual(1)

      // Track for cleanup
      if (result.channel?.id) {
        trackTestData('channel', result.channel.id)
      }
    })

    it('should get channels via Edge Function', async () => {
      // First create a test channel
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          description: 'Channel for Edge Function testing',
          type: 'public',
          organization_id: TEST_ORG_ID,
          created_by: TEST_ADMIN_USER.id
        })
        .select()
        .single()

      expect(error).toBeNull()
      trackTestData('channel', channel.id)

      // Test getting channels via Edge Function
      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-crud`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.channels).toBeDefined()
      expect(Array.isArray(result.channels)).toBe(true)
      
      // Should find our test channel
      const foundChannel = result.channels.find((c: any) => c.id === channel.id)
      expect(foundChannel).toBeDefined()
      expect(foundChannel.name).toBe(channelName)
    })

    it('should get specific channel by ID via Edge Function', async () => {
      // Create a test channel
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          description: 'Specific channel test',
          type: 'private',
          organization_id: TEST_ORG_ID,
          created_by: TEST_ADMIN_USER.id
        })
        .select()
        .single()

      expect(error).toBeNull()
      trackTestData('channel', channel.id)

      // Get specific channel
      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-crud?id=${channel.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.channel).toBeDefined()
      expect(result.channel.id).toBe(channel.id)
      expect(result.channel.name).toBe(channelName)
      expect(result.channel.type).toBe('private')
    })

    it('should update channel via Edge Function', async () => {
      // Create a test channel
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          description: 'Original description',
          type: 'public',
          organization_id: TEST_ORG_ID,
          created_by: TEST_ADMIN_USER.id
        })
        .select()
        .single()

      expect(error).toBeNull()
      trackTestData('channel', channel.id)

      // Update channel via Edge Function
      const updateData = {
        id: channel.id,
        name: `${channelName}-updated`,
        description: 'Updated description via Edge Function',
        type: 'private'
      }

      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-crud`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.channel).toBeDefined()
      expect(result.channel.name).toBe(`${channelName}-updated`)
      expect(result.channel.description).toBe('Updated description via Edge Function')
      expect(result.channel.type).toBe('private')
    })

    it('should soft delete channel via Edge Function', async () => {
      // Create a test channel
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          description: 'Channel to be deleted',
          type: 'public',
          organization_id: TEST_ORG_ID,
          created_by: TEST_ADMIN_USER.id
        })
        .select()
        .single()

      expect(error).toBeNull()
      trackTestData('channel', channel.id)

      // Soft delete via Edge Function
      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-crud`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: channel.id,
          hard_delete: false
        })
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.message).toContain('deleted')
      expect(result.channel.deleted_at).toBeDefined()
    })

    it('should prevent unauthorized users from creating channels', async () => {
      // Sign out admin and sign in as regular user
      await signOutTestUser()
      const regularUser = await authenticateTestUser('user')
      const session = await supabase.auth.getSession()
      const regularUserToken = session.data.session?.access_token || ''

      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      const requestBody = {
        name: channelName,
        description: 'Unauthorized creation attempt',
        type: 'public'
      }

      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-crud`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUserToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.status).toBe(403)
      
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient permissions')
    })
  })

  describe('Channel Members Edge Function', () => {
    let testChannel: any

    beforeEach(async () => {
      // Create a test channel for membership tests
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          description: 'Channel for membership testing',
          type: 'public',
          organization_id: TEST_ORG_ID,
          created_by: TEST_ADMIN_USER.id
        })
        .select()
        .single()

      expect(error).toBeNull()
      testChannel = channel
      trackTestData('channel', channel.id)
    })

    it('should add members to channel via Edge Function', async () => {
      const requestBody = {
        channel_id: testChannel.id,
        user_ids: [TEST_REGULAR_USER.id],
        role: 'member'
      }

      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-members?action=add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.status).toBe(201)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.message).toContain('Successfully added')
      expect(result.members).toBeDefined()
      expect(result.members.length).toBe(1)
      expect(result.members[0].user.id).toBe(TEST_REGULAR_USER.id)
      expect(result.members[0].role).toBe('member')

      // Track memberships for cleanup
      result.members.forEach((m: any) => trackTestData('membership', m.id))
    })

    it('should get channel members via Edge Function', async () => {
      // First add a member
      await supabase
        .from('channel_memberships')
        .insert({
          channel_id: testChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        })

      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-members?channel_id=${testChannel.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.members).toBeDefined()
      expect(Array.isArray(result.members)).toBe(true)
      expect(result.members.length).toBeGreaterThanOrEqual(1)
      
      // Should find the added member
      const foundMember = result.members.find((m: any) => m.user.id === TEST_REGULAR_USER.id)
      expect(foundMember).toBeDefined()
      expect(foundMember.role).toBe('member')
    })

    it('should update member role via Edge Function', async () => {
      // First add a member
      const { data: membership } = await supabase
        .from('channel_memberships')
        .insert({
          channel_id: testChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        })
        .select()
        .single()

      trackTestData('membership', membership.id)

      const requestBody = {
        channel_id: testChannel.id,
        user_id: TEST_REGULAR_USER.id,
        role: 'admin'
      }

      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-members?action=update-role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.message).toContain('Successfully updated')
      expect(result.members[0].role).toBe('admin')
    })

    it('should remove members from channel via Edge Function', async () => {
      // First add a member
      const { data: membership } = await supabase
        .from('channel_memberships')
        .insert({
          channel_id: testChannel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        })
        .select()
        .single()

      const requestBody = {
        channel_id: testChannel.id,
        user_ids: [TEST_REGULAR_USER.id]
      }

      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-members?action=remove`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.message).toContain('Successfully removed')
      
      // Verify member was removed
      const { data: remainingMembership } = await supabase
        .from('channel_memberships')
        .select('*')
        .eq('id', membership.id)
        .single()

      expect(remainingMembership).toBeNull()
    })

    it('should prevent unauthorized users from managing members', async () => {
      // Sign out admin and sign in as regular user
      await signOutTestUser()
      await authenticateTestUser('user')
      const session = await supabase.auth.getSession()
      const regularUserToken = session.data.session?.access_token || ''

      const requestBody = {
        channel_id: testChannel.id,
        user_ids: [TEST_REGULAR_USER.id],
        role: 'member'
      }

      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-members?action=add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUserToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      expect(response.status).toBe(403)
      
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient permissions')
    })
  })

  describe('Channel Details Edge Function', () => {
    let testChannel: any

    beforeEach(async () => {
      // Create a test channel with members
      const channelName = generateTestName(BACKEND_TEST_CONFIG.prefixes.channel)
      
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: channelName,
          description: 'Channel for details testing',
          type: 'public',
          organization_id: TEST_ORG_ID,
          created_by: TEST_ADMIN_USER.id
        })
        .select()
        .single()

      expect(error).toBeNull()
      testChannel = channel
      trackTestData('channel', channel.id)

      // Add a member
      const { data: membership } = await supabase
        .from('channel_memberships')
        .insert({
          channel_id: channel.id,
          user_id: TEST_REGULAR_USER.id,
          role: 'member'
        })
        .select()
        .single()

      trackTestData('membership', membership.id)
    })

    it('should get detailed channel information via Edge Function', async () => {
      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-details?id=${testChannel.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.channel).toBeDefined()
      expect(result.channel.id).toBe(testChannel.id)
      expect(result.channel.members).toBeDefined()
      expect(Array.isArray(result.channel.members)).toBe(true)
      expect(result.channel.member_count).toBeGreaterThanOrEqual(1)
      expect(result.channel.can_edit).toBe(true)
      expect(result.channel.can_delete).toBe(true)
      expect(result.channel.creator).toBeDefined()
    })

    it('should include statistics for admin users', async () => {
      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-details?id=${testChannel.id}&include_stats=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.statistics).toBeDefined()
      expect(result.statistics.total_messages).toBeDefined()
      expect(result.statistics.created_days_ago).toBeDefined()
      expect(result.statistics.member_join_rate).toBeDefined()
    })

    it('should prevent unauthorized access to channel details', async () => {
      // Sign out admin and sign in as regular user
      await signOutTestUser()
      await authenticateTestUser('user')
      const session = await supabase.auth.getSession()
      const regularUserToken = session.data.session?.access_token || ''

      // Try to access channel details as non-member
      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-details?id=${testChannel.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUserToken}`
        }
      })

      expect(response.status).toBe(403)
      
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Access denied')
    })
  })

  describe('Edge Function Error Handling', () => {
    it('should handle missing authorization header', async () => {
      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-crud`, {
        method: 'GET'
      })

      expect(response.status).toBe(401)
      
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing authorization header')
    })

    it('should handle invalid channel ID', async () => {
      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-details?id=invalid-uuid`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status).toBe(404)
      
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/channel-crud`, {
        method: 'OPTIONS'
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })
  })
})