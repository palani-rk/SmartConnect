# End-to-End Integration Tests

This directory is reserved for complex user journey tests that span multiple components, services, and user interactions.

## What Goes Here

- **Full user workflows**: Complete user journeys from login to task completion
- **Cross-feature integration**: Tests that involve multiple features working together
- **Real browser scenarios**: Tests that require full browser simulation

## Examples of E2E Tests

1. **Channel Management Workflow**:
   - Admin creates organization
   - Admin creates channels
   - Admin assigns users to channels
   - Users send messages in channels
   - Admin manages permissions

2. **User Onboarding Flow**:
   - User registration
   - Email verification
   - Organization joining
   - First channel interaction

3. **Multi-Modal Messaging**:
   - Send text message
   - Upload and send image
   - Send audio message
   - WhatsApp integration flow

## Test Structure

```typescript
describe('Channel Management E2E Flow', () => {
  it('should complete full admin channel management workflow', async () => {
    // 1. Admin login
    // 2. Navigate to channels
    // 3. Create new channel
    // 4. Add users to channel
    // 5. Verify channel appears in user's channel list
    // 6. Send test message
    // 7. Verify message delivery
  })
})
```

## Running E2E Tests

```bash
# Run all E2E integration tests
npm run test:integration

# Run specific E2E test file
npm run test:integration -- channel-workflow.e2e.test.ts
```

## Notes

- E2E tests are typically slower than unit/integration tests
- Use real data from test organization
- Clean up test data after each test
- Consider using Playwright for browser-based E2E tests if needed