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

// Base schema without refinements
const userBaseSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),
  role: z.enum(['god', 'admin', 'user', 'client'], {
    required_error: 'Role is required',
    invalid_type_error: 'Invalid role selected'
  }),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .optional(),
  auto_generate_password: z.boolean().default(true),
  whatsapp_id: z.string()
    .max(50, 'WhatsApp ID must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  instagram_id: z.string()
    .max(50, 'Instagram ID must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  send_welcome_email: z.boolean().default(true)
})

// Create schema with validation refinements
export const userCreateSchema = userBaseSchema.refine(data => {
  // If not auto-generating password, password is required
  if (!data.auto_generate_password) {
    return data.password && data.password.length >= 8
  }
  return true
}, {
  message: "Password must be at least 8 characters when not auto-generating",
  path: ["password"]
})

// Update schema is partial of the base schema (without refinements for flexibility)
export const userUpdateSchema = userBaseSchema.partial()

// Form types
export type UserCreateForm = z.infer<typeof userCreateSchema>
export type UserUpdateForm = z.infer<typeof userUpdateSchema>