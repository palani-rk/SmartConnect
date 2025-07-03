import { z } from 'zod'
import type { Tables, TablesInsert, TablesUpdate, Database } from './supabase'

// Database types
export type Channel = Tables<'channels'>
export type ChannelInsert = TablesInsert<'channels'>
export type ChannelUpdate = TablesUpdate<'channels'>

export type ChannelMembership = Tables<'channel_memberships'>
export type ChannelMembershipInsert = TablesInsert<'channel_memberships'>
export type ChannelMembershipUpdate = TablesUpdate<'channel_memberships'>

// View types
export type ChannelWithMemberCount = Tables<'channels_with_member_count'>

// Function return types
export type ChannelMemberDetails = Database['public']['Functions']['get_channel_members']['Returns'][0]
export type UserChannelDetails = Database['public']['Functions']['get_user_channels']['Returns'][0]
export type AddUsersResult = Database['public']['Functions']['add_users_to_channel']['Returns'][0]

// Extended types for UI
export interface ChannelWithMembers extends Channel {
  members: ChannelMemberDetails[]
  member_count: number
}

export interface ChannelListItem extends Channel {
  member_count?: number
}

// Channel types enum
export const CHANNEL_TYPES = {
  PUBLIC: 'public',
  PRIVATE: 'private'
} as const

export type ChannelType = typeof CHANNEL_TYPES[keyof typeof CHANNEL_TYPES]

// Channel member roles
export const CHANNEL_MEMBER_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member'
} as const

export type ChannelMemberRole = typeof CHANNEL_MEMBER_ROLES[keyof typeof CHANNEL_MEMBER_ROLES]

// Zod validation schemas
export const channelCreateSchema = z.object({
  name: z.string()
    .min(1, 'Channel name is required')
    .min(2, 'Channel name must be at least 2 characters')
    .max(100, 'Channel name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_#]+$/, 'Channel name can only contain letters, numbers, spaces, hyphens, underscores, and #'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  type: z.enum(['public', 'private'], {
    required_error: 'Channel type is required'
  }).default('public')
})

export const channelUpdateSchema = channelCreateSchema.partial()

export const channelMembershipSchema = z.object({
  user_ids: z.array(z.string().uuid('Invalid user ID')).min(1, 'At least one user must be selected'),
  role: z.enum(['admin', 'member']).default('member')
})

// Form types
export type ChannelCreateForm = z.infer<typeof channelCreateSchema>
export type ChannelUpdateForm = z.infer<typeof channelUpdateSchema>
export type ChannelMembershipForm = z.infer<typeof channelMembershipSchema>

// Service types
export interface CreateChannelRequest extends ChannelCreateForm {
  organization_id: string
  created_by: string
}

export interface ChannelSearchParams {
  search?: string
  type?: string
  limit?: number
  offset?: number
}

export interface ChannelsResponse {
  channels: ChannelListItem[]
  total: number
}