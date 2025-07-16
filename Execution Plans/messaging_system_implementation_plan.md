# Messaging System Implementation Plan - Phase 1

## Overview
This document outlines the comprehensive implementation plan for Phase 1 of the messaging system (GitHub Issue #9), which establishes the basic messaging foundation for real-time text communication within organization channels.

## Analysis Summary

### Core Requirements
- **Real-time text messaging** within organization channels
- **Message history** with infinite scroll pagination (50 messages per batch)
- **Message persistence** across sessions
- **Performance targets**: < 100ms delivery latency, > 99.5% connection stability
- **Virtual scrolling** for large message lists
- **Optimistic UI updates** for immediate feedback

### Architecture Decisions

#### Backend Architecture
- **New Messages Table**: Create complete messages table with full schema from specification
- **Supabase REST API**: Use native REST capabilities for CRUD operations
- **Real-time Subscriptions**: Implement Supabase Realtime for live message broadcasting
- **RLS Policies**: Channel-based access control following existing patterns
- **Database Functions**: Create pagination and query optimization functions

#### Frontend Architecture
- **Feature-based Structure**: Follow `features/channel_mgmt/` pattern
- **Zustand State Management**: Implement `messageStore.ts` similar to `channelStore.ts`
- **Material-UI Components**: Maintain UI consistency with existing patterns
- **Virtual Scrolling**: Use react-window for performance with large message lists
- **Optimistic Updates**: Immediate UI feedback before server confirmation

### Database Schema Creation

```sql
-- Migration: create_messages_table.sql
-- Create messages table with complete schema
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'file')),
  metadata JSONB DEFAULT '{}',
  thread_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_messages_channel_id_created_at ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_messages_channel_active ON messages(channel_id, created_at DESC) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view messages in their organization channels" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM channel_memberships cm
      JOIN channels c ON c.id = cm.channel_id
      WHERE cm.channel_id = messages.channel_id
      AND cm.user_id = auth.uid()
      AND c.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert messages in their organization channels" ON messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM channel_memberships cm
      JOIN channels c ON c.id = cm.channel_id
      WHERE cm.channel_id = messages.channel_id
      AND cm.user_id = auth.uid()
      AND c.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM channel_memberships cm
      JOIN channels c ON c.id = cm.channel_id
      WHERE cm.channel_id = messages.channel_id
      AND cm.user_id = auth.uid()
      AND c.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can soft delete their own messages" ON messages
  FOR UPDATE USING (
    user_id = auth.uid() AND
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM channel_memberships cm
      JOIN channels c ON c.id = cm.channel_id
      WHERE cm.channel_id = messages.channel_id
      AND cm.user_id = auth.uid()
      AND c.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();
```

### Frontend Feature Structure

```
frontendapp/src/features/messaging/
├── components/
│   ├── MessageList.tsx          # Virtual scrolling message list
│   ├── MessageItem.tsx          # Individual message display
│   ├── MessageInput.tsx         # Message composition input
│   ├── MessageStatus.tsx        # Delivery status indicators
│   └── index.ts                 # Component exports
├── hooks/
│   ├── useMessageList.ts        # Message loading and pagination
│   ├── useRealTimeMessages.ts   # Real-time subscriptions
│   └── index.ts                 # Hook exports
├── services/
│   ├── messageService.ts        # Message API operations
│   └── index.ts                 # Service exports
├── stores/
│   ├── messageStore.ts          # Zustand message store
│   └── index.ts                 # Store exports
├── types/
│   ├── message.ts               # Message type definitions
│   └── index.ts                 # Type exports
├── utils/
│   ├── messageUtils.ts          # Message formatting utilities
│   └── index.ts                 # Utility exports
└── index.ts                     # Main feature export
```

### TypeScript Types

```typescript
// Enhanced message types
interface MessageWithDetails extends Tables<'messages'> {
  author: {
    id: string;
    email: string;
    role: string;
  };
  channel: {
    id: string;
    name: string;
  };
  status: 'sending' | 'sent' | 'delivered' | 'failed';
  isOptimistic?: boolean;
}

// Message store interface
interface MessageState {
  messages: MessageWithDetails[];
  selectedChannel: string | null;
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  
  // Actions
  loadMessages: (channelId: string, cursor?: string) => Promise<void>;
  sendMessage: (channelId: string, content: string) => Promise<void>;
  subscribeToChannel: (channelId: string) => () => void;
  setSelectedChannel: (channelId: string | null) => void;
  clearMessages: () => void;
}
```

## Implementation Tasks

### Phase 1: Database Foundation (3-4 days)
- **GitHub Issue #10**: Database Foundation: Messages Table Creation and RLS
  - Create complete messages table with full schema
  - Implement comprehensive message RLS policies
  - Create message pagination database functions
  - Set up Realtime subscriptions for messages
  - Update Supabase types generation

### Phase 2: Backend API (4-5 days)
- **GitHub Issue #11**: Backend API: Message Service Layer and Integration
  - Create message service layer with CRUD operations
  - Implement message pagination logic
  - Add real-time message broadcasting
  - Create integration tests for message API
  - Performance test message loading and pagination

### Phase 3: Frontend Core (5-6 days)
- **GitHub Issue #12**: Frontend Core: Message Components and State Management
  - Create messaging feature folder structure
  - Implement message types and interfaces
  - Create message store with Zustand
  - Build MessageList component with virtual scrolling
  - Implement MessageInput component with optimistic updates
  - Create MessageItem display component
  - Add real-time message synchronization
  - Implement infinite scroll pagination
  - Add message loading and error states
  - Create messaging page integration

### Phase 4: Testing & Quality (3-4 days)
- **GitHub Issue #13**: Testing & Quality Assurance: Comprehensive Test Suite
  - Write unit tests for message components
  - Create integration tests for message flow
  - Add E2E tests for messaging scenarios
  - Performance testing for large message lists
  - Error handling and edge case testing

## Success Metrics

### Performance Targets
- **Message delivery latency**: < 100ms
- **Real-time connection stability**: > 99.5%
- **Message load time**: < 500ms
- **Infinite scroll performance**: Smooth with 1000+ messages

### Quality Targets
- **Test coverage**: > 80% for message components
- **Error handling**: Graceful degradation for network failures
- **User experience**: Immediate feedback with optimistic updates

## Risk Mitigation

### Technical Risks
- **Database migration conflicts**: Coordinate with existing schema changes
- **Real-time performance**: Implement connection pooling and message batching
- **State management complexity**: Use established Zustand patterns

### Integration Risks
- **Channel management dependencies**: Ensure proper integration with existing system
- **Authentication compatibility**: Maintain RLS policy consistency
- **UI consistency**: Follow existing Material-UI patterns

## Dependencies

### Internal Dependencies
- Existing channel management system
- User authentication system
- Supabase project configuration

### External Dependencies
- Supabase platform availability
- Real-time infrastructure reliability
- Browser WebSocket support

## Acceptance Criteria

### Functional Requirements
- [x] Users can send/receive real-time text messages
- [x] Messages load with infinite scroll (50 messages per batch)
- [x] Message history persists across sessions
- [x] Messages display with sender info and timestamps

### Performance Requirements
- [x] Message delivery latency < 100ms
- [x] Real-time connection stability > 99.5%
- [x] Message load time < 500ms
- [x] Smooth infinite scroll performance

### Technical Requirements
- [ ] Complete messages table schema implemented
- [ ] Supabase Realtime subscriptions configured
- [ ] Optimistic UI updates working
- [ ] Message queuing for reliability
- [ ] Virtual scrolling for large message lists

## Next Steps

1. **Start with Database Foundation (#10)**: Foundation for all other work
2. **Parallel Backend API Development (#11)**: Can begin after database schema is complete
3. **Frontend Implementation (#12)**: Depends on backend API availability
4. **Comprehensive Testing (#13)**: Final validation of all components

## Future Considerations

### Phase 2 Enhancements
- Multi-modal message support (images, files, audio)
- Message reactions and emoji responses
- Message editing and deletion with history
- User mentions and notifications

### Phase 3 Advanced Features
- Message threading and replies
- Message search functionality
- Typing indicators and presence
- Message pinning and channel management

This implementation plan provides a solid foundation for the messaging system while maintaining consistency with existing codebase patterns and ensuring high quality through comprehensive testing.