import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OrganizationService } from '@/services/organizationService'

// Mock the supabase client
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn(),
}

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockQuery)
  }
}))

const mockSupabase = await import('@/services/supabase')

describe('Organization Service', () => {
  const mockOrganization = {
    id: '123',
    name: 'Test Organization',
    created_at: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset all mock functions to return this by default
    mockQuery.select.mockReturnThis()
    mockQuery.insert.mockReturnThis()
    mockQuery.update.mockReturnThis()
    mockQuery.delete.mockReturnThis()
    mockQuery.eq.mockReturnThis()
    mockQuery.neq.mockReturnThis()
    mockQuery.ilike.mockReturnThis()
    mockQuery.order.mockReturnThis()
    mockQuery.range.mockReturnThis()
  })

  describe('getOrganizations', () => {
    it('should fetch all organizations', async () => {
      // Mock the final resolved value
      mockQuery.select.mockResolvedValue({
        data: [mockOrganization],
        error: null,
        count: 1
      })

      const result = await OrganizationService.getOrganizations()

      expect(mockSupabase.supabase.from).toHaveBeenCalledWith('organizations')
      expect(result.organizations).toEqual([mockOrganization])
      expect(result.total).toBe(1)
    })

    it('should handle search parameters', async () => {
      mockQuery.select.mockResolvedValue({
        data: [mockOrganization],
        error: null,
        count: 1
      })

      await OrganizationService.getOrganizations({ search: 'Test' })

      expect(mockQuery.ilike).toHaveBeenCalledWith('name', '%Test%')
    })

    it('should handle network errors gracefully', async () => {
      mockQuery.select.mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
        count: null
      })

      await expect(OrganizationService.getOrganizations()).rejects.toThrow('Failed to fetch organizations: Network error')
    })
  })

  describe('createOrganization', () => {
    it('should create organization with valid data', async () => {
      const newOrgData = { name: 'New Organization' }
      
      // Mock duplicate check (no existing org)
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: null
      })
      
      // Mock insert operation
      mockQuery.single.mockResolvedValueOnce({
        data: { ...mockOrganization, name: 'New Organization' },
        error: null
      })

      const result = await OrganizationService.createOrganization(newOrgData)

      expect(result.name).toBe('New Organization')
    })

    it('should reject duplicate organization names', async () => {
      const newOrgData = { name: 'Existing Organization' }
      
      // Mock duplicate check (existing org found)
      mockQuery.single.mockResolvedValue({
        data: { id: '456' },
        error: null
      })

      await expect(OrganizationService.createOrganization(newOrgData))
        .rejects.toThrow('An organization with this name already exists')
    })
  })

  describe('updateOrganization', () => {
    it('should update organization successfully', async () => {
      const updateData = { name: 'Updated Organization' }
      
      // Mock duplicate check (no conflict)
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: null
      })
      
      // Mock update operation
      mockQuery.single.mockResolvedValueOnce({
        data: { ...mockOrganization, name: 'Updated Organization' },
        error: null
      })

      const result = await OrganizationService.updateOrganization('123', updateData)

      expect(result.name).toBe('Updated Organization')
    })
  })

  describe('deleteOrganization', () => {
    it('should delete organization with confirmation', async () => {
      mockQuery.eq.mockResolvedValue({ error: null })

      await expect(OrganizationService.deleteOrganization('123')).resolves.not.toThrow()
      expect(mockQuery.delete).toHaveBeenCalled()
    })

    it('should handle delete errors', async () => {
      mockQuery.eq.mockResolvedValue({ error: { message: 'Delete failed' } })

      await expect(OrganizationService.deleteOrganization('123'))
        .rejects.toThrow('Failed to delete organization: Delete failed')
    })
  })

  describe('isNameAvailable', () => {
    it('should return true for available names', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: null })

      const result = await OrganizationService.isNameAvailable('Available Name')
      expect(result).toBe(true)
    })

    it('should return false for taken names', async () => {
      mockQuery.single.mockResolvedValue({ data: { id: '123' }, error: null })

      const result = await OrganizationService.isNameAvailable('Taken Name')
      expect(result).toBe(false)
    })
  })
})