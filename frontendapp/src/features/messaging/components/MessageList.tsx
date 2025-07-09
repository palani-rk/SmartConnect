import React, { useEffect, useRef, useCallback, useState } from 'react'
import { FixedSizeList as List } from 'react-window'
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Alert,
  Divider,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { useAuthStore } from '@/stores/authStore'
import { useMessageStore } from '../stores/messageStore'
import MessageItem from './MessageItem'
import type { MessageWithDetails } from '../types/message'

interface MessageListProps {
  channelId: string
  height?: number
  onReply?: (messageId: string) => void
}

interface MessageRowProps {
  index: number
  style: React.CSSProperties
  data: {
    messages: MessageWithDetails[]
    currentUserId: string
    onEdit: (messageId: string) => void
    onDelete: (messageId: string) => void
    onReply: (messageId: string) => void
    onTogglePin: (messageId: string, isPinned: boolean) => void
    onRetry: (messageId: string) => void
  }
}

const MessageRow: React.FC<MessageRowProps> = ({ index, style, data }) => {
  const { messages, currentUserId, onEdit, onDelete, onReply, onTogglePin, onRetry } = data
  const message = messages[index]
  
  if (!message) return null

  const isOwnMessage = message.author.id === currentUserId
  
  // Show avatar only for first message in a group or different user
  const showAvatar = index === 0 || 
    messages[index - 1]?.author.id !== message.author.id

  return (
    <div style={style}>
      <MessageItem
        message={message}
        isOwnMessage={isOwnMessage}
        showAvatar={showAvatar}
        onEdit={onEdit}
        onDelete={onDelete}
        onReply={onReply}
        onTogglePin={onTogglePin}
        onRetry={onRetry}
      />
    </div>
  )
}

const MessageList: React.FC<MessageListProps> = ({
  channelId,
  height = 400,
  onReply,
}) => {
  const { user } = useAuthStore()
  const {
    messages,
    isLoading,
    hasMore,
    error,
    connectionStatus,
    loadMessages,
    loadMoreMessages,
    sendMessage,
    updateMessage,
    deleteMessage,
    subscribeToChannel,
    refreshMessages,
    clearError,
  } = useMessageStore()

  const listRef = useRef<List>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [replyToMessage, setReplyToMessage] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Load messages when channel changes
  useEffect(() => {
    if (channelId) {
      console.log('🔵 MessageList: Loading messages for channel', channelId)
      loadMessages(channelId)
    }
  }, [channelId, loadMessages])

  // Subscribe to real-time updates
  useEffect(() => {
    if (channelId) {
      console.log('🔔 MessageList: Subscribing to channel', channelId)
      const unsubscribe = subscribeToChannel(channelId)
      return unsubscribe
    }
  }, [channelId, subscribeToChannel])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && isAtBottom) {
      listRef.current?.scrollToItem(0, 'end')
    }
  }, [messages.length, isAtBottom])

  // Handle scroll to detect if user is at bottom
  const handleScroll = useCallback(({
    scrollOffset,
    scrollUpdateWasRequested,
  }: {
    scrollOffset: number
    scrollUpdateWasRequested: boolean
  }) => {
    if (!scrollUpdateWasRequested) {
      const threshold = 50
      const atBottom = scrollOffset <= threshold
      setIsAtBottom(atBottom)
      
      if (atBottom) {
        setUnreadCount(0)
      }
    }
  }, [])

  // Load more messages when scrolling to top
  const handleItemsRendered = useCallback(({
    visibleStartIndex,
    visibleStopIndex,
  }: {
    visibleStartIndex: number
    visibleStopIndex: number
  }) => {
    // Load more when approaching the end (top of the list)
    if (visibleStopIndex >= messages.length - 5 && hasMore && !isLoading && !isLoadingMore) {
      setIsLoadingMore(true)
      loadMoreMessages().finally(() => setIsLoadingMore(false))
    }
  }, [messages.length, hasMore, isLoading, isLoadingMore, loadMoreMessages])

  // Message action handlers
  const handleEdit = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    const newContent = prompt('Edit message:', message.content)
    if (newContent && newContent.trim() !== message.content) {
      try {
        await updateMessage(messageId, newContent.trim())
      } catch (error) {
        console.error('Failed to update message:', error)
      }
    }
  }, [messages, updateMessage])

  const handleDelete = useCallback(async (messageId: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteMessage(messageId)
      } catch (error) {
        console.error('Failed to delete message:', error)
      }
    }
  }, [deleteMessage])

  const handleReply = useCallback((messageId: string) => {
    setReplyToMessage(messageId)
    onReply?.(messageId)
  }, [onReply])

  const handleTogglePin = useCallback(async (messageId: string, isPinned: boolean) => {
    try {
      // TODO: Implement pin/unpin functionality
      console.log('Pin/unpin not implemented yet:', { messageId, isPinned })
    } catch (error) {
      console.error('Failed to toggle pin:', error)
    }
  }, [])

  const handleRetry = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    try {
      await sendMessage({
        content: message.content,
        channelId,
        messageType: message.message_type as any,
        threadId: message.thread_id || undefined,
      })
    } catch (error) {
      console.error('Failed to retry message:', error)
    }
  }, [messages, sendMessage, channelId])

  const handleScrollToBottom = () => {
    listRef.current?.scrollToItem(0, 'end')
    setIsAtBottom(true)
    setUnreadCount(0)
  }

  const handleRefresh = () => {
    refreshMessages(channelId)
  }

  if (!user) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Typography color="text.secondary">Please log in to view messages</Typography>
      </Box>
    )
  }

  // Prepare data for virtual list
  const listData = {
    messages: messages.slice().reverse(), // Reverse to show newest at bottom
    currentUserId: user.id,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onReply: handleReply,
    onTogglePin: handleTogglePin,
    onRetry: handleRetry,
  }

  return (
    <Paper
      elevation={1}
      sx={{
        height,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Messages
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Connection status */}
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: connectionStatus === 'connected' ? 'success.main' : 'error.main',
            }}
          />
          
          {/* Refresh button */}
          <Tooltip title="Refresh messages">
            <IconButton
              size="small"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={clearError}
          sx={{ m: 1 }}
        >
          {error}
        </Alert>
      )}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CircularProgress size={16} sx={{ mr: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Loading more messages...
          </Typography>
        </Box>
      )}

      {/* Messages List */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        {isLoading && messages.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Loading messages...
            </Typography>
          </Box>
        ) : messages.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2,
              p: 2,
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No messages yet
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Be the first to start the conversation in this channel!
            </Typography>
          </Box>
        ) : (
          <List
            ref={listRef}
            height={height - 60} // Subtract header height
            itemCount={messages.length}
            itemSize={100} // Approximate item height
            itemData={listData}
            onScroll={handleScroll}
            onItemsRendered={handleItemsRendered}
            style={{
              direction: 'ltr',
            }}
          >
            {MessageRow}
          </List>
        )}

        {/* Scroll to bottom button */}
        {!isAtBottom && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              zIndex: 1,
            }}
          >
            <Button
              variant="contained"
              size="small"
              onClick={handleScrollToBottom}
              startIcon={<KeyboardArrowDownIcon />}
              sx={{
                borderRadius: 2,
                boxShadow: 2,
              }}
            >
              {unreadCount > 0 ? `${unreadCount} new` : 'Scroll to bottom'}
            </Button>
          </Box>
        )}
      </Box>

      {/* Footer with load more */}
      {hasMore && !isLoading && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Button
            variant="text"
            size="small"
            onClick={loadMoreMessages}
            disabled={isLoadingMore}
            sx={{ color: 'text.secondary' }}
          >
            {isLoadingMore ? 'Loading...' : 'Load older messages'}
          </Button>
        </Box>
      )}
    </Paper>
  )
}

export default MessageList