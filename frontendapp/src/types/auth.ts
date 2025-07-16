import type { Tables } from './supabase'

// Use database types to ensure consistency
export type User = Tables<'users'>
export type UserRole = User['role']

// Authentication related types
export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
}

export interface AuthUser extends User {
  // Add any additional properties needed for auth context
}

// Define specific role types based on your database
export type GodUser = User & { role: 'god' }
export type AdminUser = User & { role: 'admin' }
export type OrgUser = User & { role: 'user' }
export type ClientUser = User & { role: 'client' }