import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MessageService } from '@/features/messaging/services/messageService'
import { supabase } from '@/services/supabase'
import type { MessageFormData } from '@/features/messaging/types/message'

// Mock supabase client
vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  },
}))

describe('MessageService Integration Tests', () => {
  const mockChannelId = 'test-channel-id'
  const mockUserId = 'test-user-id'
  const mockMessages = [
    {
      id: 'msg-1',
      channel_id: mockChannelId,
      user_id: mockUserId,
      content: 'Test message 1',
      message_type: 'text',
      metadata: {},
      thread_id: null,
      is_pinned: false,
      is_edited: false,
      created_at: '2023-01-01T10:00:00Z',
      updated_at: '2023-01-01T10:00:00Z',
      deleted_at: null,
      author_email: 'test@example.com',
      author_role: 'member',
      channel_name: 'test-channel',
    },
    {
      id: 'msg-2',
      channel_id: mockChannelId,
      user_id: mockUserId,
      content: 'Test message 2',
      message_type: 'text',
      metadata: {},
      thread_id: null,
      is_pinned: false,
      is_edited: false,
      created_at: '2023-01-01T10:01:00Z',
      updated_at: '2023-01-01T10:01:00Z',
      deleted_at: null,
      author_email: 'test@example.com',
      author_role: 'member',
      channel_name: 'test-channel',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getMessages', () => {
    it('should fetch messages using pagination function', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: mockMessages,
        error: null,
      })
      
      ;(supabase.rpc as any) = mockRpc

      const result = await MessageService.getMessages({
        channelId: mockChannelId,
        limit: 50,
      })

      expect(mockRpc).toHaveBeenCalledWith('get_messages_paginated', {
        p_channel_id: mockChannelId,
        p_limit: 50,
        p_cursor: undefined,
      })

      expect(result).toEqual({
        messages: expect.arrayContaining([
          expect.objectContaining({
            id: 'msg-1',
            content: 'Test message 1',
            author: {
              id: mockUserId,
              email: 'test@example.com',
              role: 'member',
            },
            channel: {
              id: mockChannelId,
              name: 'test-channel',
            },
            status: 'delivered',
          }),
        ]),
        hasMore: false,
        nextCursor: undefined,
      })
    })

    it('should handle pagination with cursor', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: mockMessages,
        error: null,
      })
      
      ;(supabase.rpc as any) = mockRpc

      const cursor = '2023-01-01T10:00:00Z'
      await MessageService.getMessages({
        channelId: mockChannelId,
        limit: 50,
        cursor,
      })

      expect(mockRpc).toHaveBeenCalledWith('get_messages_paginated', {
        p_channel_id: mockChannelId,
        p_limit: 50,
        p_cursor: cursor,
      })
    })

    it('should handle errors from database function', async () => {
      const mockError = new Error('Database error')
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      })
      
      ;(supabase.rpc as any) = mockRpc

      await expect(MessageService.getMessages({
        channelId: mockChannelId,
        limit: 50,
      })).rejects.toThrow('Database error')
    })

    it('should determine hasMore based on result count', async () => {
      const fullPageMessages = Array(50).fill(null).map((_, i) => ({
        ...mockMessages[0],
        id: `msg-${i}`,
        content: `Test message ${i}`,
      }))

      const mockRpc = vi.fn().mockResolvedValue({
        data: fullPageMessages,
        error: null,
      })
      
      ;(supabase.rpc as any) = mockRpc

      const result = await MessageService.getMessages({
        channelId: mockChannelId,
        limit: 50,
      })

      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBeDefined()
    })
  })

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const mockAuth = {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: mockUserId } } },
        }),
      }
      
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'new-msg-id',
                channel_id: mockChannelId,
                user_id: mockUserId,
                content: 'New message',
                message_type: 'text',
                metadata: {},
                thread_id: null,
                is_pinned: false,
                is_edited: false,
                created_at: '2023-01-01T10:02:00Z',
                updated_at: '2023-01-01T10:02:00Z',
                deleted_at: null,
                author: {
                  id: mockUserId,
                  email: 'test@example.com',
                  role: 'member',
                },
                channel: {
                  id: mockChannelId,
                  name: 'test-channel',
                },
              },
              error: null,
            }),
          }),
        }),
      })

      ;(supabase.auth as any) = mockAuth
      ;(supabase.from as any) = mockFrom

      const messageData: MessageFormData = {
        channelId: mockChannelId,
        content: 'New message',
        messageType: 'text',
      }

      const result = await MessageService.sendMessage(messageData)

      expect(mockFrom).toHaveBeenCalledWith('messages')
      expect(result).toEqual(
        expect.objectContaining({
          id: 'new-msg-id',
          content: 'New message',
          status: 'sent',
        })
      )
    })

    it('should handle authentication error', async () => {
      const mockAuth = {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      }

      ;(supabase.auth as any) = mockAuth

      const messageData: MessageFormData = {
        channelId: mockChannelId,
        content: 'New message',
        messageType: 'text',
      }

      await expect(MessageService.sendMessage(messageData)).rejects.toThrow(
        'User not authenticated'
      )
    })

    it('should handle database insert error', async () => {
      const mockAuth = {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: mockUserId } } },
        }),
      }
      
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Insert failed'),
            }),
          }),
        }),
      })

      ;(supabase.auth as any) = mockAuth
      ;(supabase.from as any) = mockFrom

      const messageData: MessageFormData = {
        channelId: mockChannelId,
        content: 'New message',
        messageType: 'text',
      }

      await expect(MessageService.sendMessage(messageData)).rejects.toThrow(
        'Insert failed'
      )
    })
  })

  describe('updateMessage', () => {
    it('should update a message successfully', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'msg-1',
                  content: 'Updated message',
                  is_edited: true,
                  updated_at: '2023-01-01T10:03:00Z',
                },
                error: null,
              }),
            }),
          }),
        }),
      })

      ;(supabase.from as any) = mockFrom

      const result = await MessageService.updateMessage('msg-1', 'Updated message')

      expect(result).toEqual(
        expect.objectContaining({
          id: 'msg-1',
          content: 'Updated message',
          is_edited: true,
        })
      )
    })
  })

  describe('deleteMessage', () => {
    it('should soft delete a message successfully', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      ;(supabase.from as any) = mockFrom

      await expect(MessageService.deleteMessage('msg-1')).resolves.not.toThrow()
    })
  })

  describe('subscribeToMessages', () => {
    it('should set up real-time subscription', () => {
      const mockSubscription = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      }

      const mockChannel = vi.fn().mockReturnValue(mockSubscription)
      ;(supabase.channel as any) = mockChannel

      const callback = vi.fn()
      const unsubscribe = MessageService.subscribeToMessages(mockChannelId, callback)

      expect(mockChannel).toHaveBeenCalledWith(`messages:${mockChannelId}`)
      expect(mockSubscription.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${mockChannelId}`,
        },
        expect.any(Function)
      )
      expect(mockSubscription.subscribe).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('searchMessages', () => {
    it('should search messages in a channel', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [mockMessages[0]],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      ;(supabase.from as any) = mockFrom

      const result = await MessageService.searchMessages(mockChannelId, 'test', 20)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'msg-1',
          content: 'Test message 1',
          status: 'delivered',
        })
      )
    })
  })

  describe('getChannelMessageStats', () => {
    it('should get channel message statistics', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({
              data: [
                { message_type: 'text', created_at: '2023-01-01T10:00:00Z' },
                { message_type: 'text', created_at: '2023-01-01T09:00:00Z' },
                { message_type: 'image', created_at: '2023-01-01T08:00:00Z' },
              ],
              error: null,
            }),
          }),
        }),
      })

      ;(supabase.from as any) = mockFrom

      const result = await MessageService.getChannelMessageStats(mockChannelId)

      expect(result).toEqual({
        total: 3,
        byType: {
          text: 2,
          image: 1,
        },
        todayCount: expect.any(Number),
        weekCount: expect.any(Number),
      })
    })
  })
})