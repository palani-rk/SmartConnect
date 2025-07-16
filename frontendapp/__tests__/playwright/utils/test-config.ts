/**
 * Frontend E2E Test Configuration
 * 
 * This file contains test data IDs and configuration for frontend e2e tests.
 */

export const E2E_TEST_CONFIG = {
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
    url: 'https://axmikjtbiddtmdepaqhr.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4bWlranRiaWRkdG1kZXBhcWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTkyMDI5MDEsImV4cCI6MjAzNDc3ODkwMX0.l4wNVhK0WrX3wNr6vdHZbdOWFnz4aNhNQYOdj5ZojTU'
  }
} as const

// Export commonly used IDs for convenience
export const TEST_ORG_ID = E2E_TEST_CONFIG.organization.id
export const TEST_ADMIN_USER = E2E_TEST_CONFIG.users.admin
export const TEST_REGULAR_USER = E2E_TEST_CONFIG.users.user
export const TEST_CLIENT_USER = E2E_TEST_CONFIG.users.client