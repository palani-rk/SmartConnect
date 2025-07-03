# Test Structure Documentation

This directory contains all tests for the frontend application, organized by test type and purpose.

## Directory Structure

```
src/__tests__/
├── unit/                    # Fast unit tests with mocks
│   ├── components/         # Component unit tests
│   ├── services/          # Service layer unit tests (mocked)
│   ├── stores/            # Store unit tests
│   └── types/             # Type validation tests
├── integration/            # Integration tests with real APIs
│   ├── services/          # Service layer integration tests
│   ├── stores/            # Store integration with real Supabase
│   └── e2e/               # End-to-end user workflow tests
└── README.md              # This file
```

## Test Types

### Unit Tests (`src/__tests__/unit/`)
- **Purpose**: Fast, isolated tests with mocked dependencies
- **Run with**: `npm run test:unit`
- **Use cases**: Component logic, utility functions, type validation
- **Dependencies**: Mocked Supabase, MSW for API mocking

### Integration Tests (`src/__tests__/integration/`)
- **Purpose**: Test real interactions with Supabase database
- **Run with**: `npm run test:integration`
- **Use cases**: Service layer functionality, database operations
- **Dependencies**: Real Supabase connection, test organization data

### E2E Tests (`src/__tests__/integration/e2e/`)
- **Purpose**: Complete user workflows and feature interactions
- **Run with**: `npm run test:integration` (includes E2E)
- **Use cases**: Multi-step user journeys, cross-feature integration

## Configuration Files

- `vitest.config.ts` - Unit test configuration
- `vitest.integration.config.ts` - Integration test configuration
- `src/test/setup.ts` - Unit test setup (MSW, mocks)
- `src/test/setup.integration.ts` - Integration test setup (real Supabase)

## Test Data

- `src/test/mocks/` - Mock data for unit tests
- `src/test/fixtures/` - Real test data configuration for integration tests
- `src/test/helpers/` - Test utilities and helper functions

## Running Tests

```bash
# Run all unit tests (fast)
npm run test:unit

# Run all integration tests (slower, requires Supabase)
npm run test:integration

# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
npm run test:watch-integration
```

## Integration Test Setup

Before running integration tests, you must configure your test data:

1. **Update test configuration**: Edit `src/test/fixtures/integrationTestConfig.ts`
2. **Set organization ID**: Replace `REPLACE_WITH_NUTRIPAL_ORG_ID` with your test org ID
3. **Set user IDs**: Replace user ID placeholders with real test user IDs
4. **Verify setup**: Integration tests will validate configuration on startup

### Finding Test IDs

Run this query in your Supabase SQL editor:

```sql
SELECT 
  o.id as org_id, 
  o.name as org_name,
  u.id as user_id,
  u.name as user_name,
  u.email as user_email,
  u.role as user_role
FROM organizations o
JOIN users u ON u.organization_id = o.id
WHERE o.name ILIKE '%nutripal%'
ORDER BY o.name, u.role;
```

## Writing Tests

### Unit Test Example
```typescript
// src/__tests__/unit/services/channelService.test.ts
import { vi } from 'vitest'
import { ChannelService } from '@/services/channelService'

vi.mock('@/services/supabase') // Mock Supabase

describe('ChannelService', () => {
  it('should create channel', async () => {
    // Test with mocked dependencies
  })
})
```

### Integration Test Example
```typescript
// src/__tests__/integration/services/channelService.integration.test.ts
import { ChannelService } from '@/services/channelService'
import { TEST_ORG_ID } from '@/test/fixtures/integrationTestConfig'

describe('ChannelService Integration', () => {
  it('should create channel in real database', async () => {
    const channel = await ChannelService.createChannel({
      name: 'test-channel',
      organization_id: TEST_ORG_ID,
      // ... real data
    })
    
    expect(channel.id).toBeDefined()
    // Cleanup: delete channel
  })
})
```

## Best Practices

1. **Unit tests**: Mock external dependencies, focus on logic
2. **Integration tests**: Use real APIs, test actual functionality
3. **Clean up**: Always clean up test data in integration tests
4. **Isolation**: Each test should be independent
5. **Descriptive names**: Test names should describe the behavior being tested
6. **Fast feedback**: Unit tests should run quickly for development

## Troubleshooting

### Integration Test Failures
- Check Supabase connection
- Verify test organization and users exist
- Ensure proper cleanup of test data
- Check RLS policies allow test operations

### Unit Test Failures
- Verify mocks are properly configured
- Check MSW handlers for API mocking
- Ensure test setup files are loaded correctly