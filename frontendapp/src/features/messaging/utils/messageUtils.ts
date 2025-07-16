import { format, isToday, isYesterday, isThisWeek, formatDistanceToNow } from 'date-fns'
import type { MessageWithDetails } from '../types/message'

/**
 * Format message timestamp for display
 */
export const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  
  if (isToday(date)) {
    return format(date, 'h:mm a')
  } else if (isYesterday(date)) {
    return `Yesterday ${format(date, 'h:mm a')}`
  } else if (isThisWeek(date)) {
    return format(date, 'EEE h:mm a')
  } else {
    return format(date, 'MMM d, h:mm a')
  }
}

/**
 * Format message timestamp for tooltips (more detailed)
 */
export const formatMessageTimeDetailed = (timestamp: string): string => {
  const date = new Date(timestamp)
  return format(date, 'EEEE, MMMM d, yyyy \'at\' h:mm a')
}

/**
 * Format relative time (e.g., "2 minutes ago")
 */
export const formatRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return formatDistanceToNow(date, { addSuffix: true })
}

/**
 * Group messages by date
 */
export const groupMessagesByDate = (messages: MessageWithDetails[]): Array<{
  date: string
  messages: MessageWithDetails[]
}> => {
  const groups: Record<string, MessageWithDetails[]> = {}
  
  messages.forEach(message => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
  })
  
  return Object.entries(groups).map(([date, messages]) => ({
    date,
    messages: messages.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
  }))
}

/**
 * Format date for date separators
 */
export const formatDateSeparator = (date: string): string => {
  const dateObj = new Date(date)
  
  if (isToday(dateObj)) {
    return 'Today'
  } else if (isYesterday(dateObj)) {
    return 'Yesterday'
  } else {
    return format(dateObj, 'EEEE, MMMM d, yyyy')
  }
}

/**
 * Check if two messages should be grouped together
 */
export const shouldGroupMessages = (
  message1: MessageWithDetails,
  message2: MessageWithDetails,
  maxTimeGap: number = 5 * 60 * 1000 // 5 minutes in milliseconds
): boolean => {
  if (message1.author.id !== message2.author.id) {
    return false
  }
  
  const time1 = new Date(message1.created_at).getTime()
  const time2 = new Date(message2.created_at).getTime()
  
  return Math.abs(time1 - time2) <= maxTimeGap
}

/**
 * Extract text content from message (for search/preview)
 */
export const extractTextContent = (message: MessageWithDetails): string => {
  // For now, just return the content as-is
  // In the future, this could handle rich text, markdown, etc.
  return message.content.trim()
}

/**
 * Check if message contains mentions
 */
export const extractMentions = (content: string): string[] => {
  const mentionRegex = /@([a-zA-Z0-9._-]+)/g
  const mentions: string[] = []
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1])
  }

  return mentions
}

/**
 * Highlight mentions in message content
 */
export const highlightMentions = (content: string, currentUserId: string): string => {
  return content.replace(/@([a-zA-Z0-9._-]+)/g, (match, username) => {
    const isCurrentUser = username === currentUserId
    return `<span class="mention ${isCurrentUser ? 'mention-self' : ''}">${match}</span>`
  })
}

/**
 * Get message preview (truncated content)
 */
export const getMessagePreview = (message: MessageWithDetails, maxLength: number = 100): string => {
  const content = extractTextContent(message)
  
  if (content.length <= maxLength) {
    return content
  }
  
  return content.substring(0, maxLength).trim() + '...'
}

/**
 * Check if message is from current user
 */
export const isOwnMessage = (message: MessageWithDetails, currentUserId: string): boolean => {
  return message.author.id === currentUserId
}

/**
 * Get message status icon props
 */
export const getMessageStatusIcon = (message: MessageWithDetails): {
  icon: string
  color: string
  tooltip: string
} | null => {
  if (!message.isOptimistic) {
    return null
  }
  
  switch (message.status) {
    case 'sending':
      return {
        icon: 'schedule',
        color: 'text.secondary',
        tooltip: 'Sending...',
      }
    case 'sent':
      return {
        icon: 'check_circle',
        color: 'success.main',
        tooltip: 'Sent',
      }
    case 'delivered':
      return {
        icon: 'done_all',
        color: 'success.main',
        tooltip: 'Delivered',
      }
    case 'failed':
      return {
        icon: 'error',
        color: 'error.main',
        tooltip: 'Failed to send',
      }
    default:
      return null
  }
}

/**
 * Generate unique temporary ID for optimistic messages
 */
export const generateTempMessageId = (): string => {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Check if message is a thread reply
 */
export const isThreadReply = (message: MessageWithDetails): boolean => {
  return message.thread_id !== null
}

/**
 * Format message search results
 */
export const formatSearchResult = (
  message: MessageWithDetails,
  searchTerm: string
): {
  preview: string
  highlightedPreview: string
} => {
  const content = extractTextContent(message)
  const lowerContent = content.toLowerCase()
  const lowerSearchTerm = searchTerm.toLowerCase()
  
  const index = lowerContent.indexOf(lowerSearchTerm)
  if (index === -1) {
    return {
      preview: getMessagePreview(message),
      highlightedPreview: getMessagePreview(message),
    }
  }
  
  const start = Math.max(0, index - 50)
  const end = Math.min(content.length, index + searchTerm.length + 50)
  const preview = content.substring(start, end)
  
  const highlightedPreview = preview.replace(
    new RegExp(`(${searchTerm})`, 'gi'),
    '<mark>$1</mark>'
  )
  
  return {
    preview: start > 0 ? '...' + preview : preview,
    highlightedPreview: start > 0 ? '...' + highlightedPreview : highlightedPreview,
  }
}

/**
 * Validate message content
 */
export const validateMessageContent = (content: string): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []
  
  if (!content.trim()) {
    errors.push('Message cannot be empty')
  }
  
  if (content.length > 2000) {
    errors.push('Message is too long (maximum 2000 characters)')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}