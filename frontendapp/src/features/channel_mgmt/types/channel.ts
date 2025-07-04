import { z } from 'zod'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase'
import type { UserWithOrganization } from '@/types/user'

// Database types
export type Channel = Tables<'channels'>
export type ChannelInsert = TablesInsert<'channels'>
export type ChannelUpdate = TablesUpdate<'channels'>

export type ChannelMembership = Tables<'channel_memberships'>
export type ChannelMembershipInsert = TablesInsert<'channel_memberships'>
export type ChannelMembershipUpdate = TablesUpdate<'channel_memberships'>

// Extended types for UI
export interface ChannelWithMembers extends Channel {
  members: UserWithOrganization[]
  member_count: number
}

export interface ChannelWithDetails extends Channel {
  members: ChannelMemberDetails[]
  member_count: number
  creator: UserWithOrganization
  can_edit: boolean
  can_delete: boolean
}

export interface ChannelMemberDetails extends UserWithOrganization {
  membership_role: 'admin' | 'member'
  joined_at: string
  can_remove: boolean
}

// Form validation schemas
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

// API types
export interface ChannelSearchParams {
  organization_id: string
  search?: string
  type?: 'public' | 'private'
  limit?: number
  offset?: number
}

export interface ChannelsResponse {
  channels: ChannelWithDetails[]
  total: number
  has_more: boolean
}

// Component prop types
export interface ChannelManagementProps {
  organizationId: string
  currentUser: UserWithOrganization
  onChannelSelect?: (channel: Channel) => void
}

export interface ChannelFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ChannelCreateForm) => Promise<void>
  channel?: Channel | null
  isSubmitting?: boolean
  error?: string | null
}

export interface MemberManagementDialogProps {
  channel: ChannelWithDetails
  availableUsers: UserWithOrganization[]
  onMembersUpdate: (members: ChannelMemberDetails[]) => void
  open: boolean
  onClose: () => void
}

export interface ChannelListProps {
  channels: ChannelWithDetails[]
  onChannelEdit: (channel: Channel) => void
  onChannelDelete: (channel: Channel) => void
  onMemberManage: (channel: Channel) => void
  loading?: boolean
  error?: string | null
}