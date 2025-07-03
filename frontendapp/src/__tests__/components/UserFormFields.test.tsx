import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { UserFormFields } from '@/components/users/UserFormFields'
import { renderWithProviders } from '@/test/helpers/test-utils'

// Mock auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { role: 'admin' }
  })
}))

// Test wrapper component that provides form context
const TestWrapper = ({ children, ...props }: any) => {
  const { control, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      role: 'user',
      password: '',
      auto_generate_password: true,
      whatsapp_id: '',
      instagram_id: '',
      send_welcome_email: true
    }
  })

  return (
    <form>
      <UserFormFields 
        control={control} 
        errors={errors} 
        {...props}
      />
    </form>
  )
}

describe('UserFormFields', () => {
  it('should render email field', () => {
    renderWithProviders(<TestWrapper />)
    
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
  })

  it('should render role field when showRoleField is true', () => {
    renderWithProviders(<TestWrapper showRoleField={true} />)
    
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
  })

  it('should not render role field when showRoleField is false', () => {
    renderWithProviders(<TestWrapper showRoleField={false} />)
    
    expect(screen.queryByLabelText(/role/i)).not.toBeInTheDocument()
  })

  it('should render password fields in create mode', () => {
    renderWithProviders(<TestWrapper mode="create" showPasswordFields={true} />)
    
    expect(screen.getByText(/password configuration/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/generate secure password automatically/i)).toBeInTheDocument()
  })

  it('should not render password fields in edit mode', () => {
    renderWithProviders(<TestWrapper mode="edit" showPasswordFields={true} />)
    
    expect(screen.queryByText(/password configuration/i)).not.toBeInTheDocument()
  })

  it('should render integration fields', () => {
    renderWithProviders(<TestWrapper />)
    
    expect(screen.getByLabelText(/whatsapp id/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/instagram handle/i)).toBeInTheDocument()
  })

  it('should render notification settings in create mode', () => {
    renderWithProviders(<TestWrapper mode="create" showNotificationFields={true} />)
    
    expect(screen.getByText(/notification settings/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/send welcome email to user/i)).toBeInTheDocument()
  })

  it('should handle nested field names with prefix', () => {
    renderWithProviders(<TestWrapper fieldPrefix="admin" />)
    
    // The fields should still be rendered, just with different names internally
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
  })
})