import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OrganizationService } from '@/services/organizationService'

// Mock the supabase client
const mockSupabaseResponse = vi.fn()
vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn(() => mockSupabaseResponse()),
    }))
  }
}))

describe('Organization Service Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('RLS Policy Violations', () => {
    it('should return user-friendly message for RLS policy violation on create', async () => {
      mockSupabaseResponse.mockResolvedValue({
        data: null,
        error: { message: 'new row violates row-level security policy for table "organizations"' }
      })

      await expect(OrganizationService.createOrganization({ name: 'Test Org' }))
        .rejects.toThrow('You do not have permission to create organizations. Please contact your administrator.')
    })

    it('should return user-friendly message for RLS policy violation on update', async () => {
      mockSupabaseResponse
        .mockResolvedValueOnce({ data: null, error: null }) // No duplicate check
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'update violates row-level security policy for table "organizations"' }
        })

      await expect(OrganizationService.updateOrganization('123', { name: 'Updated Org' }))
        .rejects.toThrow('You do not have permission to update this organization. Please contact your administrator.')
    })

    it('should return user-friendly message for RLS policy violation on delete', async () => {
      mockSupabaseResponse.mockResolvedValue({
        error: { message: 'delete violates row-level security policy for table "organizations"' }
      })

      await expect(OrganizationService.deleteOrganization('123'))
        .rejects.toThrow('You do not have permission to delete this organization. Please contact your administrator.')
    })
  })

  describe('Duplicate Key Violations', () => {
    it('should return user-friendly message for duplicate key on create', async () => {
      mockSupabaseResponse.mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint' }
      })

      await expect(OrganizationService.createOrganization({ name: 'Existing Org' }))
        .rejects.toThrow('An organization with this name already exists.')
    })

    it('should return user-friendly message for duplicate key on update', async () => {
      mockSupabaseResponse
        .mockResolvedValueOnce({ data: null, error: null }) // No duplicate check
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'duplicate key value violates unique constraint' }
        })

      await expect(OrganizationService.updateOrganization('123', { name: 'Existing Org' }))
        .rejects.toThrow('An organization with this name already exists.')
    })
  })

  describe('Generic Errors', () => {
    it('should return generic error message for unknown errors', async () => {
      mockSupabaseResponse.mockResolvedValue({
        data: null,
        error: { message: 'Unknown database error' }
      })

      await expect(OrganizationService.createOrganization({ name: 'Test Org' }))
        .rejects.toThrow('Failed to create organization: Unknown database error')
    })
  })
})