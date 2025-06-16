import type { Tables, TablesInsert, TablesUpdate } from './supabase'

// Database types
export type Organization = Tables<'organizations'>
export type OrganizationInsert = TablesInsert<'organizations'>
export type OrganizationUpdate = TablesUpdate<'organizations'>