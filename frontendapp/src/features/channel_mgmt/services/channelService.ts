import { supabase } from '@/services/supabase'
import type { 
  Channel, 
  ChannelInsert, 
  ChannelUpdate, 
  ChannelMembership, 
  ChannelMembershipInsert,
  ChannelWithDetails,
  ChannelMemberDetails,
  ChannelSearchParams,
  ChannelsResponse,
  ChannelCreateForm,
  ChannelUpdateForm
} from '../types/channel'

// Internal types for Supabase responses
interface SupabaseMembership {
  user: {
    id: string
    email: string
    role: string
    organization_id: string
    whatsapp_id?: string | null
    instagram_id?: string | null
    created_at?: string | null
  }
  role: string
  joined_at: string
}

interface SupabaseChannelResponse {
  id: string
  organization_id: string
  name: string
  description?: string | null
  type: string
  created_by: string
  created_at?: string | null
  updated_at?: string | null
  deleted_at?: string | null
  created_by_user: {
    id: string
    email: string
    role: string
    organization_id: string
  }
  memberships?: SupabaseMembership[]
}

interface SupabaseUserChannelResponse {
  channel: {
    id: string
    organization_id: string
    name: string
    description?: string | null
    type: string
    created_by: string
    created_at?: string | null
    updated_at?: string | null
    deleted_at?: string | null
  }
}

export class ChannelService {
  /**
   * Get all channels for an organization with optional filtering
   */
  static async getChannelsByOrganization(
    organizationId: string, 
    params: ChannelSearchParams = {}
  ): Promise<ChannelsResponse> {
    try {
      let query = supabase
        .from('channels')
        .select(`
          *,
          created_by_user:users!channels_created_by_fkey(id, email, role, organization_id),
          memberships:channel_memberships(
            id,
            user_id,
            role,
            joined_at,
            created_at,
            user:users(id, email, role, organization_id, whatsapp_id, instagram_id)
          )
        `, { count: 'exact' })
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      // Apply search filter
      if (params.search) {
        query = query.ilike('name', `%${params.search}%`)
      }

      // Apply type filter
      if (params.type) {
        query = query.eq('type', params.type)
      }

      // Apply pagination
      const limit = params.limit || 50
      const offset = params.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data: channels, error, count } = await query

      if (error) throw error

      // Transform the data to match our expected types
      const transformedChannels: ChannelWithDetails[] = (channels as SupabaseChannelResponse[] || []).map(channel => ({
        ...channel,
        members: channel.memberships?.map((membership: SupabaseMembership) => ({
          ...membership.user,
          membership_role: membership.role as 'admin' | 'member',
          joined_at: membership.joined_at,
          can_remove: true // Will be computed based on permissions
        })) || [],
        member_count: channel.memberships?.length || 0,
        creator: channel.created_by_user,
        can_edit: true, // Will be computed based on permissions
        can_delete: true // Will be computed based on permissions
      }))

      return {
        channels: transformedChannels,
        total: count || 0,
        has_more: (count || 0) > (offset + limit)
      }
    } catch (error) {
      console.error('Error fetching channels by organization:', error)
      throw error
    }
  }

  /**
   * Get a single channel with full details including members
   */
  static async getChannelWithMembers(channelId: string): Promise<ChannelWithDetails> {
    try {
      const { data: channel, error } = await supabase
        .from('channels')
        .select(`
          *,
          created_by_user:users!channels_created_by_fkey(id, email, role, organization_id),
          memberships:channel_memberships(
            id,
            user_id,
            role,
            joined_at,
            created_at,
            user:users(id, email, role, organization_id, whatsapp_id, instagram_id)
          )
        `)
        .eq('id', channelId)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      if (!channel) throw new Error('Channel not found')

      // Transform the data
      const channelData = channel as SupabaseChannelResponse
      const transformedChannel: ChannelWithDetails = {
        ...channelData,
        members: channelData.memberships?.map((membership: SupabaseMembership) => ({
          ...membership.user,
          membership_role: membership.role as 'admin' | 'member',
          joined_at: membership.joined_at,
          can_remove: true
        })) || [],
        member_count: channelData.memberships?.length || 0,
        creator: channelData.created_by_user,
        can_edit: true,
        can_delete: true
      }

      return transformedChannel
    } catch (error) {
      console.error('Error fetching channel with members:', error)
      throw error
    }
  }

  /**
   * Create a new channel
   */
  static async createChannel(
    data: ChannelCreateForm, 
    organizationId: string, 
    createdBy: string
  ): Promise<Channel> {
    try {
      console.log('🔵 ChannelService: createChannel called', { data, organizationId, createdBy })
      
      const channelData: ChannelInsert = {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        type: data.type,
        organization_id: organizationId,
        created_by: createdBy
      }
      
      console.log('🟡 ChannelService: Inserting channel data', channelData)

      const { data: newChannel, error } = await supabase
        .from('channels')
        .insert(channelData)
        .select()
        .single()

      console.log('🟡 ChannelService: Supabase response', { newChannel, error })

      if (error) throw error
      if (!newChannel) throw new Error('Failed to create channel')

      console.log('🟢 ChannelService: Channel created, adding creator as admin')
      // Add creator as admin member
      await this.addUsersToChannel(newChannel.id, [createdBy], 'admin')

      console.log('🟢 ChannelService: Channel creation completed successfully')
      return newChannel
    } catch (error) {
      console.error('🔴 ChannelService: Error creating channel:', error)
      throw error
    }
  }

  /**
   * Update a channel
   */
  static async updateChannel(channelId: string, data: ChannelUpdateForm): Promise<Channel> {
    try {
      const updateData: ChannelUpdate = {
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.type && { type: data.type }),
        updated_at: new Date().toISOString()
      }

      const { data: updatedChannel, error } = await supabase
        .from('channels')
        .update(updateData)
        .eq('id', channelId)
        .select()
        .single()

      if (error) throw error
      if (!updatedChannel) throw new Error('Channel not found')

      return updatedChannel
    } catch (error) {
      console.error('Error updating channel:', error)
      throw error
    }
  }

  /**
   * Soft delete a channel
   */
  static async deleteChannel(channelId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('channels')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', channelId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting channel:', error)
      throw error
    }
  }

  /**
   * Add users to a channel with specified role
   */
  static async addUsersToChannel(
    channelId: string, 
    userIds: string[], 
    role: 'admin' | 'member' = 'member'
  ): Promise<ChannelMembership[]> {
    try {
      const memberships: ChannelMembershipInsert[] = userIds.map(userId => ({
        channel_id: channelId,
        user_id: userId,
        role
      }))

      const { data: newMemberships, error } = await supabase
        .from('channel_memberships')
        .insert(memberships)
        .select()

      if (error) throw error

      return newMemberships || []
    } catch (error) {
      console.error('Error adding users to channel:', error)
      throw error
    }
  }

  /**
   * Remove a user from a channel
   */
  static async removeUserFromChannel(channelId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('channel_memberships')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId)

      if (error) throw error
    } catch (error) {
      console.error('Error removing user from channel:', error)
      throw error
    }
  }

  /**
   * Update a member's role in a channel
   */
  static async updateMemberRole(
    channelId: string, 
    userId: string, 
    role: 'admin' | 'member'
  ): Promise<ChannelMembership> {
    try {
      const { data: updatedMembership, error } = await supabase
        .from('channel_memberships')
        .update({ role })
        .eq('channel_id', channelId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      if (!updatedMembership) throw new Error('Membership not found')

      return updatedMembership
    } catch (error) {
      console.error('Error updating member role:', error)
      throw error
    }
  }

  /**
   * Get channel members with their details
   */
  static async getChannelMembers(channelId: string): Promise<ChannelMemberDetails[]> {
    try {
      const { data: memberships, error } = await supabase
        .from('channel_memberships')
        .select(`
          role,
          joined_at,
          user:users(id, email, role, organization_id, whatsapp_id, instagram_id, created_at)
        `)
        .eq('channel_id', channelId)
        .order('joined_at', { ascending: true })

      if (error) throw error

      return (memberships as SupabaseMembership[] || []).map((membership: SupabaseMembership) => ({
        ...membership.user,
        membership_role: membership.role as 'admin' | 'member',
        joined_at: membership.joined_at,
        can_remove: true
      }))
    } catch (error) {
      console.error('Error fetching channel members:', error)
      throw error
    }
  }

  /**
   * Get channels that a user is a member of
   */
  static async getUserChannels(userId: string, organizationId: string): Promise<Channel[]> {
    try {
      const { data: memberships, error } = await supabase
        .from('channel_memberships')
        .select(`
          channel:channels(*)
        `)
        .eq('user_id', userId)
        .eq('channel.organization_id', organizationId)
        .is('channel.deleted_at', null)

      if (error) throw error

      return (memberships as SupabaseUserChannelResponse[] || []).map((membership: SupabaseUserChannelResponse) => membership.channel).filter(Boolean)
    } catch (error) {
      console.error('Error fetching user channels:', error)
      throw error
    }
  }

  /**
   * Check if a channel name is available within an organization
   */
  static async isChannelNameAvailable(name: string, organizationId: string, excludeChannelId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('channels')
        .select('id')
        .eq('name', name.trim())
        .eq('organization_id', organizationId)
        .is('deleted_at', null)

      if (excludeChannelId) {
        query = query.neq('id', excludeChannelId)
      }

      const { data, error } = await query

      if (error) {
        console.warn('Error checking channel name availability:', error)
        return true
      }
      
      return !data || data.length === 0
    } catch (error) {
      console.warn('Exception checking channel name availability:', error)
      return true
    }
  }

  /**
   * Get channel statistics for an organization
   */
  static async getChannelStats(organizationId: string): Promise<{
    total: number
    byType: Record<string, number>
    totalMembers: number
  }> {
    try {
      const { data: channels, error } = await supabase
        .from('channels')
        .select(`
          type,
          memberships:channel_memberships(count)
        `)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)

      if (error) throw error

      const total = channels?.length || 0
      const byType = channels?.reduce((acc, channel) => {
        acc[channel.type] = (acc[channel.type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const totalMembers = channels?.reduce((acc, channel) => {
        return acc + (channel.memberships?.[0]?.count || 0)
      }, 0) || 0

      return { total, byType, totalMembers }
    } catch (error) {
      console.error('Error fetching channel stats:', error)
      throw error
    }
  }
}