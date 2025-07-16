import { supabase } from './supabase'
import { UserService, type CreateUserRequest } from './userService'
import type { 
  Organization, 
  OrganizationInsert, 
  OrganizationUpdate,
  OrganizationListResponse,
  OrganizationSearchParams,
  AdminUserData,
  CreateOrganizationWithAdminResponse
} from '@/types/organization'

export class OrganizationService {
  /**
   * Fetch all organizations with optional search and pagination
   */
  static async getOrganizations(params: OrganizationSearchParams = {}): Promise<OrganizationListResponse> {
    try {
      let query = supabase
        .from('organizations')
        .select('*', { count: 'exact' })

      // Apply search filter
      if (params.search) {
        query = query.ilike('name', `%${params.search}%`)
      }

      // Apply sorting
      const sortBy = params.sortBy || 'created_at'
      const sortOrder = params.sortOrder || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Apply pagination
      if (params.page && params.limit) {
        const from = (params.page - 1) * params.limit
        const to = from + params.limit - 1
        query = query.range(from, to)
      }

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to fetch organizations: ${error.message}`)
      }

      return {
        organizations: data || [],
        total: count || 0
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
      throw error
    }
  }

  /**
   * Get a single organization by ID
   */
  static async getOrganization(id: string): Promise<Organization> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw new Error(`Failed to fetch organization: ${error.message}`)
      }

      if (!data) {
        throw new Error('Organization not found')
      }

      return data
    } catch (error) {
      console.error('Error fetching organization:', error)
      throw error
    }
  }

  /**
   * Create a new organization
   */
  static async createOrganization(organization: OrganizationInsert): Promise<Organization> {
    try {
      // Check for duplicate names
      const { data: existing, error: checkError } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', organization.name)

      if (checkError && checkError.code !== 'PGRST116') {
        console.warn('Error checking for duplicate organization name:', checkError)
        // Continue with creation as we can't verify duplicates
      } else if (existing && existing.length > 0) {
        throw new Error('An organization with this name already exists')
      }

      const { data, error } = await supabase
        .from('organizations')
        .insert(organization)
        .select()
        .single()

      if (error) {
        // Handle specific error cases with user-friendly messages
        if (error.message.includes('row-level security policy')) {
          throw new Error('You do not have permission to create organizations. Please contact your administrator.')
        }
        if (error.message.includes('duplicate key')) {
          throw new Error('An organization with this name already exists.')
        }
        throw new Error(`Failed to create organization: ${error.message}`)
      }

      if (!data) {
        throw new Error('Failed to create organization: No data returned')
      }

      return data
    } catch (error) {
      console.error('Error creating organization:', error)
      throw error
    }
  }

  /**
   * Create a new organization with an admin user
   */
  static async createOrganizationWithAdmin(
    organizationData: OrganizationInsert,
    adminUserData: AdminUserData
  ): Promise<CreateOrganizationWithAdminResponse> {
    try {
      // Step 1: Validate organization name availability
      if (!(await this.isNameAvailable(organizationData.name))) {
        throw new Error('An organization with this name already exists')
      }

      // Step 2: Validate admin email uniqueness
      if (!(await UserService.isEmailAvailable(adminUserData.email))) {
        throw new Error('An account with this email already exists')
      }

      // Step 3: Create organization first
      const organization = await this.createOrganization(organizationData)

      try {
        // Step 4: Create admin user using the new API
        const createUserRequest: CreateUserRequest = {
          email: adminUserData.email,
          password: adminUserData.password,
          auto_generate_password: !adminUserData.password,
          organization_id: organization.id,
          role: 'admin',
          whatsapp_id: adminUserData.whatsapp_id,
          instagram_id: adminUserData.instagram_id,
          send_welcome_email: true // Always send welcome email for org creation
        }

        const { user: adminUser, temporaryPassword } = await UserService.createUser(createUserRequest)

        return {
          organization,
          adminUser,
          temporaryPassword
        }

      } catch (userError) {
        // If user creation fails, clean up the organization
        try {
          await this.deleteOrganization(organization.id)
        } catch (cleanupError) {
          console.error('Failed to cleanup organization after user creation failure:', cleanupError)
        }
        throw userError
      }

    } catch (error) {
      console.error('Error creating organization with admin:', error)
      throw error
    }
  }

  /**
   * Update an existing organization
   */
  static async updateOrganization(id: string, updates: OrganizationUpdate): Promise<Organization> {
    try {
      // If updating name, check for duplicates
      if (updates.name) {
        const { data: existing } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', updates.name)
          .neq('id', id)
          .single()

        if (existing) {
          throw new Error('An organization with this name already exists')
        }
      }

      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        // Handle specific error cases with user-friendly messages
        if (error.message.includes('row-level security policy')) {
          throw new Error('You do not have permission to update this organization. Please contact your administrator.')
        }
        if (error.message.includes('duplicate key')) {
          throw new Error('An organization with this name already exists.')
        }
        throw new Error(`Failed to update organization: ${error.message}`)
      }

      if (!data) {
        throw new Error('Organization not found')
      }

      return data
    } catch (error) {
      console.error('Error updating organization:', error)
      throw error
    }
  }

  /**
   * Delete an organization
   * Note: This should handle cascade deletes according to RLS policies
   */
  static async deleteOrganization(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id)

      if (error) {
        // Handle specific error cases with user-friendly messages
        if (error.message.includes('row-level security policy')) {
          throw new Error('You do not have permission to delete this organization. Please contact your administrator.')
        }
        throw new Error(`Failed to delete organization: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting organization:', error)
      throw error
    }
  }

  /**
   * Get organization statistics (user count, channel count, etc.)
   */
  static async getOrganizationStats(id: string): Promise<{
    userCount: number
    channelCount: number
    messageCount: number
  }> {
    try {
      // Get user count
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', id)

      // Get channel count
      const { count: channelCount } = await supabase
        .from('channels')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', id)

      // Get message count
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', id)

      return {
        userCount: userCount || 0,
        channelCount: channelCount || 0,
        messageCount: messageCount || 0
      }
    } catch (error) {
      console.error('Error fetching organization stats:', error)
      return {
        userCount: 0,
        channelCount: 0,
        messageCount: 0
      }
    }
  }

  /**
   * Check if organization name is available
   */
  static async isNameAvailable(name: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('organizations')
        .select('id')
        .eq('name', name)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query

      // If there's an error, log it but assume name is available
      if (error) {
        console.warn('Error checking organization name availability:', error)
        return true
      }
      
      // Name is available if no rows found
      return !data || data.length === 0
    } catch (error) {
      console.warn('Exception checking organization name availability:', error)
      // If no match found, name is available
      return true
    }
  }
}