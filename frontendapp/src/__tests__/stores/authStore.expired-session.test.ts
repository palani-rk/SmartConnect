import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'

// Mock Supabase
const mockSignOut = vi.fn()
const mockGetSession = vi.fn()

vi.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signOut: () => mockSignOut(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    }
  }
}))

describe('AuthStore - Expired Session Handling', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({ 
      user: null, 
      session: null, 
      isAuthenticated: false, 
      isLoading: false,
      initialized: false
    })
    
    // Reset mocks
    vi.clearAllMocks()
  })

  it('should handle session_not_found error during initialization', async () => {
    // Mock session error
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Session from session_id claim in JWT does not exist', code: 'session_not_found' }
    })

    const { initialize } = useAuthStore.getState()
    await initialize()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.session).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.initialized).toBe(true)
  })

  it('should handle expired JWT error during signOut', async () => {
    // Set initial authenticated state
    useAuthStore.setState({
      user: { id: '123', email: 'test@example.com', role: 'user', organization_id: '456' },
      session: { user: { id: '123' } } as any,
      isAuthenticated: true,
      isLoading: false,
      initialized: true
    })

    // Mock signOut error for expired session
    mockSignOut.mockResolvedValueOnce({
      error: { message: 'Session from session_id claim in JWT does not exist', code: 'session_not_found' }
    })

    const { signOut } = useAuthStore.getState()
    await signOut()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.session).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('should clear expired session manually', () => {
    // Set initial authenticated state
    useAuthStore.setState({
      user: { id: '123', email: 'test@example.com', role: 'user', organization_id: '456' },
      session: { user: { id: '123' } } as any,
      isAuthenticated: true,
      isLoading: false,
      initialized: true
    })

    const { clearExpiredSession } = useAuthStore.getState()
    clearExpiredSession()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.session).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('should handle JWT expired error during signOut', async () => {
    // Set initial authenticated state
    useAuthStore.setState({
      user: { id: '123', email: 'test@example.com', role: 'user', organization_id: '456' },
      session: { user: { id: '123' } } as any,
      isAuthenticated: true,
      isLoading: false,
      initialized: true
    })

    // Mock signOut error for JWT expired
    mockSignOut.mockResolvedValueOnce({
      error: { message: 'JWT expired', code: 'token_expired' }
    })

    const { signOut } = useAuthStore.getState()
    await signOut()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.session).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })
})