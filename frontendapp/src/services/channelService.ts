import { supabase } from './supabase'
import type { Channel, ChannelInsert, ChannelUpdate, ChannelMember } from '@/types/channel'
import type { User } from '@/types/user'

export interface CreateChannelRequest {
  name: string
  type: string
  is_private: boolean
  organization_id: string
}

export interface ChannelSearchParams {
  search?: string
  type?: string
  is_private?: boolean
  limit?: number
  offset?: number
}

export interface ChannelsResponse {
  channels: Channel[]
  total: number
}

export interface ChannelWithMembers extends Channel {
  members: User[]
  member_count: number
}

export interface AssignUsersRequest {
  channel_id: string
  user_ids: string[]
}

export class ChannelService {
  /**
   * Create a new channel
   */
  static async createChannel(channelData: CreateChannelRequest): Promise<Channel> {
    try {
      const { data: channel, error } = await supabase
        .from('channels')
        .insert(channelData)
        .select()
        .single()

      if (error) throw error
      if (!channel) throw new Error('Failed to create channel')

      return channel
    } catch (error) {
      console.error('Error creating channel:', error)
      throw error
    }
  }

  /**
   * Get channels by organization with pagination and filtering
   */
  static async getChannelsByOrganization(orgId: string, params: ChannelSearchParams = {}): Promise<ChannelsResponse> {
    try {
      let query = supabase
        .from('channels')
        .select('*', { count: 'exact' })
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      // Apply search filter
      if (params.search) {
        query = query.ilike('name', `%${params.search}%`)
      }

      // Apply type filter
      if (params.type) {
        query = query.eq('type', params.type)
      }

      // Apply privacy filter
      if (params.is_private !== undefined) {
        query = query.eq('is_private', params.is_private)
      }

      // Apply pagination
      const limit = params.limit || 50
      const offset = params.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data: channels, error, count } = await query

      if (error) throw error

      return {
        channels: channels || [],
        total: count || 0
      }
    } catch (error) {
      console.error('Error fetching channels by organization:', error)
      throw error
    }
  }

  /**
   * Get a single channel by ID with members
   */
  static async getChannelWithMembers(channelId: string): Promise<ChannelWithMembers> {
    try {
      // Get channel details
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single()

      if (channelError) throw channelError
      if (!channel) throw new Error('Channel not found')

      // Get channel members
      const { data: memberData, error: memberError } = await supabase
        .from('channel_members')
        .select(`
          user_id,
          users!inner (
            id,
            email,
            role,
            organization_id,
            whatsapp_id,
            instagram_id,
            created_at
          )
        `)
        .eq('channel_id', channelId)

      if (memberError) throw memberError

      const members = memberData?.map(m => m.users).filter(Boolean) || []

      return {
        ...channel,
        members,
        member_count: members.length
      }
    } catch (error) {
      console.error('Error fetching channel with members:', error)
      throw error
    }
  }

  /**
   * Update a channel
   */
  static async updateChannel(channelId: string, updates: ChannelUpdate): Promise<Channel> {
    try {
      const { data: updatedChannel, error } = await supabase
        .from('channels')
        .update(updates)
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
   * Delete a channel
   */
  static async deleteChannel(channelId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting channel:', error)
      throw error
    }
  }

  /**
   * Get channel members
   */
  static async getChannelMembers(channelId: string): Promise<User[]> {
    try {
      const { data: memberData, error } = await supabase
        .from('channel_members')
        .select(`
          user_id,
          users!inner (
            id,
            email,
            role,
            organization_id,
            whatsapp_id,
            instagram_id,
            created_at
          )
        `)
        .eq('channel_id', channelId)

      if (error) throw error

      return memberData?.map(m => m.users).filter(Boolean) || []
    } catch (error) {
      console.error('Error fetching channel members:', error)
      throw error
    }
  }

  /**
   * Assign users to a channel
   */
  static async assignUsersToChannel(channelId: string, userIds: string[]): Promise<void> {
    try {
      // First, remove existing members to replace them
      const { error: deleteError } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)

      if (deleteError) throw deleteError

      // Add new members if any provided
      if (userIds.length > 0) {
        const memberInserts = userIds.map(userId => ({
          channel_id: channelId,
          user_id: userId
        }))

        const { error: insertError } = await supabase
          .from('channel_members')
          .insert(memberInserts)

        if (insertError) throw insertError
      }
    } catch (error) {
      console.error('Error assigning users to channel:', error)
      throw error
    }
  }

  /**
   * Add users to a channel (append, don't replace)
   */
  static async addUsersToChannel(channelId: string, userIds: string[]): Promise<void> {
    try {
      const memberInserts = userIds.map(userId => ({
        channel_id: channelId,
        user_id: userId
      }))

      const { error } = await supabase
        .from('channel_members')
        .insert(memberInserts)

      if (error) throw error
    } catch (error) {
      console.error('Error adding users to channel:', error)
      throw error
    }
  }

  /**
   * Remove users from a channel
   */
  static async removeUsersFromChannel(channelId: string, userIds: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .in('user_id', userIds)

      if (error) throw error
    } catch (error) {
      console.error('Error removing users from channel:', error)
      throw error
    }
  }

  /**
   * Get channels for a specific user
   */
  static async getChannelsForUser(userId: string, orgId: string): Promise<Channel[]> {
    try {
      const { data: channelData, error } = await supabase
        .from('channel_members')
        .select(`
          channel_id,
          channels!inner (
            id,
            name,
            type,
            is_private,
            organization_id,
            created_at
          )
        `)
        .eq('user_id', userId)
        .eq('channels.organization_id', orgId)

      if (error) throw error

      return channelData?.map(m => m.channels).filter(Boolean) || []
    } catch (error) {
      console.error('Error fetching channels for user:', error)
      throw error
    }
  }

  /**
   * Get users not in a specific channel (for assignment)
   */
  static async getUsersNotInChannel(channelId: string, orgId: string): Promise<User[]> {
    try {
      // Get all users in the organization
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', orgId)

      if (usersError) throw usersError

      // Get users already in the channel
      const { data: channelMembers, error: membersError } = await supabase
        .from('channel_members')
        .select('user_id')
        .eq('channel_id', channelId)

      if (membersError) throw membersError

      const memberUserIds = new Set(channelMembers?.map(m => m.user_id) || [])
      
      // Filter out users already in the channel
      return allUsers?.filter(user => !memberUserIds.has(user.id)) || []
    } catch (error) {
      console.error('Error fetching users not in channel:', error)
      throw error
    }
  }

  /**
   * Get channel statistics for an organization
   */
  static async getChannelStats(orgId: string): Promise<{
    total: number
    byType: Record<string, number>
    privateChannels: number
    publicChannels: number
  }> {
    try {
      const { data: channels, error } = await supabase
        .from('channels')
        .select('type, is_private')
        .eq('organization_id', orgId)

      if (error) throw error

      const total = channels?.length || 0
      const byType = channels?.reduce((acc, channel) => {
        acc[channel.type] = (acc[channel.type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const privateChannels = channels?.filter(c => c.is_private).length || 0
      const publicChannels = total - privateChannels

      return { total, byType, privateChannels, publicChannels }
    } catch (error) {
      console.error('Error fetching channel stats:', error)
      throw error
    }
  }
}