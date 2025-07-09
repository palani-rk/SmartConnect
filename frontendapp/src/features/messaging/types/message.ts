import type { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase'

// Database types
export type Message = Tables<'messages'>
export type MessageInsert = TablesInsert<'messages'>
export type MessageUpdate = TablesUpdate<'messages'>

// Message types based on your database
export type MessageType = 'text' | 'image' | 'audio' | 'file'

// Message status for optimistic updates
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'failed'

// Connection status for real-time
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting'

// Enhanced message with user and channel details
export interface MessageWithDetails extends Message {
  author: {
    id: string
    email: string
    role: string
  }
  channel: {
    id: string
    name: string
  }
  status: MessageStatus
  isOptimistic?: boolean
}

// Message pagination parameters
export interface MessagePaginationParams {
  channelId: string
  limit?: number
  cursor?: string
}

// Message pagination response
export interface MessagePaginationResponse {
  messages: MessageWithDetails[]
  hasMore: boolean
  nextCursor?: string
}

// Message form data
export interface MessageFormData {
  content: string
  channelId: string
  messageType?: MessageType
  metadata?: Record<string, any>
  threadId?: string
}

// Real-time message event
export interface MessageEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Message
  old?: Message
}