# E2E Testing Plan for Messaging Feature using Playwright MCP

## File Structure
```
frontendapp/__tests__/playwright/
├── utils/                                   # Common utilities for all features
│   ├── auth-helpers.ts                     # Authentication utilities
│   ├── supabase-test-helpers.ts            # Supabase test utilities
│   ├── multi-user-helpers.ts               # Multi-user test scenarios
│   └── test-data-cleanup.ts                # Test data cleanup utilities
├── messaging/
│   ├── messages_test_plan.md               # This document
│   ├── specs/
│   │   ├── messages-page.spec.ts           # Main MessagesPage functionality
│   │   ├── message-actions.spec.ts         # Message CRUD operations
│   │   ├── real-time-messaging.spec.ts     # Multi-user real-time tests
│   │   ├── error-handling.spec.ts          # Error states and recovery
│   │   └── channel-management.spec.ts      # Channel selection and switching
│   ├── page-objects/
│   │   ├── MessagesPage.ts                 # Page object for MessagesPage
│   │   ├── MessageList.ts                  # Page object for MessageList component
│   │   └── MessageInput.ts                 # Page object for MessageInput component
│   └── utils/
│       └── messaging-data-generators.ts    # Messaging-specific mock data
└── config/
    └── playwright.config.ts                # Main Playwright configuration
```

## Component Analysis Summary

### MessagesPage (/frontendapp/src/pages/messages/MessagesPage.tsx)
- **Key Features**: Channel list, message interface, authentication checks
- **Test Elements**: Channel selection, message display, loading states
- **States**: Authenticated/unauthenticated, loading channels, channel selection
- **Error Handling**: No user, no organization, channel loading errors

### MessageList Component
- **Key Features**: Virtual scrolling, real-time updates, message actions
- **Test Elements**: Message display, scroll behavior, connection status
- **States**: Loading, empty, error, connection status indicators
- **Actions**: Load more, retry failed messages, scroll to bottom

### MessageInput Component  
- **Key Features**: Message composition, reply functionality, validation
- **Test Elements**: Text input, send button, character counter, reply indicator
- **States**: Loading, disabled, character limit warnings
- **Validation**: 2000 character limit, empty message prevention

### MessageItem Component
- **Key Features**: Message display, context menu, status indicators
- **Test Elements**: Message content, actions menu, status icons
- **States**: Sending, sent, failed, pinned, edited
- **Actions**: Reply, edit, delete, pin, retry

## Test Implementation Plan

### 1. Common Utilities (`frontendapp/__tests__/playwright/utils/`)

#### auth-helpers.ts
- User authentication flows
- Organization setup
- User role management
- Session management

#### supabase-test-helpers.ts
- Database connection setup
- Test data seeding
- Database cleanup
- Migration management

#### multi-user-helpers.ts
- Multi-browser context management
- User synchronization
- Real-time testing utilities
- Connection management

#### test-data-cleanup.ts
- Post-test cleanup procedures
- Database reset utilities
- File cleanup
- Session cleanup

### 2. Messaging-Specific Utilities

#### messaging-data-generators.ts
- Generate test channels
- Generate test messages
- Generate test users
- Generate message threads

### 3. Page Object Models

#### MessagesPage.ts
```typescript
class MessagesPage {
  // Channel management
  async selectChannel(channelName: string)
  async getChannelList()
  async waitForChannelsToLoad()
  
  // Message interface
  async getMessageContainer()
  async waitForMessagesToLoad()
  async getSelectedChannelInfo()
  
  // Navigation and authentication
  async isAuthenticated()
  async hasOrganization()
  async getAuthenticationError()
}
```

#### MessageList.ts
```typescript
class MessageList {
  // Message display
  async getMessages()
  async getMessageByContent(content: string)
  async scrollToBottom()
  async loadMoreMessages()
  
  // Real-time features
  async waitForNewMessage()
  async getConnectionStatus()
  async waitForConnectionStatus(status: string)
  
  // Message actions
  async retryFailedMessage(messageId: string)
  async openMessageActions(messageId: string)
}
```

#### MessageInput.ts
```typescript
class MessageInput {
  // Message composition
  async typeMessage(content: string)
  async sendMessage(content: string)
  async clearMessage()
  
  // Reply functionality
  async replyToMessage(messageId: string, content: string)
  async cancelReply()
  
  // Validation
  async getCharacterCount()
  async isOverCharacterLimit()
  async isSendDisabled()
}
```

## Test Scenarios

### 1. Authentication and Navigation Tests (`messages-page.spec.ts`)

#### Test Cases:
- **Login Flow**: User authentication and redirect to messages
- **Unauthorized Access**: Handle unauthenticated users
- **No Organization**: Handle users without organization
- **Page Loading**: Verify page loads correctly with proper elements
- **Navigation**: Test navigation to/from messages page

#### Success Criteria:
- Unauthenticated users see login prompt
- Users without organization see appropriate error
- Authenticated users can access messages page
- Page loads within 3 seconds

### 2. Channel Management Tests (`channel-management.spec.ts`)

#### Test Cases:
- **Channel List Loading**: Verify channels load correctly
- **Channel Selection**: Test selecting different channels
- **Channel Switching**: Test switching between channels
- **Empty Channels**: Handle channels with no messages
- **Channel Loading States**: Test loading indicators
- **Channel Errors**: Handle channel loading failures

#### Success Criteria:
- Channels load within 5 seconds
- Selected channel is visually highlighted
- Channel switching clears previous messages
- Loading states are shown appropriately

### 3. Message CRUD Operations (`message-actions.spec.ts`)

#### Test Cases:
- **Send Message**: Test sending new messages
- **Edit Message**: Test editing existing messages
- **Delete Message**: Test deleting messages
- **Message Validation**: Test character limits and validation
- **Message Status**: Test sending/sent/failed states
- **Optimistic Updates**: Test immediate UI updates

#### Success Criteria:
- Messages send within 2 seconds
- Character limit enforced at 2000 characters
- Edit/delete only available for own messages
- Status indicators show correctly
- Optimistic updates provide immediate feedback

### 4. Real-time Messaging Tests (`real-time-messaging.spec.ts`)

#### Test Cases:
- **Multi-user Messaging**: Test messages between multiple users
- **Real-time Updates**: Test live message synchronization
- **Connection Status**: Test WebSocket connection indicators
- **Message Deduplication**: Test duplicate message handling
- **Auto-scroll**: Test auto-scroll on new messages
- **Connection Recovery**: Test reconnection after disconnect

#### Success Criteria:
- Messages appear in other users' view within 1 second
- Connection status accurately reflects WebSocket state
- No duplicate messages appear
- Auto-scroll works for new messages
- Connection recovery works after network issues

### 5. Error Handling Tests (`error-handling.spec.ts`)

#### Test Cases:
- **Network Failures**: Test offline/online scenarios
- **Message Send Failures**: Test retry mechanisms
- **Connection Timeouts**: Test timeout handling
- **Invalid Input**: Test validation error handling
- **Server Errors**: Test server error responses
- **Rate Limiting**: Test rate limit handling

#### Success Criteria:
- Failed messages show retry options
- Network errors display appropriate messages
- Invalid input is rejected with clear feedback
- Connection timeouts trigger reconnection
- Error messages are user-friendly

### 6. Performance and UX Tests

#### Test Cases:
- **Large Message Lists**: Test virtual scrolling performance
- **Infinite Scroll**: Test pagination loading
- **Message Search**: Test search functionality
- **Typing Indicators**: Test real-time typing status
- **Message Threading**: Test reply functionality
- **Message Pinning**: Test pin/unpin functionality

#### Success Criteria:
- Virtual scrolling handles 1000+ messages smoothly
- Pagination loads within 2 seconds
- Search returns results within 1 second
- Typing indicators appear within 500ms
- Reply threading works correctly

## Test Data Requirements

### Test Users:
- User A: Organization member with full permissions
- User B: Organization member with limited permissions
- User C: User without organization
- User D: Unauthenticated user

### Test Channels:
- Channel 1: Public channel with existing messages
- Channel 2: Private channel with limited access
- Channel 3: Empty channel
- Channel 4: Channel with many messages (pagination testing)

### Test Messages:
- Standard text messages
- Long messages (character limit testing)
- Messages with special characters
- Reply messages
- Pinned messages
- Failed messages (for retry testing)

## Playwright MCP Implementation

### Browser Setup:
- Use Chromium for main tests
- Use Firefox for compatibility testing
- Use WebKit for Safari testing
- Enable video recording for failed tests

### Test Configuration:
- Parallel execution for independent tests
- Sequential execution for multi-user tests
- Timeout: 30 seconds for individual tests
- Retries: 2 attempts for flaky tests

### Reporting:
- HTML report with screenshots
- JUnit XML for CI integration
- Video recordings for failed tests
- Performance metrics collection

## Multi-user Testing Strategy

### Approach:
1. **Parallel Browser Contexts**: Use separate browser contexts for each user
2. **Synchronized Actions**: Coordinate actions between users using custom synchronization helpers
3. **Real-time Verification**: Verify real-time updates across all user contexts
4. **Data Isolation**: Ensure test data doesn't interfere between users

### Example Multi-user Test:
```typescript
test('Real-time messaging between users', async ({ browser }) => {
  const userA = await createUserContext(browser, 'user-a');
  const userB = await createUserContext(browser, 'user-b');
  
  await userA.selectChannel('test-channel');
  await userB.selectChannel('test-channel');
  
  await userA.sendMessage('Hello from User A');
  await userB.waitForNewMessage('Hello from User A');
  
  await userB.sendMessage('Hello from User B');
  await userA.waitForNewMessage('Hello from User B');
});
```

## CI/CD Integration

### GitHub Actions:
- Run tests on pull requests
- Run tests on main branch pushes
- Store test artifacts (videos, screenshots)
- Notify on test failures

### Test Environment:
- Use Supabase test project
- Reset database before each test run
- Manage test user accounts
- Monitor test performance

## Monitoring and Maintenance

### Test Health:
- Monitor test execution times
- Track flaky test rates
- Update tests for UI changes
- Maintain test data integrity

### Performance Metrics:
- Page load times
- Message send/receive latency
- Connection establishment time
- Virtual scrolling performance

This comprehensive plan provides the foundation for implementing robust e2e tests for the messaging feature using Playwright MCP, covering all critical functionality, edge cases, and performance considerations.