import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMessageStore } from '../stores/messageStore'
import { MessageService } from '../services/messageService'
import type { MessageWithDetails, MessageFormData } from '../types/message'

// Mock the MessageService
vi.mock('../services/messageService', () => ({
  MessageService: {
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    updateMessage: vi.fn(),
    deleteMessage: vi.fn(),
    subscribeToMessages: vi.fn(),
  },
}))

describe('MessageStore', () => {
  const mockChannelId = 'test-channel-id'
  const mockMessages: MessageWithDetails[] = [
    {
      id: 'msg-1',
      channel_id: mockChannelId,
      user_id: 'user-1',
      content: 'Test message 1',
      message_type: 'text',
      metadata: {},
      thread_id: null,
      is_pinned: false,
      is_edited: false,
      created_at: '2023-01-01T10:00:00Z',
      updated_at: '2023-01-01T10:00:00Z',
      deleted_at: null,
      author: {
        id: 'user-1',
        email: 'user1@example.com',
        role: 'member',
      },
      channel: {
        id: mockChannelId,
        name: 'test-channel',
      },
      status: 'delivered',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useMessageStore.getState().reset()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useMessageStore())
      
      expect(result.current.messages).toEqual([])
      expect(result.current.selectedChannel).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSending).toBe(false)
      expect(result.current.hasMore).toBe(true)
      expect(result.current.error).toBeNull()
      expect(result.current.connectionStatus).toBe('disconnected')
    })
  })

  describe('setSelectedChannel', () => {
    it('should set selected channel', () => {
      const { result } = renderHook(() => useMessageStore())
      
      act(() => {
        result.current.setSelectedChannel(mockChannelId)
      })
      
      expect(result.current.selectedChannel).toBe(mockChannelId)
    })
  })

  describe('loadMessages', () => {
    it('should load messages successfully', async () => {
      const mockResponse = {
        messages: mockMessages,
        hasMore: false,
        nextCursor: undefined,
      }
      
      vi.mocked(MessageService.getMessages).mockResolvedValue(mockResponse)
      
      const { result } = renderHook(() => useMessageStore())
      
      await act(async () => {
        await result.current.loadMessages(mockChannelId)
      })
      
      expect(MessageService.getMessages).toHaveBeenCalledWith({
        channelId: mockChannelId,
        cursor: undefined,
        limit: 50,
      })
      expect(result.current.messages).toEqual(mockMessages)
      expect(result.current.hasMore).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.selectedChannel).toBe(mockChannelId)
    })

    it('should handle loading errors', async () => {
      const mockError = new Error('Failed to load messages')
      vi.mocked(MessageService.getMessages).mockRejectedValue(mockError)
      
      const { result } = renderHook(() => useMessageStore())
      
      await act(async () => {
        try {
          await result.current.loadMessages(mockChannelId)
        } catch (error) {
          // Expected to throw
        }
      })
      
      expect(result.current.error).toBe('Failed to load messages')
      expect(result.current.isLoading).toBe(false)
    })

    it('should reset messages when loading new channel', async () => {
      const { result } = renderHook(() => useMessageStore())
      
      // Set initial messages for different channel
      act(() => {
        result.current.setSelectedChannel('other-channel')
        result.current.addOptimisticMessage(mockMessages[0])
      })
      
      expect(result.current.messages).toHaveLength(1)
      
      // Load messages for new channel
      const mockResponse = {
        messages: [],
        hasMore: false,
        nextCursor: undefined,
      }
      
      vi.mocked(MessageService.getMessages).mockResolvedValue(mockResponse)
      
      await act(async () => {
        await result.current.loadMessages(mockChannelId)
      })
      
      expect(result.current.messages).toEqual([])
      expect(result.current.selectedChannel).toBe(mockChannelId)
    })
  })

  describe('sendMessage', () => {
    it('should send message with optimistic update', async () => {
      const mockMessageData: MessageFormData = {
        channelId: mockChannelId,
        content: 'New message',
        messageType: 'text',
      }
      
      const mockSentMessage: MessageWithDetails = {
        ...mockMessages[0],
        id: 'sent-msg-id',
        content: 'New message',
        status: 'sent',
      }
      
      vi.mocked(MessageService.sendMessage).mockResolvedValue(mockSentMessage)
      
      const { result } = renderHook(() => useMessageStore())
      
      await act(async () => {
        await result.current.sendMessage(mockMessageData)
      })
      
      expect(MessageService.sendMessage).toHaveBeenCalledWith(mockMessageData)
      expect(result.current.isSending).toBe(false)
      
      // Should have optimistic message that gets updated
      const sentMessage = result.current.messages.find(msg => msg.id === 'sent-msg-id')
      expect(sentMessage).toBeDefined()
      expect(sentMessage?.status).toBe('sent')
    })

    it('should handle send message errors', async () => {
      const mockMessageData: MessageFormData = {
        channelId: mockChannelId,
        content: 'New message',
        messageType: 'text',
      }
      
      const mockError = new Error('Failed to send message')
      vi.mocked(MessageService.sendMessage).mockRejectedValue(mockError)
      
      const { result } = renderHook(() => useMessageStore())
      
      await act(async () => {
        try {
          await result.current.sendMessage(mockMessageData)
        } catch (error) {
          // Expected to throw
        }
      })
      
      expect(result.current.error).toBe('Failed to send message')
      expect(result.current.isSending).toBe(false)
      
      // Should have optimistic message with failed status
      const failedMessage = result.current.messages.find(msg => msg.status === 'failed')
      expect(failedMessage).toBeDefined()
    })
  })

  describe('updateMessage', () => {
    it('should update message successfully', async () => {
      const mockUpdatedMessage = {
        ...mockMessages[0],
        content: 'Updated content',
        is_edited: true,
      }
      
      vi.mocked(MessageService.updateMessage).mockResolvedValue(mockUpdatedMessage)
      
      const { result } = renderHook(() => useMessageStore())
      
      // Add initial message
      act(() => {
        result.current.addOptimisticMessage(mockMessages[0])
      })
      
      await act(async () => {
        await result.current.updateMessage('msg-1', 'Updated content')
      })
      
      expect(MessageService.updateMessage).toHaveBeenCalledWith('msg-1', 'Updated content')
      
      const updatedMessage = result.current.messages.find(msg => msg.id === 'msg-1')
      expect(updatedMessage?.content).toBe('Updated content')
      expect(updatedMessage?.is_edited).toBe(true)
    })
  })

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      vi.mocked(MessageService.deleteMessage).mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useMessageStore())
      
      // Add initial message
      act(() => {
        result.current.addOptimisticMessage(mockMessages[0])
      })
      
      expect(result.current.messages).toHaveLength(1)
      
      await act(async () => {
        await result.current.deleteMessage('msg-1')
      })
      
      expect(MessageService.deleteMessage).toHaveBeenCalledWith('msg-1')
      expect(result.current.messages).toHaveLength(0)
    })
  })

  describe('subscribeToChannel', () => {
    it('should subscribe to channel messages', () => {
      const mockUnsubscribe = vi.fn()
      vi.mocked(MessageService.subscribeToMessages).mockReturnValue(mockUnsubscribe)
      
      const { result } = renderHook(() => useMessageStore())
      
      const unsubscribe = result.current.subscribeToChannel(mockChannelId)
      
      expect(MessageService.subscribeToMessages).toHaveBeenCalledWith(
        mockChannelId,
        expect.any(Function)
      )
      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('handleRealtimeMessage', () => {
    it('should handle INSERT events', () => {
      const { result } = renderHook(() => useMessageStore())
      
      // Set selected channel
      act(() => {
        result.current.setSelectedChannel(mockChannelId)
      })
      
      const newMessage = {
        ...mockMessages[0],
        id: 'new-msg-id',
        content: 'New real-time message',
      }
      
      act(() => {
        result.current.handleRealtimeMessage({
          eventType: 'INSERT',
          new: newMessage,
        })
      })
      
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].id).toBe('new-msg-id')
    })

    it('should handle UPDATE events', () => {
      const { result } = renderHook(() => useMessageStore())
      
      // Set selected channel and add initial message
      act(() => {
        result.current.setSelectedChannel(mockChannelId)
        result.current.addOptimisticMessage(mockMessages[0])
      })
      
      const updatedMessage = {
        ...mockMessages[0],
        content: 'Updated via real-time',
        is_edited: true,
      }
      
      act(() => {
        result.current.handleRealtimeMessage({
          eventType: 'UPDATE',
          new: updatedMessage,
        })
      })
      
      expect(result.current.messages[0].content).toBe('Updated via real-time')
      expect(result.current.messages[0].is_edited).toBe(true)
    })

    it('should handle DELETE events', () => {
      const { result } = renderHook(() => useMessageStore())
      
      // Set selected channel and add initial message
      act(() => {
        result.current.setSelectedChannel(mockChannelId)
        result.current.addOptimisticMessage(mockMessages[0])
      })
      
      expect(result.current.messages).toHaveLength(1)
      
      act(() => {
        result.current.handleRealtimeMessage({
          eventType: 'DELETE',
          new: mockMessages[0],
        })
      })
      
      expect(result.current.messages).toHaveLength(0)
    })

    it('should ignore events from other channels', () => {
      const { result } = renderHook(() => useMessageStore())
      
      // Set selected channel
      act(() => {
        result.current.setSelectedChannel(mockChannelId)
      })
      
      const otherChannelMessage = {
        ...mockMessages[0],
        channel_id: 'other-channel-id',
      }
      
      act(() => {
        result.current.handleRealtimeMessage({
          eventType: 'INSERT',
          new: otherChannelMessage,
        })
      })
      
      expect(result.current.messages).toHaveLength(0)
    })
  })

  describe('Optimistic Updates', () => {
    it('should add optimistic message', () => {
      const { result } = renderHook(() => useMessageStore())
      
      act(() => {
        result.current.addOptimisticMessage(mockMessages[0])
      })
      
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0]).toEqual(mockMessages[0])
    })

    it('should update optimistic message', () => {
      const { result } = renderHook(() => useMessageStore())
      
      // Add optimistic message
      act(() => {
        result.current.addOptimisticMessage(mockMessages[0])
      })
      
      const updatedMessage = {
        ...mockMessages[0],
        content: 'Updated optimistic message',
      }
      
      // Update optimistic message
      act(() => {
        result.current.updateOptimisticMessage('msg-1', updatedMessage)
      })
      
      expect(result.current.messages[0].content).toBe('Updated optimistic message')
    })

    it('should remove optimistic message', () => {
      const { result } = renderHook(() => useMessageStore())
      
      // Add optimistic message
      act(() => {
        result.current.addOptimisticMessage(mockMessages[0])
      })
      
      expect(result.current.messages).toHaveLength(1)
      
      // Remove optimistic message
      act(() => {
        result.current.removeOptimisticMessage('msg-1')
      })
      
      expect(result.current.messages).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('should set and clear errors', () => {
      const { result } = renderHook(() => useMessageStore())
      
      act(() => {
        result.current.setError('Test error')
      })
      
      expect(result.current.error).toBe('Test error')
      
      act(() => {
        result.current.clearError()
      })
      
      expect(result.current.error).toBeNull()
    })
  })

  describe('Reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useMessageStore())
      
      // Modify state
      act(() => {
        result.current.setSelectedChannel(mockChannelId)
        result.current.addOptimisticMessage(mockMessages[0])
        result.current.setError('Test error')
        result.current.setConnectionStatus('connected')
      })
      
      // Reset
      act(() => {
        result.current.reset()
      })
      
      expect(result.current.messages).toEqual([])
      expect(result.current.selectedChannel).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSending).toBe(false)
      expect(result.current.hasMore).toBe(true)
      expect(result.current.error).toBeNull()
      expect(result.current.connectionStatus).toBe('disconnected')
    })
  })
})