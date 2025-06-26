import { z } from 'zod'
import type { Tables, TablesInsert, TablesUpdate } from './supabase'

// Database types
export type User = Tables<'users'>
export type UserInsert = TablesInsert<'users'>
export type UserUpdate = TablesUpdate<'users'>

// Frontend-specific user types (computed fields)
export interface UserWithOrganization extends User {
  organization?: Tables<'organizations'>
}

// Zod validation schemas
export const userCreateSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),
  role: z.enum(['god', 'admin', 'user', 'client'], {
    required_error: 'Role is required',
    invalid_type_error: 'Invalid role selected'
  }),
  whatsapp_id: z.string()
    .max(50, 'WhatsApp ID must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  instagram_id: z.string()
    .max(50, 'Instagram ID must be less than 50 characters')
    .optional()
    .or(z.literal(''))
})

export const userUpdateSchema = userCreateSchema.partial()

// Form types
export type UserCreateForm = z.infer<typeof userCreateSchema>
export type UserUpdateForm = z.infer<typeof userUpdateSchema>