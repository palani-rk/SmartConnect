import type { Tables, TablesInsert, TablesUpdate } from './supabase'

// Database types
export type Channel = Tables<'channels'>
export type ChannelInsert = TablesInsert<'channels'>
export type ChannelUpdate = TablesUpdate<'channels'>

export type ChannelMember = Tables<'channel_members'>
export type ChannelMemberInsert = TablesInsert<'channel_members'>