# Claude Code Agent Instructions - Multi-Tenant Collaboration Platform

## Project Overview

You are building a multi-tenant collaboration platform similar to Slack using:
- **Frontend**: Vite + React 18 + TypeScript + Material UI (MUI)
- **Backend**: Supabase (Auth, Database, Realtime, Storage)
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Testing**: Vitest + React Testing Library + MSW

## Key Architecture Principles

### 1. Type Safety First
- Use TypeScript strictly with generated Supabase types
- Define all component props, store interfaces, and API responses
- Avoid `any` types - use proper type inference

### 2. Component Organization
```
components/
├── ui/           # Reusable atoms (Button, Input, Modal)
├── layout/       # App structure (Header, Sidebar, Layout)
├── features/     # Feature-specific components
│   ├── messaging/
│   ├── channels/
│   └── users/
└── shared/       # Cross-feature components
```

### 3. State Management Pattern
- Zustand stores for global state (auth, org, channels)
- React Query for server state (optional enhancement)
- Local component state for UI-only concerns
- Optimistic updates for real-time features

### 4. Testing Strategy - Hybrid Approach
- **Unit Tests**: Mock Supabase for fast, isolated component tests
- **Integration Tests**: Use local Supabase instance for critical flows
- **E2E Tests**: Test against local Supabase for full user journeys
- Test user behavior, not implementation details
- Use MSW for external API mocking (WhatsApp/Instagram)

## User Roles & Permissions

1. **God User**: Platform admin - manages organizations
2. **Org Admin**: Organization owner - manages users/channels
3. **Org User**: Regular user - messaging and collaboration
4. **Org Client**: External user via WhatsApp/Instagram

## Implementation Process

### For Each Feature:

#### 1. Specification Phase
```markdown
## Feature: [Feature Name]

### Requirements
- User stories involved
- UI/UX requirements
- Data models affected
- Real-time considerations

### Acceptance Criteria
- [ ] Specific testable criteria
```

#### 2. Pseudocode Phase
```markdown
## Pseudocode: [Feature Name]

### Files Structure
- components/features/[feature]/
- stores/[feature]Store.ts
- hooks/use[Feature].ts
- utils/[feature]Utils.ts

### Data Flow
1. User action triggers
2. Store updates
3. API calls
4. UI updates
5. Real-time sync

### Key Functions
- function1(): Description
- function2(): Description
```

#### 3. Implementation Phase
- **Check existing patterns**: Analyze the codebase for established patterns before implementing
- Start with types/interfaces
- Build UI components with MUI following existing component patterns
- Implement store logic consistent with other stores
- Add Supabase integration
- Write tests
- Handle edge cases

## Security Considerations

1. **Row Level Security (RLS)**: Rely on Supabase RLS for data isolation
2. **Input Validation**: Use Zod schemas for all user inputs
3. **XSS Prevention**: React handles this, but sanitize markdown/HTML
4. **File Uploads**: Validate types and sizes before upload

## Performance Guidelines

1. **Lazy Loading**: Use React.lazy for route-based splitting
2. **Memoization**: Use React.memo and useMemo appropriately
3. **Virtual Scrolling**: Use react-window for message lists with many items
4. **Optimistic Updates**: Update UI before server confirmation
5. **Debouncing**: For search and real-time typing indicators
6. **MUI Performance**: Use `sx` prop sparingly, prefer styled components


## Feature Priority Order

1. **Authentication Flow**: Login, registration, role detection
2. **Organization Context**: Org selection, switching
3. **Channel Management**: List, create, join channels
4. **Messaging Core**: Send/receive messages, real-time sync
5. **User Management**: Admin features for user CRUD
6. **WhatsApp/Instagram**: Integration for client users
7. **Multi-modal Messages**: Audio, image support
8. **Advanced Features**: Search, notifications, presence

## Common Pitfalls to Avoid

1. **Don't bypass RLS**: Always use authenticated Supabase client
2. **Don't store sensitive data**: Keep tokens secure
3. **Don't over-optimize**: Profile first, optimize later
4. **Don't ignore errors**: Handle all error states gracefully
5. **Don't skip tests**: Test as you build

## Helpful Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode

# Local Supabase for testing
supabase start     # Start local instance
supabase stop      # Stop local instance
supabase status    # Check local services
```

## Questions to Ask Before Implementation

1. What are the exact user stories this addresses?
2. How does this interact with real-time features?
3. What are the error states and edge cases?
4. How will this scale with many users/messages?
5. What permissions/RLS rules are needed?

## Remember

- Keep components small and focused
- Write self-documenting code with clear names
- Handle loading and error states
- Make it accessible (MUI components have built-in accessibility)
- Test the happy path and edge cases
- Document complex business logic
- Use MUI's responsive utilities (Grid, useMediaQuery)

This collaboration platform should feel fast, reliable, and intuitive. Focus on core functionality first, then enhance with advanced features. Leverage MUI's pre-built components for consistent, professional UI.