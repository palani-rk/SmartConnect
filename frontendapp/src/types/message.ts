import type { Tables, TablesInsert, TablesUpdate } from './supabase'

// Database types
export type Message = Tables<'messages'>
export type MessageInsert = TablesInsert<'messages'>
export type MessageUpdate = TablesUpdate<'messages'>

// Message types based on your database
export type MessageType = 'text' | 'image' | 'audio' | 'file'