# SmartConnect Multi-Tenant Collaboration Platform - Frontend

## Project Overview
A Slack-like multi-tenant collaboration platform built with React, TypeScript, and Supabase. Supports real-time messaging, user management, and integrations with WhatsApp and Instagram.

## Tech Stack
- **Framework**: Vite + React 18 + TypeScript
- **State Management**: Zustand (with devtools middleware)
- **Routing**: React Router v6
- **UI Library**: Material-UI (MUI)
- **Forms**: React Hook Form + Zod validation
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Storage)
- **Testing**: Vitest + React Testing Library + MSW
- **Build**: TypeScript + Vite

## Architecture Patterns

### State Management (Zustand)
```typescript
// Pattern: create store with devtools, clear action naming
export const useExampleStore = create<ExampleState>()(
  devtools(
    (set, get) => ({
      // State
      items: [],
      isLoading: false,
      error: null,
      
      // Sync actions
      setError: (error) => set({ error }, false, 'setError'),
      clearError: () => set({ error: null }, false, 'clearError'),
      
      // Async actions with proper error handling
      fetchItems: async () => {
        set({ isLoading: true, error: null }, false, 'fetchItems:start')
        try {
          const items = await ExampleService.getItems()
          set({ items, isLoading: false }, false, 'fetchItems:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch'
          set({ error: errorMessage, isLoading: false }, false, 'fetchItems:error')
          throw error
        }
      }
    }),
    { name: 'example-store' }
  )
)
```

### Service Layer Pattern
```typescript
// Pattern: Static class methods, consistent error handling
export class ExampleService {
  static async getItems(params = {}): Promise<ItemsResponse> {
    try {
      const { data, error, count } = await supabase
        .from('table')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return { items: data || [], total: count || 0 }
    } catch (error) {
      console.error('Error fetching items:', error)
      throw error
    }
  }
}
```

### Form Pattern (React Hook Form + Zod)
```typescript
// 1. Define Zod schema in types file
export const itemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email')
})

// 2. Component with form
const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '', email: '' }
})

// 3. Controller for each field
<Controller
  name="fieldName"
  control={control}
  render={({ field }) => (
    <TextField
      {...field}
      error={Boolean(errors.fieldName)}
      helperText={errors.fieldName?.message}
    />
  )}
/>
```

## Database Schema (Supabase)

### Core Tables
```sql
-- Organizations (tenant isolation)
organizations {
  id: uuid (pk)
  name: string
  created_at: timestamp
}

-- Users (role-based access)
users {
  id: uuid (pk, references auth.users)
  email: string
  organization_id: uuid (fk -> organizations.id)
  role: enum('god', 'admin', 'user', 'client')
  whatsapp_id: string (optional)
  instagram_id: string (optional)
  created_at: timestamp
}

-- Channels (organization-scoped)
channels {
  id: uuid (pk)
  organization_id: uuid (fk -> organizations.id)
  name: string
  type: string
  is_private: boolean
  created_at: timestamp
}

-- Messages (channel-scoped)
messages {
  id: uuid (pk)
  channel_id: uuid (fk -> channels.id)
  user_id: uuid (fk -> users.id)
  content: string
  type: string
  created_at: timestamp
}

-- Channel Members (many-to-many)
channel_members {
  channel_id: uuid (fk -> channels.id)
  user_id: uuid (fk -> users.id)
}
```

## Role-Based Access Control

### User Roles Hierarchy
```typescript
export const USER_ROLES = {
  GOD: 'god',     // Platform admin - all organizations
  ADMIN: 'admin', // Organization admin - own org only
  USER: 'user',   // Regular user - assigned channels
  CLIENT: 'client' // External user - limited access
} as const
```

### Permission Patterns
```typescript
// Use authStore for permission checks
const { user, canAccess } = useAuthStore()

// Route-level protection
<ProtectedRoute requiredRoles={[USER_ROLES.GOD, USER_ROLES.ADMIN]}>
  <ComponentName />
</ProtectedRoute>

// Component-level checks
const canManageUsers = canAccess(['god', 'admin'])
const canEditUser = (targetUser) => {
  if (user.role === 'god') return true
  if (user.role === 'admin') return targetUser.role !== 'god'
  return false
}
```

## File Structure Convention

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base components (Button, Modal, etc.)
│   ├── layout/          # Layout components (Header, Sidebar)
│   ├── organizations/   # Feature-specific components
│   ├── users/          # Feature-specific components
│   └── index.ts        # Export files for each directory
├── pages/              # Route-level components
│   ├── auth/          # Authentication pages
│   ├── organizations/ # Organization management
│   └── dashboard/     # Main dashboard
├── hooks/             # Custom React hooks
├── stores/            # Zustand stores (one per domain)
├── services/          # API service classes
├── types/             # TypeScript types + Zod schemas
├── utils/             # Helper functions
├── constants/         # App constants
└── __tests__/         # Test files (mirror src structure)
```

## Component Patterns

### Page Component Structure
```typescript
const ExamplePage = () => {
  // 1. Hooks and auth
  const { user } = useAuthStore()
  const { items, fetchItems } = useExampleStore()
  
  // 2. Local UI state
  const [selectedItem, setSelectedItem] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // 3. Permission checks
  const canEdit = user?.role === 'admin'
  
  // 4. Event handlers
  const handleCreate = () => setIsModalOpen(true)
  
  // 5. Effects
  useEffect(() => {
    fetchItems()
  }, [])
  
  // 6. Render
  return (
    <Container>
      {/* Content */}
    </Container>
  )
}
```

### Modal Component Pattern
```typescript
interface ModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
  item?: Item | null
  isSubmitting?: boolean
  error?: string | null
}

const Modal = ({ open, onClose, onSubmit, item, isSubmitting, error }) => {
  const isEditing = Boolean(item)
  
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        {isEditing ? 'Edit Item' : 'Create Item'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && <Alert severity="error">{error}</Alert>}
          {/* Form fields */}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
```

## Testing Patterns

### Component Testing
```typescript
// Use render helper with providers
import { renderWithProviders } from '@/test/helpers/test-utils'

describe('Component', () => {
  it('should render correctly', () => {
    renderWithProviders(<Component />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Store Testing
```typescript
// Test store actions and state changes
describe('useExampleStore', () => {
  beforeEach(() => {
    useExampleStore.setState({ items: [], isLoading: false, error: null })
  })

  it('should fetch items successfully', async () => {
    const { fetchItems } = useExampleStore.getState()
    await fetchItems()
    
    expect(useExampleStore.getState().items).toHaveLength(2)
    expect(useExampleStore.getState().isLoading).toBe(false)
  })
})
```

## Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm run preview         # Preview build

# Testing
npm run test            # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
npm run test:coverage   # With coverage report
npm run test:ui         # Vitest UI

# Code Quality
npm run lint            # ESLint check
```

## Environment Variables

```bash
# .env.local
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Key Implementation Notes

### Routing Strategy
- Use lazy loading for all page components
- Implement nested routes with protected route wrappers
- Role-based route protection at route level

### State Management Philosophy
- Global state: Data that needs to be shared across components (Zustand)
- Local state: UI-specific state like modals, forms (useState)
- Server state: API calls and caching handled by stores

### Error Handling
- Service layer: Log and re-throw errors
- Store layer: Set error state, display to user
- Component layer: Show error messages, retry mechanisms

### Performance Considerations
- Lazy load page components
- Optimize table components for large datasets
- Use optimistic updates for better UX
- Implement proper loading states

### Security
- All data access scoped by organization_id
- Row Level Security (RLS) enforced at database level
- Role checks on both frontend and backend
- No sensitive data in client-side state

## Recent Implementations

### User Management Feature (Latest)
- Organization detail page with user management
- Role-based user CRUD operations
- Inline role editing with permission checks
- Search and filter capabilities
- Modal forms with validation

### Components Added
- `UserManagementTable` - Full-featured user table
- `UserForm` - Modal form for user creation/editing
- `OrganizationDetailPage` - Main detail page with user management
- Enhanced routing with organization detail routes

This documentation should be updated as new features are implemented to maintain consistency and help future development.