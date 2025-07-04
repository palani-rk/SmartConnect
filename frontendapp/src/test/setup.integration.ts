import { beforeAll, beforeEach } from 'vitest'
import { supabase } from '@/services/supabase'
import { INTEGRATION_TEST_CONFIG, validateTestConfig } from './fixtures/integrationTestConfig'

// Authentication helpers for integration tests
export const authenticateTestUser = async (userType: 'admin' | 'regularUser' | 'clientUser' = 'admin') => {
  try {
    const userConfig = INTEGRATION_TEST_CONFIG.users[userType]
    console.log(`🔐 Authenticating test user: ${userConfig.email}`)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userConfig.email,
      password: userConfig.password
    })
    
    if (error) {
      throw new Error(`Failed to authenticate test user: ${error.message}`)
    }
    
    if (!data.user) {
      throw new Error('No user data returned from authentication')
    }
    
    console.log(`✅ Test user authenticated: ${data.user.id}`)
    return data.user
  } catch (error) {
    console.error('❌ Test user authentication failed:', error)
    throw error
  }
}

// Sign out helper for tests
export const signOutTestUser = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('❌ Error signing out test user:', error)
    } else {
      console.log('🔓 Test user signed out')
    }
  } catch (error) {
    console.error('❌ Error during sign out:', error)
  }
}

// Global setup for integration tests
beforeAll(async () => {
  console.log('🧪 Setting up integration tests...')
  
  // Validate test configuration
  try {
    await validateTestConfig()
  } catch (error) {
    console.error('❌ Integration test configuration error:', error)
    throw error
  }

  // Verify Supabase connection
  try {
    const { data, error } = await supabase.from('organizations').select('count').limit(1)
    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`)
    }
    console.log('✅ Supabase connection verified')
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    throw error
  }

  // Verify test organization exists
  try {
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', INTEGRATION_TEST_CONFIG.organization.id)
      .single()

    if (error || !org) {
      throw new Error(`Test organization ${INTEGRATION_TEST_CONFIG.organization.id} not found`)
    }

    console.log(`✅ Test organization verified: ${org.name} (${org.id})`)
  } catch (error) {
    console.error('❌ Test organization verification failed:', error)
    throw error
  }

  // Verify test users exist
  try {
    const userIds = [
      INTEGRATION_TEST_CONFIG.users.admin.id,
      INTEGRATION_TEST_CONFIG.users.regularUser.id,
      INTEGRATION_TEST_CONFIG.users.clientUser.id
    ]

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role')
      .in('id', userIds)

    if (error) {
      throw new Error(`Failed to verify test users: ${error.message}`)
    }

    if (!users || users.length !== userIds.length) {
      const foundIds = users?.map(u => u.id) || []
      const missingIds = userIds.filter(id => !foundIds.includes(id))
      throw new Error(`Test users not found: ${missingIds.join(', ')}`)
    }

    console.log(`✅ Test users verified: ${users.length} users found`)
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role}): ${user.id}`)
    })
  } catch (error) {
    console.error('❌ Test users verification failed:', error)
    throw error
  }

  console.log('🎉 Integration test setup complete!')
})

// Helper function to clean up test data
export const cleanupTestData = async (tableName: string, ids: string[]) => {
  if (ids.length === 0) return

  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .in('id', ids)

    if (error) {
      console.error(`Failed to cleanup ${tableName}:`, error)
    } else {
      console.log(`✅ Cleaned up ${ids.length} ${tableName} records`)
    }
  } catch (error) {
    console.error(`Error during ${tableName} cleanup:`, error)
  }
}