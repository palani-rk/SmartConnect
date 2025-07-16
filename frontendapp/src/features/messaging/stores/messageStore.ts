import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { MessageService } from '../services/messageService'
import { useAuthStore } from '@/stores/authStore'
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
  shouldAutoScroll: boolean
  nextCursor?: string

  // Actions
  setSelectedChannel: (channelId: string | null) => void
  setError: (error: string | null) => void
  clearError: () => void
  setConnectionStatus: (status: ConnectionStatus) => void
  setShouldAutoScroll: (shouldScroll: boolean) => void

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
      shouldAutoScroll: false,
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

      setShouldAutoScroll: (shouldScroll) => 
        set({ shouldAutoScroll: shouldScroll }, false, 'setShouldAutoScroll'),

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
          // Get current user from auth store
          const currentUser = useAuthStore.getState().user
          if (!currentUser) {
            throw new Error('User not authenticated')
          }

          // Create optimistic message
          const tempId = `temp-${Date.now()}`
          const optimisticMessage: MessageWithDetails = {
            id: tempId,
            channel_id: data.channelId,
            user_id: currentUser.id,
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
              id: currentUser.id,
              email: currentUser.email,
              role: currentUser.role
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
          
          // Set auto-scroll flag for user's own message
          set({ shouldAutoScroll: true }, false, 'sendMessage:autoScroll')

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
        
        return MessageService.subscribeToMessages(
          channelId, 
          (event) => {
            get().handleRealtimeMessage(event)
          },
          (status) => {
            console.log('🔔 Connection status changed to:', status)
            get().setConnectionStatus(status)
          }
        )
      },

      handleRealtimeMessage: (event: MessageEvent) => {
        console.log('🔔 Received real-time message event:', event.eventType)
        
        const { selectedChannel } = get()
        
        // Only handle events for the currently selected channel
        if (event.new.channel_id !== selectedChannel) return

        // Get current user ID for deduplication
        const currentUser = useAuthStore.getState().user
        const currentUserId = currentUser?.id

        switch (event.eventType) {
          case 'INSERT':
            set((state) => {
              const isOwnMessage = event.new.user_id === currentUserId
              
              if (isOwnMessage) {
                // Check for optimistic message to replace
                const optimisticIndex = state.messages.findIndex(msg => 
                  msg.isOptimistic && msg.content === event.new.content
                )
                
                if (optimisticIndex >= 0) {
                  // Replace optimistic with real message
                  console.log('🔄 Replacing optimistic message with real message')
                  return {
                    messages: state.messages.map((msg, index) => 
                      index === optimisticIndex 
                        ? { ...event.new as MessageWithDetails, status: 'delivered' }
                        : msg
                    ),
                    shouldAutoScroll: true // Auto-scroll for user's own message
                  }
                }
                
                // Check if message already exists (prevent duplicates)
                const existingMessage = state.messages.find(msg => msg.id === event.new.id)
                if (existingMessage) {
                  console.log('🚫 Message already exists, skipping duplicate')
                  return state // Don't add duplicate
                }
                
                // Edge case: user's message without optimistic update
                console.log('⚠️ User message without optimistic update')
                return {
                  messages: [event.new as MessageWithDetails, ...state.messages],
                  shouldAutoScroll: true
                }
              } else {
                // Add new message from other users
                console.log('📥 Adding message from other user')
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
          shouldAutoScroll: false,
          nextCursor: undefined
        }, false, 'reset')
    }),
    {
      name: 'message-store',
    }
  )
)