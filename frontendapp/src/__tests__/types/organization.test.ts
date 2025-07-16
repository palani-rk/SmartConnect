import { describe, it, expect } from 'vitest'
import { organizationCreateSchema, organizationUpdateSchema } from '@/types/organization'

describe('Organization Types', () => {
  describe('organizationCreateSchema', () => {
    it('should validate correct organization data', () => {
      const validData = {
        name: 'Test Organization'
      }
      
      const result = organizationCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty organization names', () => {
      const invalidData = {
        name: ''
      }
      
      const result = organizationCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('Organization name is required')
    })

    it('should reject organization names that are too short', () => {
      const invalidData = {
        name: 'A'
      }
      
      const result = organizationCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('Organization name must be at least 2 characters')
    })

    it('should reject organization names that are too long', () => {
      const invalidData = {
        name: 'A'.repeat(101)
      }
      
      const result = organizationCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('Organization name must be less than 100 characters')
    })

    it('should reject organization names with invalid characters', () => {
      const invalidData = {
        name: 'Test Organization @#$%'
      }
      
      const result = organizationCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('Organization name can only contain letters, numbers, spaces, hyphens, and underscores')
    })

    it('should accept valid organization names with allowed characters', () => {
      const validNames = [
        'Test Organization',
        'Test-Organization',
        'Test_Organization',
        'Test123',
        'TEST ORGANIZATION'
      ]

      validNames.forEach(name => {
        const result = organizationCreateSchema.safeParse({ name })
        expect(result.success).toBe(true)
      })
    })

    it('should reject missing name field', () => {
      const invalidData = {}
      
      const result = organizationCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('organizationUpdateSchema', () => {
    it('should handle optional fields correctly', () => {
      const validData = {
        name: 'Updated Organization'
      }
      
      const result = organizationUpdateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should allow empty object for partial updates', () => {
      const validData = {}
      
      const result = organizationUpdateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should still validate name if provided', () => {
      const invalidData = {
        name: ''
      }
      
      const result = organizationUpdateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})