import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import OrganizationList from '@/components/organizations/OrganizationList'

// Mock the organization store
const mockFetchOrganizations = vi.fn()
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

describe('OrganizationList - Infinite Loop Prevention', () => {
  const mockProps = {
    onCreateClick: vi.fn(),
    onEditClick: vi.fn(),
    onDeleteClick: vi.fn(),
  }

  const defaultStoreState = {
    organizations: [],
    isLoading: false,
    error: null,
    total: 0,
    fetchOrganizations: mockFetchOrganizations,
    clearError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseOrganizationStore.mockReturnValue(defaultStoreState)
    mockFetchOrganizations.mockResolvedValue(undefined)
  })

  it('should not cause infinite loops on initial render', async () => {
    render(<OrganizationList {...mockProps} />)
    
    // Should only call fetchOrganizations once on initial render
    expect(mockFetchOrganizations).toHaveBeenCalledTimes(1)
    expect(mockFetchOrganizations).toHaveBeenCalledWith()
  })

  it('should handle empty organization list without continuous loading', () => {
    mockUseOrganizationStore.mockReturnValue({
      ...defaultStoreState,
      organizations: [],
      total: 0,
      isLoading: false
    })

    render(<OrganizationList {...mockProps} />)
    
    // Should call fetchOrganizations only once for initial load
    expect(mockFetchOrganizations).toHaveBeenCalledTimes(1)
  })

  it('should not refetch when organizations is empty but successful response', () => {
    // Simulate successful API call that returns empty array
    mockUseOrganizationStore.mockReturnValue({
      ...defaultStoreState,
      organizations: [],
      total: 0,
      isLoading: false,
      error: null
    })

    const { rerender } = render(<OrganizationList {...mockProps} />)
    
    // Initial call
    expect(mockFetchOrganizations).toHaveBeenCalledTimes(1)
    
    // Re-render with same state shouldn't trigger more calls
    rerender(<OrganizationList {...mockProps} />)
    expect(mockFetchOrganizations).toHaveBeenCalledTimes(1)
  })
})