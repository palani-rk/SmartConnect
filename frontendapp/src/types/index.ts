// Type definitions exports
export * from './supabase'
export * from './auth'
export * from './organization'
export * from './channel'
export * from './message'
export * from './common'

// Re-export user types with specific names to avoid conflicts
export type { User, UserInsert, UserUpdate, UserWithOrganization } from './user'