#!/usr/bin/env node

/**
 * Integration test runner script
 * This script provides utilities for running specific test suites
 */

import { execSync } from 'child_process'

const testCommands = {
  // Run all tests
  all: 'vitest run',
  
  // Run only unit tests (exclude integration tests)
  unit: 'vitest run --exclude "**/*.integration.*"',
  
  // Run only integration tests
  integration: 'vitest run "**/*.integration.*"',
  
  // Run tests with UI
  ui: 'vitest --ui',
  
  // Run with coverage
  coverage: 'vitest run --coverage',
  
  // Run specific test file
  file: (filename: string) => `vitest run ${filename}`,
  
  // Watch mode for development
  watch: 'vitest',
  
  // Watch only integration tests
  'watch-integration': 'vitest "**/*.integration.*"',
  
  // Performance tests (if you add them)
  performance: 'vitest run --testTimeout=30000 "**/*.performance.*"',
}

function runCommand(command: string) {
  try {
    console.log(`🚀 Running: ${command}`)
    execSync(command, { stdio: 'inherit' })
    console.log('✅ Tests completed successfully')
  } catch (error) {
    console.error('❌ Tests failed')
    process.exit(1)
  }
}

function showHelp() {
  console.log(`
📋 Test Runner Commands:

🧪 Basic Commands:
  npm run test              - Run all tests
  npm run test:unit         - Run only unit tests
  npm run test:integration  - Run only integration tests
  npm run test:watch        - Watch mode for all tests
  npm run test:coverage     - Run with coverage report

🎯 Specific Commands:
  npm run test:ui           - Run with Vitest UI
  npm run test:orgs         - Run organization tests only
  
🔧 Development:
  npm run test:watch-integration - Watch integration tests only
  
📊 Reports:
  npm run test:coverage     - Generate coverage report
  
Examples:
  npm run test:integration  # Run all integration tests
  npm run test:orgs        # Run organization-specific tests
  npm run test:coverage    # Get coverage report
  `)
}

// Parse command line arguments
const args = process.argv.slice(2)
const command = args[0]

switch (command) {
  case 'all':
    runCommand(testCommands.all)
    break
  case 'unit':
    runCommand(testCommands.unit)
    break
  case 'integration':
    runCommand(testCommands.integration)
    break
  case 'ui':
    runCommand(testCommands.ui)
    break
  case 'coverage':
    runCommand(testCommands.coverage)
    break
  case 'watch':
    runCommand(testCommands.watch)
    break
  case 'watch-integration':
    runCommand(testCommands['watch-integration'])
    break
  case 'organizations':
  case 'orgs':
    runCommand(testCommands.file('**/OrganizationsPage.integration.*'))
    break
  case 'file':
    if (args[1]) {
      runCommand(testCommands.file(args[1]))
    } else {
      console.error('❌ Please specify a file name')
      process.exit(1)
    }
    break
  case 'help':
  case '--help':
  case '-h':
    showHelp()
    break
  default:
    if (!command) {
      showHelp()
    } else {
      console.error(`❌ Unknown command: ${command}`)
      showHelp()
      process.exit(1)
    }
}