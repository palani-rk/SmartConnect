# Frontend Architecture - Multi-Tenant Collaboration Platform

## Overview

This document outlines the comprehensive frontend architecture for a multi-tenant collaboration platform built with Vite, React 18, and TypeScript, integrating with Supabase backend services.

## Technology Stack

- **Framework**: Vite + React 18 + TypeScript
- **State Management**: Zustand (lightweight, TypeScript-first)
- **Routing**: React Router v6
- **Styling**: Tailwind CSS + Headless UI
- **Real-time**: Supabase Realtime
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library + MSW
- **Authentication**: Supabase Auth
- **File Uploads**: Supabase Storage

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (Button, Input, etc.)
│   ├── layout/          # Layout components (Header, Sidebar, etc.)
│   ├── messaging/       # Message-related components
│   ├── channels/        # Channel management components
│   └── users/           # User management components
├── pages/               # Route components
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Main dashboard
│   ├── admin/          # Admin panels
│   └── god/            # God user interface
├── hooks/              # Custom React hooks
├── stores/             # Zustand stores
├── services/           # API services and utilities
├── types/              # TypeScript type definitions
├── utils/              # Helper functions
├── constants/          # Application constants
└── __tests__/          # Test files
```

## Component Hierarchy

### Core Layout Components

```
App
├── AuthProvider          # Authentication context
├── Router
  ├── PublicRoutes        # Login, register
  ├── ProtectedRoutes     # Main application
    ├── Layout            # Main app shell
      ├── Header          # Navigation, user menu
      ├── Sidebar         # Navigation, channels list
      ├── MainContent     # Route-specific content
      └── RightPanel      # Context-sensitive panels
```

### Role-Based Components

1. **God User Interface**: Organization management, platform oversight
2. **Org Admin Interface**: User/channel management, integrations
3. **Org User Interface**: Messaging, channel participation
4. **Org Client Interface**: Limited messaging capabilities

## State Management Strategy

### Zustand Stores Structure

```typescript
// stores/authStore.ts - Authentication state
interface AuthStore {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  checkRole: () => UserRole
}

// stores/organizationStore.ts - Organization management
interface OrganizationStore {
  currentOrg: Organization | null
  organizations: Organization[]
  setCurrentOrg: (org: Organization) => void
  fetchOrganizations: () => Promise<void>
}

// stores/channelStore.ts - Channel and messaging state
interface ChannelStore {
  channels: Channel[]
  activeChannel: Channel | null
  messages: Record<string, Message[]>
  sendMessage: (channelId: string, content: string, type: MessageType) => Promise<void>
  subscribeToChannel: (channelId: string) => void
}

// stores/userStore.ts - User management
interface UserStore {
  users: User[]
  fetchUsers: () => Promise<void>
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>
}
```

## Routing & Authentication Strategy

### Route Structure

```typescript
// Role-based route protection
/auth/login                    # Public
/auth/register                 # Public (if enabled)

// God User Routes (role: god)
/god/dashboard                 # Organizations overview
/god/organizations             # Manage organizations
/god/analytics                 # Platform analytics

// Org Admin Routes (role: admin)
/admin/dashboard              # Organization overview
/admin/users                  # User management
/admin/channels               # Channel management
/admin/integrations           # WhatsApp/Instagram setup

// Org User Routes (role: user)
/dashboard                    # Main messaging interface
/channels/:channelId          # Channel view
/direct/:userId               # Direct messages
/profile                      # User profile/settings

// Org Client Routes (role: client)
/client/channels/:channelId   # Limited channel access
```

### Authentication Flow

1. **Login**: Supabase Auth with email/password
2. **Role Detection**: Fetch user role from database
3. **Route Protection**: Role-based access control
4. **Organization Context**: Set current organization based on user

## Testing Strategy

### Testing Stack

- **Unit Tests**: Vitest + React Testing Library
- **Integration Tests**: React Testing Library + MSW (Mock Service Worker)
- **E2E Tests**: Playwright (optional, for critical flows)
- **API Mocking**: MSW for Supabase API responses

### Testing Structure

```
src/
├── __tests__/
│   ├── components/      # Component tests
│   ├── hooks/          # Custom hook tests
│   ├── stores/         # Store logic tests
│   ├── services/       # API service tests
│   └── utils/          # Utility function tests
├── __mocks__/          # Mock implementations
│   ├── supabase.ts     # Supabase client mock
│   └── handlers.ts     # MSW request handlers
└── test-utils.tsx      # Testing utilities and providers
```

### Testing Principles

1. **Component Testing**: Test behavior, not implementation
2. **Store Testing**: Test state changes and side effects
3. **Integration Testing**: Test user workflows end-to-end
4. **Real-time Testing**: Mock Supabase subscriptions
5. **Role-based Testing**: Test different user permissions

## Key Component Specifications

### 1. Authentication Components

- **LoginForm**: Email/password login with validation
- **ProtectedRoute**: Role-based route protection
- **AuthProvider**: Global authentication state

### 2. Messaging Components

- **MessageList**: Virtual scrolling for performance
- **MessageInput**: Multi-modal input (text, file, audio)
- **MessageBubble**: Different styles for message types
- **TypingIndicator**: Real-time typing status

### 3. Channel Management

- **ChannelList**: Sidebar navigation with unread counts
- **ChannelHeader**: Channel info and member list
- **ChannelSettings**: Admin-only channel configuration
- **MemberManager**: Add/remove channel members

### 4. User Management (Admin)

- **UserTable**: Sortable, filterable user list
- **UserForm**: Create/edit user with role selection
- **IntegrationSettings**: WhatsApp/Instagram ID management
- **RoleManager**: Permission management interface

### 5. Real-time Features

- **useRealtime**: Custom hook for Supabase subscriptions
- **NotificationSystem**: Toast notifications for events
- **OnlineStatus**: User presence indicators
- **MessageSync**: Optimistic updates with conflict resolution

## Development Workflow

1. **Setup**: Initialize Vite project with TypeScript
2. **Core Setup**: Authentication, routing, state management
3. **UI Foundation**: Design system, base components
4. **Feature Development**: Implement by user role
5. **Testing**: Unit tests alongside feature development
6. **Integration**: Connect with Supabase real-time
7. **Optimization**: Performance tuning, accessibility

## Package Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.50.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "zustand": "^4.4.0",
    "react-hook-form": "^7.43.0",
    "@hookform/resolvers": "^3.0.0",
    "zod": "^3.21.0",
    "@headlessui/react": "^1.7.0",
    "@heroicons/react": "^2.0.0",
    "clsx": "^2.0.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.3.0",
    "typescript": "^5.0.0",
    "vitest": "^0.32.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^5.16.0",
    "msw": "^1.2.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

## User Role Permissions Matrix

| Feature | God User | Org Admin | Org User | Org Client |
|---------|----------|-----------|----------|------------|
| View Organizations | ✅ All | ✅ Own | ❌ | ❌ |
| Manage Organizations | ✅ | ❌ | ❌ | ❌ |
| Manage Users | ✅ All | ✅ Own Org | ❌ | ❌ |
| Manage Channels | ✅ View Only | ✅ Own Org | ❌ | ❌ |
| Send Messages | ❌ | ✅ | ✅ | ✅ Limited |
| View Messages | ❌ | ✅ | ✅ | ✅ Assigned |
| 1:1 Messages | ❌ | ✅ | ✅ | ❌ |
| WhatsApp/Instagram | ❌ | ✅ Config | ✅ Link | ✅ Auto |

## Real-time Architecture

### Supabase Realtime Integration

```typescript
// Real-time subscriptions by feature
const subscriptions = {
  messages: `messages:channel_id=eq.${channelId}`,
  channels: `channels:organization_id=eq.${orgId}`,
  users: `users:organization_id=eq.${orgId}`,
  presence: `presence:channel_id=eq.${channelId}`
}
```

### Event Handling

1. **Message Events**: New messages, edits, deletions
2. **Channel Events**: Channel creation, updates, member changes
3. **User Events**: Status changes, role updates
4. **Presence Events**: Online/offline status, typing indicators

## Security Considerations

1. **Row Level Security**: Enforce tenant isolation at database level
2. **Client-side Validation**: Validate all user inputs with Zod schemas
3. **Role-based Access**: Implement strict permission checks
4. **Token Management**: Secure handling of Supabase session tokens
5. **XSS Prevention**: Sanitize user-generated content
6. **File Upload Security**: Validate file types and sizes

## Performance Optimizations

1. **Virtual Scrolling**: For large message lists
2. **Code Splitting**: Route-based lazy loading
3. **Image Optimization**: Lazy loading and compression
4. **Memoization**: React.memo for expensive components
5. **Bundle Optimization**: Tree shaking and dead code elimination
6. **Caching Strategy**: Intelligent data caching with Zustand

## Accessibility Features

1. **Keyboard Navigation**: Full keyboard support
2. **Screen Reader Support**: Proper ARIA labels
3. **Color Contrast**: WCAG AA compliance
4. **Focus Management**: Logical focus flow
5. **Alternative Text**: Images and media descriptions

This architecture provides a robust, scalable foundation for the multi-tenant collaboration platform while maintaining best practices for React development, testing, and user experience.