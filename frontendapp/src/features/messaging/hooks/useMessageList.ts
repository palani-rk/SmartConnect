import { useEffect, useCallback, useState } from 'react'
import { useMessageStore } from '../stores/messageStore'
import { useAuthStore } from '@/stores/authStore'
import type { MessageFormData } from '../types/message'

interface UseMessageListProps {
  channelId: string
  autoLoad?: boolean
  pageSize?: number
}

interface UseMessageListReturn {
  messages: any[]
  isLoading: boolean
  isSending: boolean
  hasMore: boolean
  error: string | null
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  
  // Actions
  loadMessages: () => Promise<void>
  loadMoreMessages: () => Promise<void>
  sendMessage: (content: string, threadId?: string) => Promise<void>
  updateMessage: (messageId: string, content: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  refreshMessages: () => Promise<void>
  clearError: () => void
  
}

export const useMessageList = ({
  channelId,
  autoLoad = true,
  pageSize = 50,
}: UseMessageListProps): UseMessageListReturn => {
  const { user } = useAuthStore()
  const {
    messages,
    isLoading,
    isSending,
    hasMore,
    error,
    connectionStatus,
    loadMessages: storeLoadMessages,
    loadMoreMessages: storeLoadMoreMessages,
    sendMessage: storeSendMessage,
    updateMessage: storeUpdateMessage,
    deleteMessage: storeDeleteMessage,
    refreshMessages: storeRefreshMessages,
    subscribeToChannel,
    clearError: storeClearError,
    setSelectedChannel,
  } = useMessageStore()

  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize channel selection
  useEffect(() => {
    if (channelId) {
      setSelectedChannel(channelId)
      setIsInitialized(true)
    }
  }, [channelId, setSelectedChannel])

  // Auto-load messages
  useEffect(() => {
    if (autoLoad && channelId && isInitialized) {
      console.log('🔵 useMessageList: Auto-loading messages for channel', channelId)
      loadMessages()
    }
  }, [autoLoad, channelId, isInitialized])

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!channelId) return
    
    try {
      await storeLoadMessages(channelId)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }, [channelId, storeLoadMessages])

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!channelId || !hasMore) return
    
    try {
      await storeLoadMoreMessages()
    } catch (error) {
      console.error('Failed to load more messages:', error)
    }
  }, [channelId, hasMore, storeLoadMoreMessages])

  // Send message
  const sendMessage = useCallback(async (content: string, threadId?: string) => {
    if (!channelId || !user?.id) {
      throw new Error('Channel ID and user are required')
    }
    
    const messageData: MessageFormData = {
      content: content.trim(),
      channelId,
      messageType: 'text',
      ...(threadId && { threadId }),
    }
    
    try {
      await storeSendMessage(messageData)
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }, [channelId, user?.id, storeSendMessage])

  // Update message
  const updateMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await storeUpdateMessage(messageId, content)
    } catch (error) {
      console.error('Failed to update message:', error)
      throw error
    }
  }, [storeUpdateMessage])

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await storeDeleteMessage(messageId)
    } catch (error) {
      console.error('Failed to delete message:', error)
      throw error
    }
  }, [storeDeleteMessage])

  // Refresh messages
  const refreshMessages = useCallback(async () => {
    if (!channelId) return
    
    try {
      await storeRefreshMessages(channelId)
    } catch (error) {
      console.error('Failed to refresh messages:', error)
    }
  }, [channelId, storeRefreshMessages])

  // Clear error
  const clearError = useCallback(() => {
    storeClearError()
  }, [storeClearError])


  return {
    messages,
    isLoading,
    isSending,
    hasMore,
    error,
    connectionStatus,
    
    // Actions
    loadMessages,
    loadMoreMessages,
    sendMessage,
    updateMessage,
    deleteMessage,
    refreshMessages,
    clearError,
  }
}