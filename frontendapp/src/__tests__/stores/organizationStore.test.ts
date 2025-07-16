import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOrganizationStore } from '@/stores/organizationStore'

// Mock the organization service
vi.mock('@/services/organizationService', () => ({
  OrganizationService: {
    getOrganizations: vi.fn(),
    createOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    deleteOrganization: vi.fn(),
  }
}))

const mockOrganizationService = await import('@/services/organizationService')

describe('Organization Store', () => {
  const mockOrganization = {
    id: '123',
    name: 'Test Organization',
    created_at: '2024-01-01T00:00:00Z'
  }

  const mockOrganizationList = [
    mockOrganization,
    {
      id: '456',
      name: 'Another Organization',
      created_at: '2024-01-02T00:00:00Z'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useOrganizationStore.setState({
      organizations: [],
      selectedOrganization: null,
      isLoading: false,
      error: null,
      searchParams: {},
      total: 0
    })
  })

  it('should initialize with empty state', () => {
    const state = useOrganizationStore.getState()
    
    expect(state.organizations).toEqual([])
    expect(state.selectedOrganization).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.total).toBe(0)
  })

  describe('setSelectedOrganization', () => {
    it('should update selected organization', () => {
      const { setSelectedOrganization } = useOrganizationStore.getState()
      
      setSelectedOrganization(mockOrganization)
      
      const state = useOrganizationStore.getState()
      expect(state.selectedOrganization).toEqual(mockOrganization)
    })

    it('should clear selected organization when null', () => {
      const { setSelectedOrganization } = useOrganizationStore.getState()
      
      // First set an organization
      setSelectedOrganization(mockOrganization)
      expect(useOrganizationStore.getState().selectedOrganization).toEqual(mockOrganization)
      
      // Then clear it
      setSelectedOrganization(null)
      expect(useOrganizationStore.getState().selectedOrganization).toBeNull()
    })
  })

  describe('fetchOrganizations', () => {
    it('should update state when fetching organizations', async () => {
      // @ts-ignore - mocking implementation
      mockOrganizationService.OrganizationService.getOrganizations.mockResolvedValue({
        organizations: mockOrganizationList,
        total: 2
      })

      const { fetchOrganizations } = useOrganizationStore.getState()
      
      await fetchOrganizations()
      
      const state = useOrganizationStore.getState()
      expect(state.organizations).toEqual(mockOrganizationList)
      expect(state.total).toBe(2)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle fetch errors', async () => {
      const errorMessage = 'Failed to fetch organizations'
      // @ts-ignore - mocking implementation
      mockOrganizationService.OrganizationService.getOrganizations.mockRejectedValue(
        new Error(errorMessage)
      )

      const { fetchOrganizations } = useOrganizationStore.getState()
      
      await expect(fetchOrganizations()).rejects.toThrow(errorMessage)
      
      const state = useOrganizationStore.getState()
      expect(state.error).toBe(errorMessage)
      expect(state.isLoading).toBe(false)
    })

    it('should manage loading states correctly', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })
      
      // @ts-ignore - mocking implementation
      mockOrganizationService.OrganizationService.getOrganizations.mockReturnValue(promise)

      const { fetchOrganizations } = useOrganizationStore.getState()
      
      // Start fetch
      const fetchPromise = fetchOrganizations()
      
      // Check loading state
      expect(useOrganizationStore.getState().isLoading).toBe(true)
      
      // Resolve the promise
      resolvePromise!({
        organizations: mockOrganizationList,
        total: 2
      })
      
      await fetchPromise
      
      // Check final state
      expect(useOrganizationStore.getState().isLoading).toBe(false)
    })
  })

  describe('createOrganization', () => {
    it('should handle create organization action', async () => {
      const newOrgData = { name: 'New Organization' }
      const createdOrg = { ...mockOrganization, name: 'New Organization' }
      
      // @ts-ignore - mocking implementation
      mockOrganizationService.OrganizationService.createOrganization.mockResolvedValue(createdOrg)

      const { createOrganization } = useOrganizationStore.getState()
      
      const result = await createOrganization(newOrgData)
      
      expect(result).toEqual(createdOrg)
      
      const state = useOrganizationStore.getState()
      expect(state.organizations).toContain(createdOrg)
      expect(state.total).toBe(1)
    })

    it('should handle create errors', async () => {
      const errorMessage = 'Failed to create organization'
      // @ts-ignore - mocking implementation
      mockOrganizationService.OrganizationService.createOrganization.mockRejectedValue(
        new Error(errorMessage)
      )

      const { createOrganization } = useOrganizationStore.getState()
      
      await expect(createOrganization({ name: 'Test' })).rejects.toThrow(errorMessage)
      
      const state = useOrganizationStore.getState()
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('updateOrganization', () => {
    it('should handle update organization action', async () => {
      // Set initial state with an organization
      useOrganizationStore.setState({
        organizations: [mockOrganization],
        total: 1
      })

      const updateData = { name: 'Updated Organization' }
      const updatedOrg = { ...mockOrganization, name: 'Updated Organization' }
      
      // @ts-ignore - mocking implementation
      mockOrganizationService.OrganizationService.updateOrganization.mockResolvedValue(updatedOrg)

      const { updateOrganization } = useOrganizationStore.getState()
      
      const result = await updateOrganization('123', updateData)
      
      expect(result).toEqual(updatedOrg)
      
      const state = useOrganizationStore.getState()
      expect(state.organizations[0]).toEqual(updatedOrg)
    })
  })

  describe('deleteOrganization', () => {
    it('should handle delete organization action', async () => {
      // Set initial state with organizations
      useOrganizationStore.setState({
        organizations: mockOrganizationList,
        total: 2
      })

      // @ts-ignore - mocking implementation
      mockOrganizationService.OrganizationService.deleteOrganization.mockResolvedValue(undefined)

      const { deleteOrganization } = useOrganizationStore.getState()
      
      await deleteOrganization('123')
      
      const state = useOrganizationStore.getState()
      expect(state.organizations).toHaveLength(1)
      expect(state.organizations.find(org => org.id === '123')).toBeUndefined()
      expect(state.total).toBe(1)
    })

    it('should clear selected organization if it was deleted', async () => {
      // Set initial state with organizations and selection
      useOrganizationStore.setState({
        organizations: mockOrganizationList,
        selectedOrganization: mockOrganization,
        total: 2
      })

      // @ts-ignore - mocking implementation
      mockOrganizationService.OrganizationService.deleteOrganization.mockResolvedValue(undefined)

      const { deleteOrganization } = useOrganizationStore.getState()
      
      await deleteOrganization('123')
      
      const state = useOrganizationStore.getState()
      expect(state.selectedOrganization).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should clear error', () => {
      // Set initial error state
      useOrganizationStore.setState({ error: 'Some error' })
      
      const { clearError } = useOrganizationStore.getState()
      clearError()
      
      expect(useOrganizationStore.getState().error).toBeNull()
    })

    it('should set error', () => {
      const { setError } = useOrganizationStore.getState()
      setError('Test error')
      
      expect(useOrganizationStore.getState().error).toBe('Test error')
    })
  })
})