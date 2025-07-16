import { beforeAll, beforeEach, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { BACKEND_TEST_CONFIG, validateBackendTestConfig, TEST_ORG_ID } from './fixtures/testConfig'

// Global Supabase client for tests
export let supabase: SupabaseClient

// Track created test data for cleanup
export const testDataTracker = {
  channelIds: [] as string[],
  membershipIds: [] as string[]
}

// Cache for current authenticated user to avoid rate limiting
let currentAuthenticatedUser: { userType: string; user: any } | null = null

// Authentication helpers for backend integration tests
export const authenticateTestUser = async (userType: 'admin' | 'user' | 'client' = 'admin') => {
  try {
    // Check if we already have the right user authenticated
    if (currentAuthenticatedUser?.userType === userType) {
      console.log(`🔄 Using cached authentication for: ${userType}`)
      return currentAuthenticatedUser.user
    }

    const userConfig = BACKEND_TEST_CONFIG.users[userType]
    console.log(`🔐 Authenticating backend test user: ${userConfig.email}`)
    
    // Add a small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userConfig.email,
      password: userConfig.password
    })
    
    if (error) {
      throw new Error(`Failed to authenticate backend test user: ${error.message}`)
    }
    
    if (!data.user) {
      throw new Error('No user data returned from authentication')
    }
    
    console.log(`✅ Backend test user authenticated: ${data.user.id}`)
    console.log(`   Role: ${data.user.user_metadata?.role}`)
    console.log(`   Org: ${data.user.user_metadata?.organization_id}`)
    
    // Cache the authenticated user
    currentAuthenticatedUser = { userType, user: data.user }
    
    return data.user
  } catch (error) {
    console.error('❌ Backend test user authentication failed:', error)
    throw error
  }
}

// Sign out helper for tests
export const signOutTestUser = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('❌ Error signing out backend test user:', error)
    } else {
      console.log('🔓 Backend test user signed out')
    }
    // Clear the cached user
    currentAuthenticatedUser = null
  } catch (error) {
    console.error('❌ Error during backend sign out:', error)
  }
}

// Helper to track test data for cleanup
export const trackTestData = (type: 'channel' | 'membership', id: string) => {
  if (type === 'channel') {
    testDataTracker.channelIds.push(id)
  } else if (type === 'membership') {
    testDataTracker.membershipIds.push(id)
  }
}

// Helper function to clean up test data
export const cleanupTestData = async () => {
  console.log('🧹 Starting backend test data cleanup...')
  
  try {
    // Clean up channel memberships first (due to foreign key constraints)
    if (testDataTracker.membershipIds.length > 0) {
      console.log(`🧹 Cleaning up ${testDataTracker.membershipIds.length} channel memberships...`)
      const { error: membershipError } = await supabase
        .from('channel_memberships')
        .delete()
        .in('id', testDataTracker.membershipIds)

      if (membershipError) {
        console.error('❌ Failed to cleanup channel memberships:', membershipError)
        // Don't throw error, continue with channel cleanup
      } else {
        console.log(`✅ Cleaned up ${testDataTracker.membershipIds.length} channel memberships`)
      }
    }

    // Clean up channels
    if (testDataTracker.channelIds.length > 0) {
      console.log(`🧹 Cleaning up ${testDataTracker.channelIds.length} channels...`)
      const { error: channelError } = await supabase
        .from('channels')
        .delete()
        .in('id', testDataTracker.channelIds)

      if (channelError) {
        console.error('❌ Failed to cleanup channels:', channelError)
        // Don't throw error, continue with cleanup
      } else {
        console.log(`✅ Cleaned up ${testDataTracker.channelIds.length} channels`)
      }
    }

    // Additional cleanup: Remove any orphaned test data based on naming convention
    try {
      const { data: orphanedChannels, error: orphanError } = await supabase
        .from('channels')
        .select('id')
        .like('name', `%${BACKEND_TEST_CONFIG.prefixes.channel}%`)
        .eq('organization_id', TEST_ORG_ID)

      if (!orphanError && orphanedChannels && orphanedChannels.length > 0) {
        console.log(`🧹 Found ${orphanedChannels.length} orphaned test channels, cleaning up...`)
        const { error: orphanCleanupError } = await supabase
          .from('channels')
          .delete()
          .in('id', orphanedChannels.map(c => c.id))
        
        if (orphanCleanupError) {
          console.error('❌ Failed to cleanup orphaned channels:', orphanCleanupError)
        } else {
          console.log(`✅ Cleaned up ${orphanedChannels.length} orphaned test channels`)
        }
      }
    } catch (error) {
      console.error('❌ Error during orphaned data cleanup:', error)
    }

    // Reset trackers
    testDataTracker.channelIds = []
    testDataTracker.membershipIds = []
    
    console.log('✅ Backend test data cleanup completed')
  } catch (error) {
    console.error('❌ Error during backend test data cleanup:', error)
  }
}

// Global setup for backend integration tests
beforeAll(async () => {
  console.log('🧪 Setting up backend integration tests...')
  
  // Validate test configuration first
  try {
    validateBackendTestConfig()
    console.log('✅ Backend test configuration validated')
  } catch (error) {
    console.error('❌ Backend test configuration error:', error)
    throw error
  }

  // Initialize Supabase client
  try {
    supabase = createClient(
      BACKEND_TEST_CONFIG.supabase.url,
      BACKEND_TEST_CONFIG.supabase.anonKey
    )
    console.log('✅ Supabase client initialized')
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error)
    throw error
  }

  // Verify Supabase connection by testing a simple query
  try {
    const { data, error } = await supabase.from('organizations').select('count').limit(1)
    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`)
    }
    console.log('✅ Supabase database connection verified')
  } catch (error) {
    console.error('❌ Supabase database connection failed:', error)
    throw error
  }

  // Verify test organization exists
  try {
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', TEST_ORG_ID)
      .single()

    if (error || !org) {
      throw new Error(`Test organization ${TEST_ORG_ID} not found`)
    }

    console.log(`✅ Test organization verified: ${org.name} (${org.id})`)
  } catch (error) {
    console.error('❌ Test organization verification failed:', error)
    throw error
  }

  // Verify test users exist
  try {
    const userIds = [
      BACKEND_TEST_CONFIG.users.admin.id,
      BACKEND_TEST_CONFIG.users.user.id,
      BACKEND_TEST_CONFIG.users.client.id
    ]

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role')
      .in('id', userIds)

    if (error) {
      throw new Error(`Failed to verify backend test users: ${error.message}`)
    }

    if (!users || users.length !== userIds.length) {
      const foundIds = users?.map(u => u.id) || []
      const missingIds = userIds.filter(id => !foundIds.includes(id))
      throw new Error(`Backend test users not found: ${missingIds.join(', ')}`)
    }

    console.log(`✅ Backend test users verified: ${users.length} users found`)
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role}): ${user.id}`)
    })
  } catch (error) {
    console.error('❌ Backend test users verification failed:', error)
    throw error
  }

  // Verify channels table exists and is accessible
  try {
    const { data, error } = await supabase
      .from('channels')
      .select('count')
      .limit(1)

    if (error) {
      console.warn(`⚠️  Channels table check failed: ${error.message}`)
      console.log('   This is expected if the migration hasn\'t been applied yet')
    } else {
      console.log('✅ Channels table verified and accessible')
    }
  } catch (error) {
    console.warn('⚠️  Channels table verification failed - this may be expected if migration is pending')
  }

  console.log('🎉 Backend integration test setup complete!')
}, BACKEND_TEST_CONFIG.timeouts.slowTest)

// Clean up after each test to prevent data contamination
beforeEach(async () => {
  // Reset test data trackers
  testDataTracker.channelIds = []
  testDataTracker.membershipIds = []
})

// Global cleanup after all tests
afterAll(async () => {
  console.log('🧹 Running final backend test cleanup...')
  
  try {
    // Authenticate as admin to ensure we have permissions for cleanup
    await authenticateTestUser('admin')
    await cleanupTestData()
    await signOutTestUser()
  } catch (error) {
    console.error('❌ Error during final backend cleanup:', error)
  }
  
  console.log('👋 Backend integration tests completed!')
})