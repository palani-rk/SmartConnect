# User Form Components - Modularization

## Overview

This directory contains modular user form components that can be reused across different parts of the application.

## Components

### 1. UserFormFields
**Location**: `./UserFormFields.tsx`

A highly reusable component that renders user form fields with customizable options.

#### Features:
- ✅ **Email field** with validation
- ✅ **Role selection** (can be hidden/customized)
- ✅ **Password configuration** with auto-generate option
- ✅ **Integration fields** (WhatsApp, Instagram)
- ✅ **Notification settings**
- ✅ **Nested form support** with field prefixes
- ✅ **Mode-aware rendering** (create vs edit)

#### Props:
```typescript
interface UserFormFieldsProps {
  control: Control<any>              // React Hook Form control
  errors: FieldErrors<any>           // Form validation errors
  isSubmitting?: boolean             // Loading state
  showPasswordFields?: boolean       // Show/hide password section
  showRoleField?: boolean           // Show/hide role selection
  showNotificationFields?: boolean   // Show/hide notification settings
  availableRoles?: Array<{value: string; label: string}> // Custom role options
  fieldPrefix?: string              // For nested forms (e.g., "admin")
  autoFocus?: boolean              // Auto-focus first field
  mode?: 'create' | 'edit'         // Form mode
}
```

#### Usage Examples:

**Standalone User Creation:**
```tsx
<UserFormFields
  control={control}
  errors={errors}
  isSubmitting={isSubmitting}
  mode="create"
  autoFocus
/>
```

**Nested in Organization Form:**
```tsx
<UserFormFields
  control={control}
  errors={errors}
  isSubmitting={isSubmitting}
  showRoleField={false}           // Admin role is fixed
  fieldPrefix="admin"             // Fields: admin.email, admin.password, etc.
  mode="create"
/>
```

**User Edit Form:**
```tsx
<UserFormFields
  control={control}
  errors={errors}
  isSubmitting={isSubmitting}
  showPasswordFields={false}      // No password change in edit mode
  mode="edit"
/>
```

### 2. UserForm
**Location**: `./UserForm.tsx`

A complete modal dialog for user creation/editing that uses UserFormFields internally.

#### Features:
- ✅ Modal dialog with form
- ✅ Create and edit modes
- ✅ Auto-password generation option
- ✅ Form validation with Zod schemas
- ✅ Error handling and display
- ✅ Integration with user service

### 3. UserManagementTable
**Location**: `./UserManagementTable.tsx`

Table component for displaying and managing users with CRUD operations.

## Form Data Structure

### User Creation Form
```typescript
interface UserCreateForm {
  email: string
  role: 'god' | 'admin' | 'user' | 'client'
  password?: string                    // Optional - used when auto_generate_password is false
  auto_generate_password: boolean      // Default: true
  whatsapp_id?: string
  instagram_id?: string
  send_welcome_email: boolean          // Default: true
}
```

### Organization with Admin Form
```typescript
interface OrganizationWithAdminForm {
  organizationName: string
  admin: {
    email: string
    password?: string
    auto_generate_password: boolean
    whatsapp_id?: string
    instagram_id?: string
    send_welcome_email: boolean
  }
}
```

## Reusability Benefits

### 1. **Consistent UI/UX**
- All user forms have the same look and feel
- Consistent validation messages and field layouts
- Unified password generation behavior

### 2. **Maintainability**
- Single source of truth for user form logic
- Changes to user fields only need to be made once
- Centralized validation rules

### 3. **Flexibility**
- Can be embedded in different contexts (modals, pages, nested forms)
- Configurable field visibility
- Support for nested data structures

### 4. **Type Safety**
- Full TypeScript support with proper type inference
- Zod schema validation ensures data integrity
- Compile-time checks for form field names

## Integration Points

### Used In:
1. **UserForm** - Standalone user creation/editing
2. **OrganizationWithAdminForm** - Embedded admin user creation
3. **OrganizationDetailPage** - User management interface

### Backend Integration:
- Uses `UserService.createUser()` with `CreateUserRequest` interface
- Supports both manual password and auto-generation
- Handles welcome email notifications

## Testing

Tests are located in `src/__tests__/components/UserFormFields.test.tsx` and cover:
- Field rendering based on props
- Mode-specific behavior (create vs edit)
- Nested form functionality with prefixes
- Integration field rendering

## Future Enhancements

Potential improvements to consider:
- **Field-level customization**: Allow specific fields to be overridden
- **Validation customization**: Custom validation rules per use case
- **Field groups**: Logical grouping of fields with collapsible sections
- **Progressive disclosure**: Show advanced fields only when needed
- **Accessibility improvements**: Enhanced screen reader support