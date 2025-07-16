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
frontendapp/src/components/
├── components/     # Feature-specific components
│   ├── messaging/
│   ├── channels/
│   └── users/
│   └── layout/   # App structure (Header, Sidebar, Layout)
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

## Before Starting Implementation

### Code Pattern Analysis
Before implementing any feature, analyze the existing codebase to understand:

1. **Component Patterns**: How are components structured and styled?
2. **State Management**: How are Zustand stores organized and used?
3. **API Integration**: How is Supabase integrated in existing features?
4. **Error Handling**: What error patterns are already established?
5. **Type Definitions**: How are TypeScript types organized?
6. **File Structure**: What naming conventions and folder structures exist?
7. **Testing Patterns**: How are existing tests written?

Use the command: `find . -name "*.tsx" -o -name "*.ts" | head -20 | xargs cat` to examine existing code patterns and maintain consistency throughout the codebase.

## MUI Theming & Styling

### Theme Configuration
```typescript
// src/theme/theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
});
```

### App Setup with MUI
```typescript
// src/main.tsx
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';

<ThemeProvider theme={theme}>
  <CssBaseline />
  <App />
</ThemeProvider>
```

### Common MUI Components to Use
- **Layout**: Box, Container, Grid, Stack
- **Navigation**: AppBar, Drawer, Tabs, BottomNavigation
- **Data Display**: List, Table, Typography, Avatar, Badge, Chip
- **Inputs**: TextField, Select, Checkbox, Radio, Switch, Slider
- **Feedback**: Alert, Snackbar, Dialog, Backdrop, CircularProgress
- **Surfaces**: Card, Paper, Accordion

## Real-time Subscriptions
```typescript
useEffect(() => {
  const subscription = supabase
    .channel('custom-channel')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'messages' },
      (payload) => {
        // Handle real-time updates
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [dependencies]);
```

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

## Testing Environment Setup

### Local Supabase Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase locally
supabase init

# Start local Supabase
supabase start

# Run migrations
supabase db push

# Setup test environment variables
cp .env.example .env.test.local
```

### Test Configuration
```typescript
// vite.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Use different environments for different test types
    env: {
      VITE_TEST_ENV: process.env.TEST_TYPE || 'unit'
    }
  }
});

// src/test/setup.ts
import { beforeAll, afterAll } from 'vitest';

if (process.env.VITE_TEST_ENV === 'integration') {
  beforeAll(async () => {
    // Setup local Supabase test database
  });

  afterAll(async () => {
    // Cleanup test data
  });
}
```

### Test Scripts
```json
{
  "scripts": {
    "test:unit": "TEST_TYPE=unit vitest",
    "test:integration": "TEST_TYPE=integration vitest",
    "test:e2e": "playwright test",
    "test:all": "npm run test:unit && npm run test:integration"
  }
}
```

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

# Install MUI
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material  # For icons

# Supabase
npx supabase gen types typescript --project-id [id] > src/types/supabase.ts

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