/**
 * Backend Integration Test Configuration
 * 
 * This file contains test data IDs and configuration for backend integration tests
 * that run directly against the Supabase database APIs.
 */
import 'dotenv/config'

export const BACKEND_TEST_CONFIG = {
  // Test Organization - Integration Testing
  organization: {
    id: 'd5b7b961-9005-4443-8680-4b16f7181a51',
    name: 'Integration_Testing'
  },

  // Test Users in the Integration Testing organization
  users: {
    admin: {
      id: 'c03d7d23-341d-45de-bda7-9bd3744adb51',
      role: 'admin',
      email: 'purajan.rk@gmail.com',
      password: 'Citrix123#'
    },
    user: {
      id: 'ce4d28ab-59cf-4e6e-bf2e-516245daf01a', 
      role: 'user',
      email: 'testuser@test.com',
      password: 'Citrix123#'
    },
    client: {
      id: '69f07116-fd93-4f63-b866-42368fad7f84',
      role: 'client', 
      email: 'testclient@test.com',
      password: 'Citrix123#'
    }
  },

  // Test timeouts and delays
  timeouts: {
    defaultTest: 15000, // 15 seconds for most tests
    slowTest: 30000,    // 30 seconds for complex operations
    cleanup: 10000      // 10 seconds for cleanup operations
  },

  // Test data prefixes to avoid conflicts with production data
  prefixes: {
    channel: 'test-ch-',
    membership: 'test-mem-',
    message: 'test-msg-'
  },

  // Supabase connection config
  supabase: {
    url: process.env.SUPABASE_URL || 'https://axmikjtbiddtmdepaqhr.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4bWlranRiaWRkdG1kZXBhcWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTkyMDI5MDEsImV4cCI6MjAzNDc3ODkwMX0.l4wNVhK0WrX3wNr6vdHZbdOWFnz4aNhNQYOdj5ZojTU'
  }
} as const

// Helper function to validate test configuration
export const validateBackendTestConfig = () => {
  const errors: string[] = []
  
  // Check if required environment variables are set or defaults are valid
  if (!BACKEND_TEST_CONFIG.supabase.url || BACKEND_TEST_CONFIG.supabase.url.includes('your-project')) {
    errors.push('SUPABASE_URL not properly configured')
  }
  
  if (!BACKEND_TEST_CONFIG.supabase.anonKey || BACKEND_TEST_CONFIG.supabase.anonKey.includes('your-anon-key')) {
    errors.push('SUPABASE_ANON_KEY not properly configured')
  }
  
  // Check if test data IDs look valid (basic UUID format check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  
  if (!uuidRegex.test(BACKEND_TEST_CONFIG.organization.id)) {
    errors.push('Organization ID is not a valid UUID')
  }
  
  Object.entries(BACKEND_TEST_CONFIG.users).forEach(([role, user]) => {
    if (!uuidRegex.test(user.id)) {
      errors.push(`${role} user ID is not a valid UUID`)
    }
    if (!user.email.includes('@')) {
      errors.push(`${role} user email is not valid`)
    }
  })
  
  if (errors.length > 0) {
    throw new Error(`Backend test configuration validation failed:\n${errors.join('\n')}`)
  }
}

// Export commonly used IDs for convenience
export const TEST_ORG_ID = BACKEND_TEST_CONFIG.organization.id
export const TEST_ADMIN_USER = BACKEND_TEST_CONFIG.users.admin
export const TEST_REGULAR_USER = BACKEND_TEST_CONFIG.users.user
export const TEST_CLIENT_USER = BACKEND_TEST_CONFIG.users.client

// Generate unique test names with timestamp to avoid conflicts
export const generateTestName = (prefix: string): string => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}${timestamp}-${random}`
}

// Test data cleanup helper
export const generateTestIds = (): { channelIds: string[], membershipIds: string[] } => {
  return {
    channelIds: [],
    membershipIds: []
  }
}