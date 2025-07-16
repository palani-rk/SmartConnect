import { useEffect, useCallback, useState } from 'react'
import { useMessageStore } from '../stores/messageStore'
import type { MessageEvent } from '../types/message'

interface UseRealTimeMessagesProps {
  channelId: string
  enabled?: boolean
  onMessageReceived?: (event: MessageEvent) => void
  onConnectionChange?: (status: 'connected' | 'disconnected' | 'reconnecting') => void
}

interface UseRealTimeMessagesReturn {
  isConnected: boolean
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  lastMessage: MessageEvent | null
  
  // Actions
  connect: () => void
  disconnect: () => void
  reconnect: () => void
}

export const useRealTimeMessages = ({
  channelId,
  enabled = true,
  onMessageReceived,
  onConnectionChange,
}: UseRealTimeMessagesProps): UseRealTimeMessagesReturn => {
  const {
    connectionStatus,
    subscribeToChannel,
    setConnectionStatus,
  } = useMessageStore()

  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null)
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null)

  // Handle message events
  const handleMessageEvent = useCallback((event: MessageEvent) => {
    console.log('🔔 useRealTimeMessages: Message event received', event)
    setLastMessage(event)
    onMessageReceived?.(event)
  }, [onMessageReceived])

  // Connect to real-time messages
  const connect = useCallback(() => {
    if (!channelId || unsubscribe) return
    
    console.log('🔔 useRealTimeMessages: Connecting to channel', channelId)
    setConnectionStatus('connecting' as any)
    
    try {
      const unsub = subscribeToChannel(channelId)
      setUnsubscribe(() => unsub)
      setConnectionStatus('connected')
      
      console.log('🟢 useRealTimeMessages: Connected to channel', channelId)
    } catch (error) {
      console.error('🔴 useRealTimeMessages: Failed to connect:', error)
      setConnectionStatus('disconnected')
    }
  }, [channelId, subscribeToChannel, setConnectionStatus, unsubscribe])

  // Disconnect from real-time messages
  const disconnect = useCallback(() => {
    if (unsubscribe) {
      console.log('🔕 useRealTimeMessages: Disconnecting from channel', channelId)
      unsubscribe()
      setUnsubscribe(null)
      setConnectionStatus('disconnected')
    }
  }, [unsubscribe, setConnectionStatus, channelId])

  // Reconnect to real-time messages
  const reconnect = useCallback(() => {
    console.log('🔄 useRealTimeMessages: Reconnecting to channel', channelId)
    disconnect()
    
    setTimeout(() => {
      connect()
    }, 1000) // Brief delay before reconnecting
  }, [disconnect, connect, channelId])

  // Auto-connect when enabled
  useEffect(() => {
    if (enabled && channelId && !unsubscribe) {
      connect()
    }
    
    return () => {
      if (unsubscribe) {
        disconnect()
      }
    }
  }, [enabled, channelId, connect, disconnect, unsubscribe])

  // Notify connection status changes
  useEffect(() => {
    onConnectionChange?.(connectionStatus)
  }, [connectionStatus, onConnectionChange])

  // Auto-reconnect on connection loss
  useEffect(() => {
    if (connectionStatus === 'disconnected' && enabled && channelId) {
      console.log('🔄 useRealTimeMessages: Auto-reconnecting due to connection loss')
      const timeout = setTimeout(() => {
        setConnectionStatus('reconnecting')
        reconnect()
      }, 3000) // Wait 3 seconds before reconnecting
      
      return () => clearTimeout(timeout)
    }
  }, [connectionStatus, enabled, channelId, reconnect, setConnectionStatus])

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    lastMessage,
    
    // Actions
    connect,
    disconnect,
    reconnect,
  }
}