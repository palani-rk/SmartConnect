import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Integration test specific configuration
    environment: 'node',
    setupFiles: ['./supabase/integration_tests/setup.ts'],
    
    // Only run integration tests
    include: ['supabase/integration_tests/**/*.test.ts'],
    exclude: [
      'node_modules/**/*',
      'supabase/functions/**/*'
    ],
    
    // Longer timeouts for integration tests
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Run integration tests sequentially to avoid conflicts
    threads: false,
    
    // Verbose output for integration tests
    reporter: ['verbose'],
    
    // Global variables for testing
    globals: true,
    
    // Coverage configuration for integration tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/integration',
      include: ['supabase/integration_tests/**/*'],
      exclude: [
        'supabase/integration_tests/setup.ts',
        'supabase/integration_tests/fixtures/**/*'
      ]
    }
  }
})