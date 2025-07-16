import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Simple test configuration without complex setup
    environment: 'node',
    
    // Only run simple tests
    include: ['supabase/integration_tests/connection.test.ts', 'supabase/integration_tests/migration.test.ts', 'supabase/integration_tests/create-missing-table.test.ts'],
    exclude: [
      'node_modules/**/*',
      'supabase/functions/**/*',
      'supabase/integration_tests/channels.test.ts'
    ],
    
    // Longer timeouts for integration tests
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Verbose output for integration tests
    reporter: ['verbose'],
    
    // Global variables for testing
    globals: true
  }
})