import { supabase } from '@/services/supabase'
import type { 
  Message,
  MessageInsert,
  MessageWithDetails,
  MessageFormData,
  MessagePaginationParams,
  MessagePaginationResponse,
  MessageEvent
} from '../types/message'

// Internal types for Supabase responses
interface SupabaseMessageResponse {
  id: string
  channel_id: string
  user_id: string
  content: string
  message_type: string
  metadata: any
  thread_id: string | null
  is_pinned: boolean
  is_edited: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  author_email: string
  author_role: string
  channel_name: string
}

export class MessageService {
  /**
   * Get messages for a channel with pagination
   */
  static async getMessages(params: MessagePaginationParams): Promise<MessagePaginationResponse> {
    try {
      const { channelId, limit = 50, cursor } = params
      
      console.log('🔵 MessageService: getMessages called', { channelId, limit, cursor })
      
      // Use the database function for optimized pagination
      const { data: messages, error } = await supabase
        .rpc('get_messages_paginated', {
          p_channel_id: channelId,
          p_limit: limit,
          p_cursor: cursor
        })

      if (error) {
        console.error('🔴 MessageService: Error fetching messages:', error)
        throw error
      }

      console.log('🟢 MessageService: Messages fetched successfully', messages?.length || 0)

      // Transform the database response to our expected format
      const transformedMessages: MessageWithDetails[] = (messages || []).map((msg: SupabaseMessageResponse) => ({
        id: msg.id,
        channel_id: msg.channel_id,
        user_id: msg.user_id,
        content: msg.content,
        message_type: msg.message_type,
        metadata: msg.metadata,
        thread_id: msg.thread_id,
        is_pinned: msg.is_pinned,
        is_edited: msg.is_edited,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        deleted_at: msg.deleted_at,
        author: {
          id: msg.user_id,
          email: msg.author_email,
          role: msg.author_role
        },
        channel: {
          id: msg.channel_id,
          name: msg.channel_name
        },
        status: 'delivered' as const
      }))

      // Determine if there are more messages
      const hasMore = transformedMessages.length === limit
      const nextCursor = hasMore && transformedMessages.length > 0 
        ? transformedMessages[transformedMessages.length - 1].created_at
        : undefined

      return {
        messages: transformedMessages,
        hasMore,
        nextCursor
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      throw error
    }
  }

  /**
   * Send a new message
   */
  static async sendMessage(data: MessageFormData): Promise<MessageWithDetails> {
    try {
      console.log('🔵 MessageService: sendMessage called', data)
      
      const messageData: MessageInsert = {
        channel_id: data.channelId,
        content: data.content.trim(),
        message_type: data.messageType || 'text',
        metadata: data.metadata || {},
        thread_id: data.threadId || null,
        user_id: await this.getCurrentUserId()
      }

      console.log('🟡 MessageService: Inserting message data', messageData)

      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          author:users!messages_user_id_fkey(id, email, role),
          channel:channels!messages_channel_id_fkey(id, name)
        `)
        .single()

      if (error) {
        console.error('🔴 MessageService: Error sending message:', error)
        throw error
      }

      if (!newMessage) {
        throw new Error('Failed to send message')
      }

      console.log('🟢 MessageService: Message sent successfully', newMessage.id)

      // Transform response to match our expected format
      return {
        ...newMessage,
        author: newMessage.author,
        channel: newMessage.channel,
        status: 'sent'
      } as MessageWithDetails
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  /**
   * Update a message
   */
  static async updateMessage(messageId: string, content: string): Promise<Message> {
    try {
      console.log('🔵 MessageService: updateMessage called', { messageId, content })
      
      const { data: updatedMessage, error } = await supabase
        .from('messages')
        .update({ 
          content: content.trim(),
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select()
        .single()

      if (error) {
        console.error('🔴 MessageService: Error updating message:', error)
        throw error
      }

      if (!updatedMessage) {
        throw new Error('Message not found')
      }

      console.log('🟢 MessageService: Message updated successfully')
      return updatedMessage
    } catch (error) {
      console.error('Error updating message:', error)
      throw error
    }
  }

  /**
   * Soft delete a message
   */
  static async deleteMessage(messageId: string): Promise<void> {
    try {
      console.log('🔵 MessageService: deleteMessage called', messageId)
      
      const { error } = await supabase
        .from('messages')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)

      if (error) {
        console.error('🔴 MessageService: Error deleting message:', error)
        throw error
      }

      console.log('🟢 MessageService: Message deleted successfully')
    } catch (error) {
      console.error('Error deleting message:', error)
      throw error
    }
  }

  /**
   * Subscribe to real-time message updates for a channel
   */
  static subscribeToMessages(
    channelId: string,
    callback: (event: MessageEvent) => void
  ): () => void {
    console.log('🔔 MessageService: Subscribing to messages for channel', channelId)
    
    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          console.log('🔔 MessageService: Real-time message event received', payload)
          
          const messageEvent: MessageEvent = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as Message,
            old: payload.old as Message
          }

          callback(messageEvent)
        }
      )
      .subscribe()

    // Return unsubscribe function
    return () => {
      console.log('🔕 MessageService: Unsubscribing from messages for channel', channelId)
      subscription.unsubscribe()
    }
  }

  /**
   * Get message by ID
   */
  static async getMessage(messageId: string): Promise<MessageWithDetails | null> {
    try {
      console.log('🔵 MessageService: getMessage called', messageId)
      
      const { data: message, error } = await supabase
        .from('messages')
        .select(`
          *,
          author:users!messages_user_id_fkey(id, email, role),
          channel:channels!messages_channel_id_fkey(id, name)
        `)
        .eq('id', messageId)
        .is('deleted_at', null)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null
        }
        console.error('🔴 MessageService: Error fetching message:', error)
        throw error
      }

      if (!message) return null

      console.log('🟢 MessageService: Message fetched successfully')
      return {
        ...message,
        author: message.author,
        channel: message.channel,
        status: 'delivered'
      } as MessageWithDetails
    } catch (error) {
      console.error('Error fetching message:', error)
      throw error
    }
  }

  /**
   * Pin or unpin a message
   */
  static async toggleMessagePin(messageId: string, isPinned: boolean): Promise<Message> {
    try {
      console.log('🔵 MessageService: toggleMessagePin called', { messageId, isPinned })
      
      const { data: updatedMessage, error } = await supabase
        .from('messages')
        .update({ 
          is_pinned: isPinned,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select()
        .single()

      if (error) {
        console.error('🔴 MessageService: Error toggling message pin:', error)
        throw error
      }

      if (!updatedMessage) {
        throw new Error('Message not found')
      }

      console.log('🟢 MessageService: Message pin toggled successfully')
      return updatedMessage
    } catch (error) {
      console.error('Error toggling message pin:', error)
      throw error
    }
  }

  /**
   * Get channel message statistics
   */
  static async getChannelMessageStats(channelId: string): Promise<{
    total: number
    byType: Record<string, number>
    todayCount: number
    weekCount: number
  }> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('message_type, created_at')
        .eq('channel_id', channelId)
        .is('deleted_at', null)

      if (error) throw error

      const total = messages?.length || 0
      const byType = messages?.reduce((acc, msg) => {
        acc[msg.message_type] = (acc[msg.message_type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const todayCount = messages?.filter(msg => 
        new Date(msg.created_at) >= today
      ).length || 0

      const weekCount = messages?.filter(msg => 
        new Date(msg.created_at) >= weekAgo
      ).length || 0

      return { total, byType, todayCount, weekCount }
    } catch (error) {
      console.error('Error fetching channel message stats:', error)
      throw error
    }
  }

  /**
   * Search messages in a channel
   */
  static async searchMessages(
    channelId: string,
    query: string,
    limit: number = 20
  ): Promise<MessageWithDetails[]> {
    try {
      console.log('🔵 MessageService: searchMessages called', { channelId, query, limit })
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          author:users!messages_user_id_fkey(id, email, role),
          channel:channels!messages_channel_id_fkey(id, name)
        `)
        .eq('channel_id', channelId)
        .ilike('content', `%${query}%`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('🔴 MessageService: Error searching messages:', error)
        throw error
      }

      console.log('🟢 MessageService: Messages searched successfully', messages?.length || 0)

      return (messages || []).map(msg => ({
        ...msg,
        author: msg.author,
        channel: msg.channel,
        status: 'delivered' as const
      }))
    } catch (error) {
      console.error('Error searching messages:', error)
      throw error
    }
  }

  /**
   * Get current user ID from auth session
   */
  private static async getCurrentUserId(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      throw new Error('User not authenticated')
    }
    return session.user.id
  }
}