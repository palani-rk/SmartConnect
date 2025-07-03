import { z } from 'zod'
import type { Tables, TablesInsert, TablesUpdate } from './supabase'

// Database types
export type Organization = Tables<'organizations'>
export type OrganizationInsert = TablesInsert<'organizations'>
export type OrganizationUpdate = TablesUpdate<'organizations'>

// Zod validation schemas
export const organizationCreateSchema = z.object({
  name: z.string()
    .min(1, 'Organization name is required')
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Organization name can only contain letters, numbers, spaces, hyphens, and underscores')
})

export const organizationUpdateSchema = organizationCreateSchema.partial()

// Validation schema for admin user creation
export const adminUserDataSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .optional(),
  whatsapp_id: z.string().optional(),
  instagram_id: z.string().optional()
})

// Validation schema for organization with admin form
export const organizationWithAdminFormSchema = z.object({
  organizationName: organizationCreateSchema.shape.name,
  admin: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    auto_generate_password: z.boolean().default(true),
    whatsapp_id: z.string().optional(),
    instagram_id: z.string().optional(),
    send_welcome_email: z.boolean().default(true)
  }).refine(data => {
    // If not auto-generating password, password is required
    if (!data.auto_generate_password) {
      return data.password && data.password.length >= 8
    }
    return true
  }, {
    message: "Password must be at least 8 characters when not auto-generating",
    path: ["password"]
  })
})

// Form types
export type OrganizationCreateForm = z.infer<typeof organizationCreateSchema>
export type OrganizationUpdateForm = z.infer<typeof organizationUpdateSchema>

// API response types
export interface OrganizationListResponse {
  organizations: Organization[]
  total: number
}

export interface OrganizationSearchParams {
  search?: string
  sortBy?: 'name' | 'created_at'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// Types for creating organization with admin user
export interface AdminUserData {
  email: string
  password?: string
  whatsapp_id?: string
  instagram_id?: string
}

export interface OrganizationWithAdminForm {
  organizationName: string
  adminEmail: string
  adminPassword?: string
  generatePassword: boolean
  whatsappId?: string
  instagramId?: string
  sendWelcomeEmail: boolean
}

export interface CreateOrganizationWithAdminResponse {
  organization: Organization
  adminUser: import('./user').User
  temporaryPassword?: string
}