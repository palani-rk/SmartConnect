import type { Tables, TablesInsert, TablesUpdate } from './supabase'

// Database types
export type User = Tables<'users'>
export type UserInsert = TablesInsert<'users'>
export type UserUpdate = TablesUpdate<'users'>

// Frontend-specific user types (computed fields)
export interface UserWithOrganization extends User {
  organization?: Tables<'organizations'>
}