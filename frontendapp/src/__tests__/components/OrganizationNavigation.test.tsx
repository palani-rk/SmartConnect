import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { USER_ROLES } from '@/constants'

// Mock the useAuth hook
const mockUseAuth = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}))

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Organization Navigation & Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow God users to access organizations page', () => {
    mockUseAuth.mockReturnValue({
      canAccess: vi.fn((roles) => roles.includes(USER_ROLES.GOD)),
      getUserRole: vi.fn(() => USER_ROLES.GOD),
    })

    renderWithRouter(<Sidebar />)
    
    expect(screen.getByText('Organizations')).toBeInTheDocument()
  })

  it('should deny access to non-God users', () => {
    mockUseAuth.mockReturnValue({
      canAccess: vi.fn((roles) => !roles.includes(USER_ROLES.GOD)),
      getUserRole: vi.fn(() => USER_ROLES.ADMIN),
    })

    renderWithRouter(<Sidebar />)
    
    expect(screen.queryByText('Organizations')).not.toBeInTheDocument()
  })

  it('should display navigation item for God users only', () => {
    // Test for God user
    mockUseAuth.mockReturnValue({
      canAccess: vi.fn((roles) => roles.includes(USER_ROLES.GOD)),
      getUserRole: vi.fn(() => USER_ROLES.GOD),
    })

    const { rerender } = renderWithRouter(<Sidebar />)
    expect(screen.getByText('Organizations')).toBeInTheDocument()

    // Test for Admin user
    mockUseAuth.mockReturnValue({
      canAccess: vi.fn((roles) => !roles.includes(USER_ROLES.GOD) && roles.includes(USER_ROLES.ADMIN)),
      getUserRole: vi.fn(() => USER_ROLES.ADMIN),
    })

    rerender(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    )
    expect(screen.queryByText('Organizations')).not.toBeInTheDocument()

    // Test for regular User
    mockUseAuth.mockReturnValue({
      canAccess: vi.fn((roles) => !roles.includes(USER_ROLES.GOD) && !roles.includes(USER_ROLES.ADMIN) && roles.includes(USER_ROLES.USER)),
      getUserRole: vi.fn(() => USER_ROLES.USER),
    })

    rerender(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    )
    expect(screen.queryByText('Organizations')).not.toBeInTheDocument()

    // Test for Client user
    mockUseAuth.mockReturnValue({
      canAccess: vi.fn(() => false),
      getUserRole: vi.fn(() => USER_ROLES.CLIENT),
    })

    rerender(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    )
    expect(screen.queryByText('Organizations')).not.toBeInTheDocument()
  })

  it('should show role indicator in sidebar', () => {
    mockUseAuth.mockReturnValue({
      canAccess: vi.fn((roles) => roles.includes(USER_ROLES.GOD)),
      getUserRole: vi.fn(() => USER_ROLES.GOD),
    })

    renderWithRouter(<Sidebar />)
    
    expect(screen.getByText('Role')).toBeInTheDocument()
    expect(screen.getByText('god')).toBeInTheDocument()
  })
})