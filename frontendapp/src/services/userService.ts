import { supabase } from './supabase'
import type { User, UserUpdate } from '@/types/user'

export interface CreateUserRequest {
  email: string
  password?: string
  auto_generate_password?: boolean
  organization_id: string
  role: 'god' | 'admin' | 'user' | 'client'
  whatsapp_id?: string
  instagram_id?: string
  send_welcome_email?: boolean
}

export interface CreateUserResponse {
  user: User
  authUser: { id: string }
  temporaryPassword?: string
}

export interface UserSearchParams {
  search?: string
  role?: string
  limit?: number
  offset?: number
}

export interface UsersResponse {
  users: User[]
  total: number
}

export class UserService {
  /**
   * Create a new user via the backend Edge Function
   */
  static async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    try {
      // Get current user's auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.')
      }
      
      // Get the Supabase URL from environment or use the client's URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured')
      }
      
      // Call the Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })
      
      if (!response.ok) {
        const responseData = await response.json()
        throw new Error(responseData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      return {
        user: result.user,
        authUser: { id: result.auth_user_id },
        temporaryPassword: result.temporary_password
      }
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  /**
   * Get users by organization with pagination and filtering
   */
  static async getUsersByOrganization(orgId: string, params: UserSearchParams = {}): Promise<UsersResponse> {
    try {
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      // Apply search filter
      if (params.search) {
        query = query.ilike('email', `%${params.search}%`)
      }

      // Apply role filter
      if (params.role) {
        query = query.eq('role', params.role)
      }

      // Apply pagination
      const limit = params.limit || 50
      const offset = params.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data: users, error, count } = await query

      if (error) throw error

      return {
        users: users || [],
        total: count || 0
      }
    } catch (error) {
      console.error('Error fetching users by organization:', error)
      throw error
    }
  }

  /**
   * Get a single user by ID (within organization context)
   */
  static async getUserById(userId: string, orgId: string): Promise<User> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('organization_id', orgId)
        .single()

      if (error) throw error
      if (!user) throw new Error('User not found')

      return user
    } catch (error) {
      console.error('Error fetching user by ID:', error)
      throw error
    }
  }

  /**
   * Update a user
   */
  static async updateUser(userId: string, updates: UserUpdate): Promise<User> {
    try {
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      if (!updatedUser) throw new Error('User not found')

      return updatedUser
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  /**
   * Update user role
   */
  static async updateUserRole(userId: string, role: string): Promise<User> {
    return this.updateUser(userId, { role })
  }

  /**
   * Delete a user
   */
  static async deleteUser(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }

  /**
   * Check if email is available within organization
   */
  static async isEmailAvailable(email: string, orgId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .eq('organization_id', orgId)

      // If there's an error, log it but assume email is available
      if (error) {
        console.warn('Error checking email availability:', error)
        return true
      }
      
      // Email is available if no rows found
      return !data || data.length === 0
    } catch (error) {
      console.warn('Exception checking email availability:', error)
      // If no match found, email is available
      return true
    }
  }

  /**
   * Get user statistics for an organization
   */
  static async getUserStats(orgId: string): Promise<{
    total: number
    byRole: Record<string, number>
  }> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('role')
        .eq('organization_id', orgId)

      if (error) throw error

      const total = users?.length || 0
      const byRole = users?.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      return { total, byRole }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      throw error
    }
  }
}