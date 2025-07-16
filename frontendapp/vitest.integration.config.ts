import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  test: {
    // Integration test specific configuration
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.integration.ts'],
    
    // Only run integration tests
    include: ['src/__tests__/integration/**/*.test.ts'],
    exclude: [
      'src/__tests__/unit/**/*',
      'node_modules/**/*',
      'dist/**/*'
    ],
    
    // Longer timeouts for integration tests
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Run integration tests sequentially to avoid conflicts
    threads: false,
    
    // Verbose output for integration tests
    reporter: ['verbose'],
    
    // Coverage configuration for integration tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/integration',
      include: ['src/services/**/*'],
      exclude: [
        'src/test/**/*',
        'src/__tests__/**/*'
      ]
    }
  }
})