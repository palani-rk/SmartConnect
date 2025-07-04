/**
 * Integration Test Configuration
 * 
 * This file contains test data IDs for integration tests that run against
 * the real Supabase database. Update these IDs with your actual test data.
 */

export const INTEGRATION_TEST_CONFIG = {
  // Test Organization - NutriPal
  organization: {
    id: 'd5b7b961-9005-4443-8680-4b16f7181a51',
    name: 'Integration_Testing' // Expected organization name for validation
  },

  // Test Users in the NutriPal organization
  // TODO: Move credentials to secure environment variables for better security
  users: {
    admin: {
      id: 'c03d7d23-341d-45de-bda7-9bd3744adb51',
      role: 'admin',
      email: 'purajan.rk@gmail.com',
      password: 'Citrix123#'
    },
    regularUser: {
      id: 'ce4d28ab-59cf-4e6e-bf2e-516245daf01a', 
      role: 'user',
      email: 'testuser@test.com',
      password: 'Citrix123#'
    },
    clientUser: {
      id: '69f07116-fd93-4f63-b866-42368fad7f84',
      role: 'client', 
      email: 'testclient@test.com',
      password: 'Citrix123#'
    }
  },

  // Test timeouts and delays
  timeouts: {
    defaultTest: 10000, // 10 seconds for most tests
    slowTest: 30000,    // 30 seconds for complex operations
    cleanup: 5000       // 5 seconds for cleanup operations
  },

  // Test data prefixes to avoid conflicts
  prefixes: {
    channel: 'test-channel-',
    user: 'test-user-',
    organization: 'test-org-'
  }
} as const

// Helper function to validate test configuration
export const validateTestConfig = async () => {
  const errors: string[] = []
  
  // Check if IDs are still placeholder values
  if (INTEGRATION_TEST_CONFIG.organization.id.includes('REPLACE_WITH')) {
    errors.push('Organization ID not configured')
  }
  
  if (INTEGRATION_TEST_CONFIG.users.admin.id.includes('REPLACE_WITH')) {
    errors.push('Admin user ID not configured')
  }
  
  if (INTEGRATION_TEST_CONFIG.users.regularUser.id.includes('REPLACE_WITH')) {
    errors.push('Regular user ID not configured')
  }
  
  if (INTEGRATION_TEST_CONFIG.users.clientUser.id.includes('REPLACE_WITH')) {
    errors.push('Client user ID not configured')
  }
  
  if (errors.length > 0) {
    throw new Error(`Integration test configuration incomplete:\n${errors.join('\n')}`)
  }
}

// Export commonly used IDs for convenience
export const TEST_ORG_ID = INTEGRATION_TEST_CONFIG.organization.id
export const TEST_ADMIN_USER_ID = INTEGRATION_TEST_CONFIG.users.admin.id
export const TEST_USER_ID = INTEGRATION_TEST_CONFIG.users.regularUser.id
export const TEST_CLIENT_USER_ID = INTEGRATION_TEST_CONFIG.users.clientUser.id