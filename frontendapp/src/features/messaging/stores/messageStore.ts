import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { MessageService } from '../services/messageService'
import type { 
  MessageWithDetails,
  MessageFormData,
  MessagePaginationParams,
  MessageStatus,
  ConnectionStatus,
  MessageEvent
} from '../types/message'

interface MessageState {
  // State
  messages: MessageWithDetails[]
  selectedChannel: string | null
  isLoading: boolean
  isSending: boolean
  hasMore: boolean
  error: string | null
  connectionStatus: ConnectionStatus
  nextCursor?: string

  // Actions
  setSelectedChannel: (channelId: string | null) => void
  setError: (error: string | null) => void
  clearError: () => void
  setConnectionStatus: (status: ConnectionStatus) => void

  // Message operations
  loadMessages: (channelId: string, cursor?: string) => Promise<void>
  loadMoreMessages: () => Promise<void>
  sendMessage: (data: MessageFormData) => Promise<void>
  updateMessage: (messageId: string, content: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  
  // Real-time operations
  subscribeToChannel: (channelId: string) => () => void
  handleRealtimeMessage: (event: MessageEvent) => void
  
  // Optimistic updates
  addOptimisticMessage: (message: MessageWithDetails) => void
  updateOptimisticMessage: (tempId: string, message: MessageWithDetails) => void
  removeOptimisticMessage: (tempId: string) => void
  
  // Utility actions
  clearMessages: () => void
  refreshMessages: (channelId: string) => Promise<void>
  reset: () => void
}

export const useMessageStore = create<MessageState>()(
  devtools(
    (set, get) => ({
      // Initial state
      messages: [],
      selectedChannel: null,
      isLoading: false,
      isSending: false,
      hasMore: true,
      error: null,
      connectionStatus: 'disconnected',
      nextCursor: undefined,

      // Synchronous actions
      setSelectedChannel: (channelId) => 
        set({ selectedChannel: channelId }, false, 'setSelectedChannel'),

      setError: (error) => 
        set({ error }, false, 'setError'),

      clearError: () => 
        set({ error: null }, false, 'clearError'),

      setConnectionStatus: (status) => 
        set({ connectionStatus: status }, false, 'setConnectionStatus'),

      // Message operations
      loadMessages: async (channelId: string, cursor?: string) => {
        // If loading new channel, reset state
        if (channelId !== get().selectedChannel) {
          set({ 
            messages: [], 
            selectedChannel: channelId, 
            hasMore: true,
            nextCursor: undefined 
          }, false, 'loadMessages:newChannel')
        }

        set({ isLoading: true, error: null }, false, 'loadMessages:start')
        
        try {
          const response = await MessageService.getMessages({
            channelId,
            cursor,
            limit: 50
          })
          
          const currentMessages = get().messages
          const newMessages = cursor 
            ? [...currentMessages, ...response.messages]
            : response.messages

          set({ 
            messages: newMessages,
            hasMore: response.hasMore,
            nextCursor: response.nextCursor,
            isLoading: false 
          }, false, 'loadMessages:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load messages'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'loadMessages:error')
          throw error
        }
      },

      loadMoreMessages: async () => {
        const { selectedChannel, nextCursor, hasMore, isLoading } = get()
        
        if (!selectedChannel || !hasMore || isLoading) return
        
        await get().loadMessages(selectedChannel, nextCursor)
      },

      sendMessage: async (data: MessageFormData) => {
        set({ isSending: true, error: null }, false, 'sendMessage:start')
        
        try {
          // Create optimistic message
          const tempId = `temp-${Date.now()}`
          const optimisticMessage: MessageWithDetails = {
            id: tempId,
            channel_id: data.channelId,
            user_id: 'current-user', // This should come from auth store
            content: data.content,
            message_type: data.messageType || 'text',
            metadata: data.metadata || {},
            thread_id: data.threadId || null,
            is_pinned: false,
            is_edited: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            author: {
              id: 'current-user',
              email: 'current@user.com', // This should come from auth store
              role: 'member'
            },
            channel: {
              id: data.channelId,
              name: 'Current Channel' // This should come from channel store
            },
            status: 'sending',
            isOptimistic: true
          }

          // Add optimistic message to UI
          get().addOptimisticMessage(optimisticMessage)

          // Send message to server
          const sentMessage = await MessageService.sendMessage(data)
          
          // Update optimistic message with server response
          get().updateOptimisticMessage(tempId, {
            ...sentMessage,
            status: 'sent'
          })

          set({ isSending: false }, false, 'sendMessage:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
          
          // Update optimistic message status to failed
          set((state) => ({
            messages: state.messages.map(msg => 
              msg.id.startsWith('temp-') && msg.isOptimistic 
                ? { ...msg, status: 'failed' as MessageStatus }
                : msg
            ),
            error: errorMessage,
            isSending: false
          }), false, 'sendMessage:error')
          
          throw error
        }
      },

      updateMessage: async (messageId: string, content: string) => {
        set({ error: null }, false, 'updateMessage:start')
        
        try {
          const updatedMessage = await MessageService.updateMessage(messageId, content)
          
          // Optimistically update the message
          set((state) => ({
            messages: state.messages.map(msg => 
              msg.id === messageId 
                ? { ...msg, ...updatedMessage, is_edited: true }
                : msg
            )
          }), false, 'updateMessage:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update message'
          set({ error: errorMessage }, false, 'updateMessage:error')
          throw error
        }
      },

      deleteMessage: async (messageId: string) => {
        set({ error: null }, false, 'deleteMessage:start')
        
        try {
          await MessageService.deleteMessage(messageId)
          
          // Optimistically remove the message
          set((state) => ({
            messages: state.messages.filter(msg => msg.id !== messageId)
          }), false, 'deleteMessage:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete message'
          set({ error: errorMessage }, false, 'deleteMessage:error')
          throw error
        }
      },

      // Real-time operations
      subscribeToChannel: (channelId: string) => {
        console.log('🔔 Subscribing to channel:', channelId)
        
        return MessageService.subscribeToMessages(channelId, (event) => {
          get().handleRealtimeMessage(event)
        })
      },

      handleRealtimeMessage: (event: MessageEvent) => {
        console.log('🔔 Received real-time message event:', event.eventType)
        
        const { selectedChannel } = get()
        
        // Only handle events for the currently selected channel
        if (event.new.channel_id !== selectedChannel) return

        switch (event.eventType) {
          case 'INSERT':
            // Don't add if it's our own optimistic message
            set((state) => {
              const existingOptimistic = state.messages.find(msg => 
                msg.content === event.new.content && 
                msg.isOptimistic
              )
              
              if (existingOptimistic) {
                // Update optimistic message with real data
                return {
                  messages: state.messages.map(msg => 
                    msg.id === existingOptimistic.id 
                      ? { ...event.new as MessageWithDetails, status: 'delivered' }
                      : msg
                  )
                }
              } else {
                // Add new message from other users
                return {
                  messages: [event.new as MessageWithDetails, ...state.messages]
                }
              }
            })
            break

          case 'UPDATE':
            set((state) => ({
              messages: state.messages.map(msg => 
                msg.id === event.new.id 
                  ? { ...msg, ...event.new, is_edited: true }
                  : msg
              )
            }))
            break

          case 'DELETE':
            set((state) => ({
              messages: state.messages.filter(msg => msg.id !== event.new.id)
            }))
            break
        }
      },

      // Optimistic updates
      addOptimisticMessage: (message: MessageWithDetails) => {
        set((state) => ({
          messages: [message, ...state.messages]
        }), false, 'addOptimisticMessage')
      },

      updateOptimisticMessage: (tempId: string, message: MessageWithDetails) => {
        set((state) => ({
          messages: state.messages.map(msg => 
            msg.id === tempId ? message : msg
          )
        }), false, 'updateOptimisticMessage')
      },

      removeOptimisticMessage: (tempId: string) => {
        set((state) => ({
          messages: state.messages.filter(msg => msg.id !== tempId)
        }), false, 'removeOptimisticMessage')
      },

      // Utility actions
      clearMessages: () => 
        set({ messages: [] }, false, 'clearMessages'),

      refreshMessages: async (channelId: string) => {
        await get().loadMessages(channelId)
      },

      reset: () => 
        set({
          messages: [],
          selectedChannel: null,
          isLoading: false,
          isSending: false,
          hasMore: true,
          error: null,
          connectionStatus: 'disconnected',
          nextCursor: undefined
        }, false, 'reset')
    }),
    {
      name: 'message-store',
    }
  )
)