import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrganizationList from '@/components/organizations/OrganizationList'
import type { Organization } from '@/types/organization'

// Mock the organization store
const mockUseOrganizationStore = vi.fn()
vi.mock('@/stores/organizationStore', () => ({
  useOrganizationStore: () => mockUseOrganizationStore()
}))

// Mock date-fns format function
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date) => {
    return date.toLocaleDateString()
  })
}))

describe('OrganizationList', () => {
  const mockOrganizations: Organization[] = [
    {
      id: '1',
      name: 'Test Organization 1',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2', 
      name: 'Test Organization 2',
      created_at: '2024-01-02T00:00:00Z'
    }
  ]

  const mockProps = {
    onCreateClick: vi.fn(),
    onEditClick: vi.fn(),
    onDeleteClick: vi.fn(),
  }

  const defaultStoreState = {
    organizations: mockOrganizations,
    isLoading: false,
    error: null,
    searchParams: {},
    total: 2,
    fetchOrganizations: vi.fn(),
    setSearchParams: vi.fn(),
    clearError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseOrganizationStore.mockReturnValue(defaultStoreState)
  })

  it('should render organization list correctly', () => {
    render(<OrganizationList {...mockProps} />)
    
    expect(screen.getByText('Organizations')).toBeInTheDocument()
    expect(screen.getByText('Test Organization 1')).toBeInTheDocument()
    expect(screen.getByText('Test Organization 2')).toBeInTheDocument()
    expect(screen.getByText('2 organizations total')).toBeInTheDocument()
  })

  it('should handle sorting by name and date', async () => {
    const user = userEvent.setup()
    render(<OrganizationList {...mockProps} />)
    
    const nameSort = screen.getByText('Organization Name').closest('button')
    expect(nameSort).toBeInTheDocument()
    
    if (nameSort) {
      await user.click(nameSort)
      expect(defaultStoreState.setSearchParams).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'name',
          sortOrder: 'asc'
        })
      )
    }
  })

  it('should filter organizations by search term', async () => {
    const user = userEvent.setup()
    render(<OrganizationList {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search organizations...')
    await user.type(searchInput, 'Test')
    
    await waitFor(() => {
      expect(defaultStoreState.setSearchParams).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Test'
        })
      )
    }, { timeout: 1000 })
  })

  it('should display action buttons for each row', () => {
    render(<OrganizationList {...mockProps} />)
    
    const editButtons = screen.getAllByLabelText(/edit organization/i)
    const deleteButtons = screen.getAllByLabelText(/delete organization/i)
    
    expect(editButtons).toHaveLength(2)
    expect(deleteButtons).toHaveLength(2)
  })

  it('should call edit callback when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<OrganizationList {...mockProps} />)
    
    const editButtons = screen.getAllByLabelText(/edit organization/i)
    await user.click(editButtons[0])
    
    expect(mockProps.onEditClick).toHaveBeenCalledWith(mockOrganizations[0])
  })

  it('should call delete callback when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(<OrganizationList {...mockProps} />)
    
    const deleteButtons = screen.getAllByLabelText(/delete organization/i)
    await user.click(deleteButtons[0])
    
    expect(mockProps.onDeleteClick).toHaveBeenCalledWith(mockOrganizations[0])
  })

  it('should display loading state', () => {
    mockUseOrganizationStore.mockReturnValue({
      ...defaultStoreState,
      isLoading: true,
      organizations: []
    })
    
    render(<OrganizationList {...mockProps} />)
    
    expect(screen.getByText('Loading organizations...')).toBeInTheDocument()
  })

  it('should display empty state', () => {
    mockUseOrganizationStore.mockReturnValue({
      ...defaultStoreState,
      organizations: [],
      total: 0
    })
    
    render(<OrganizationList {...mockProps} />)
    
    expect(screen.getByText('No organizations yet.')).toBeInTheDocument()
    expect(screen.getByText('Create First Organization')).toBeInTheDocument()
  })

  it('should display error state', () => {
    const errorMessage = 'Failed to load organizations'
    mockUseOrganizationStore.mockReturnValue({
      ...defaultStoreState,
      error: errorMessage
    })
    
    render(<OrganizationList {...mockProps} />)
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('should be accessible with keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<OrganizationList {...mockProps} />)
    
    // Tab to create button
    await user.tab()
    expect(screen.getByLabelText(/create new organization/i)).toHaveFocus()
    
    // Tab to search input
    await user.tab()
    expect(screen.getByPlaceholderText('Search organizations...')).toHaveFocus()
  })

  it('should clear search when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<OrganizationList {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search organizations...')
    await user.type(searchInput, 'Test')
    
    const clearButton = screen.getByText('×')
    await user.click(clearButton)
    
    expect(searchInput).toHaveValue('')
  })
})