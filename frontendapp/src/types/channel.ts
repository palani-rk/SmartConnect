import { z } from 'zod'
import type { Tables, TablesInsert, TablesUpdate } from './supabase'

// Database types
export type Channel = Tables<'channels'>
export type ChannelInsert = TablesInsert<'channels'>
export type ChannelUpdate = TablesUpdate<'channels'>

export type ChannelMember = Tables<'channel_members'>
export type ChannelMemberInsert = TablesInsert<'channel_members'>

// Zod validation schemas
export const channelCreateSchema = z.object({
  name: z.string()
    .min(1, 'Channel name is required')
    .min(2, 'Channel name must be at least 2 characters')
    .max(50, 'Channel name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_#]+$/, 'Channel name can only contain letters, numbers, spaces, hyphens, underscores, and #'),
  type: z.string().min(1, 'Channel type is required'),
  is_private: z.boolean().default(false)
})

export const channelUpdateSchema = channelCreateSchema.partial()

// Form types
export type ChannelCreateForm = z.infer<typeof channelCreateSchema>
export type ChannelUpdateForm = z.infer<typeof channelUpdateSchema>

// Channel types enum
export const CHANNEL_TYPES = {
  TEXT: 'text',
  VOICE: 'voice',
  GENERAL: 'general',
  ANNOUNCEMENTS: 'announcements',
  SUPPORT: 'support'
} as const

export type ChannelType = typeof CHANNEL_TYPES[keyof typeof CHANNEL_TYPES]