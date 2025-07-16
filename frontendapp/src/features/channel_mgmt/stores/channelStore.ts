import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ChannelService } from '../services/channelService'
import type { 
  Channel, 
  ChannelWithDetails,
  ChannelMemberDetails,
  ChannelSearchParams,
  ChannelCreateForm,
  ChannelUpdateForm
} from '../types/channel'

interface ChannelState {
  // State
  channels: ChannelWithDetails[]
  selectedChannel: ChannelWithDetails | null
  isLoading: boolean
  error: string | null
  total: number
  hasMore: boolean

  // Member management state
  isManagingMembers: boolean
  memberError: string | null

  // Actions
  setSelectedChannel: (channel: ChannelWithDetails | null) => void
  setError: (error: string | null) => void
  clearError: () => void
  setMemberError: (error: string | null) => void
  clearMemberError: () => void

  // Channel CRUD operations
  fetchChannels: (organizationId: string, params?: ChannelSearchParams) => Promise<void>
  fetchChannel: (channelId: string) => Promise<ChannelWithDetails>
  createChannel: (data: ChannelCreateForm, organizationId: string, createdBy: string) => Promise<Channel>
  updateChannel: (channelId: string, data: ChannelUpdateForm) => Promise<Channel>
  deleteChannel: (channelId: string) => Promise<void>

  // Member management operations
  addUsersToChannel: (channelId: string, userIds: string[], role?: 'admin' | 'member') => Promise<void>
  removeUserFromChannel: (channelId: string, userId: string) => Promise<void>
  updateMemberRole: (channelId: string, userId: string, role: 'admin' | 'member') => Promise<void>
  refreshChannelMembers: (channelId: string) => Promise<void>

  // Utility actions
  refreshChannels: (organizationId: string) => Promise<void>
  reset: () => void
}

export const useChannelStore = create<ChannelState>()(
  devtools(
    (set, get) => ({
      // Initial state
      channels: [],
      selectedChannel: null,
      isLoading: false,
      error: null,
      total: 0,
      hasMore: false,
      isManagingMembers: false,
      memberError: null,

      // Synchronous actions
      setSelectedChannel: (channel) => 
        set({ selectedChannel: channel }, false, 'setSelectedChannel'),

      setError: (error) => 
        set({ error }, false, 'setError'),

      clearError: () => 
        set({ error: null }, false, 'clearError'),

      setMemberError: (error) => 
        set({ memberError: error }, false, 'setMemberError'),

      clearMemberError: () => 
        set({ memberError: null }, false, 'clearMemberError'),

      // Channel CRUD operations
      fetchChannels: async (organizationId: string, params = {}) => {
        set({ isLoading: true, error: null }, false, 'fetchChannels:start')
        
        try {
          const response = await ChannelService.getChannelsByOrganization(organizationId, params)
          
          set({ 
            channels: response.channels,
            total: response.total,
            hasMore: response.has_more,
            isLoading: false 
          }, false, 'fetchChannels:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch channels'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'fetchChannels:error')
          throw error
        }
      },

      fetchChannel: async (channelId: string) => {
        set({ isLoading: true, error: null }, false, 'fetchChannel:start')
        
        try {
          const channel = await ChannelService.getChannelWithMembers(channelId)
          
          // Update the channels array and set as selected
          set((state) => {
            const existingIndex = state.channels.findIndex(ch => ch.id === channelId)
            const updatedChannels = existingIndex >= 0 
              ? state.channels.map(ch => ch.id === channelId ? channel : ch)
              : [...state.channels, channel]
            
            return {
              channels: updatedChannels,
              selectedChannel: channel,
              isLoading: false
            }
          }, false, 'fetchChannel:success')
          
          return channel
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch channel'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'fetchChannel:error')
          throw error
        }
      },

      createChannel: async (data: ChannelCreateForm, organizationId: string, createdBy: string) => {
        console.log('🔵 ChannelStore: createChannel called', { data, organizationId, createdBy })
        set({ isLoading: true, error: null }, false, 'createChannel:start')
        
        try {
          console.log('🟡 ChannelStore: Calling ChannelService.createChannel')
          const newChannel = await ChannelService.createChannel(data, organizationId, createdBy)
          console.log('🟢 ChannelStore: Channel created successfully', newChannel)
          
          // Fetch the complete channel details to get members
          console.log('🟡 ChannelStore: Fetching complete channel details')
          const completeChannel = await ChannelService.getChannelWithMembers(newChannel.id)
          console.log('🟢 ChannelStore: Complete channel fetched', completeChannel)
          
          // Optimistically add to the list
          set((state) => ({
            channels: [completeChannel, ...state.channels],
            total: state.total + 1,
            isLoading: false
          }), false, 'createChannel:success')
          
          return newChannel
        } catch (error) {
          console.error('🔴 ChannelStore: Error creating channel', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to create channel'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'createChannel:error')
          throw error
        }
      },

      updateChannel: async (channelId: string, data: ChannelUpdateForm) => {
        set({ isLoading: true, error: null }, false, 'updateChannel:start')
        
        try {
          const updatedChannel = await ChannelService.updateChannel(channelId, data)
          
          // Optimistically update the channels array
          set((state) => {
            const updatedChannels = state.channels.map(channel => 
              channel.id === channelId 
                ? { ...channel, ...updatedChannel }
                : channel
            )
            
            const updatedSelectedChannel = state.selectedChannel?.id === channelId 
              ? { ...state.selectedChannel, ...updatedChannel }
              : state.selectedChannel
            
            return {
              channels: updatedChannels,
              selectedChannel: updatedSelectedChannel,
              isLoading: false
            }
          }, false, 'updateChannel:success')
          
          return updatedChannel
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update channel'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'updateChannel:error')
          throw error
        }
      },

      deleteChannel: async (channelId: string) => {
        set({ isLoading: true, error: null }, false, 'deleteChannel:start')
        
        try {
          await ChannelService.deleteChannel(channelId)
          
          // Optimistically remove from the list
          set((state) => ({
            channels: state.channels.filter(channel => channel.id !== channelId),
            total: state.total - 1,
            selectedChannel: state.selectedChannel?.id === channelId 
              ? null 
              : state.selectedChannel,
            isLoading: false
          }), false, 'deleteChannel:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete channel'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'deleteChannel:error')
          throw error
        }
      },

      // Member management operations
      addUsersToChannel: async (channelId: string, userIds: string[], role = 'member') => {
        set({ isManagingMembers: true, memberError: null }, false, 'addUsersToChannel:start')
        
        try {
          await ChannelService.addUsersToChannel(channelId, userIds, role)
          
          // Refresh the channel details to get updated member list
          await get().refreshChannelMembers(channelId)
          
          set({ isManagingMembers: false }, false, 'addUsersToChannel:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add users to channel'
          set({ 
            memberError: errorMessage, 
            isManagingMembers: false 
          }, false, 'addUsersToChannel:error')
          throw error
        }
      },

      removeUserFromChannel: async (channelId: string, userId: string) => {
        set({ isManagingMembers: true, memberError: null }, false, 'removeUserFromChannel:start')
        
        try {
          await ChannelService.removeUserFromChannel(channelId, userId)
          
          // Optimistically update the member list
          set((state) => {
            const updatedChannels = state.channels.map(channel => 
              channel.id === channelId 
                ? {
                    ...channel,
                    members: channel.members.filter(member => member.id !== userId),
                    member_count: channel.member_count - 1
                  }
                : channel
            )
            
            const updatedSelectedChannel = state.selectedChannel?.id === channelId 
              ? {
                  ...state.selectedChannel,
                  members: state.selectedChannel.members.filter(member => member.id !== userId),
                  member_count: state.selectedChannel.member_count - 1
                }
              : state.selectedChannel
            
            return {
              channels: updatedChannels,
              selectedChannel: updatedSelectedChannel,
              isManagingMembers: false
            }
          }, false, 'removeUserFromChannel:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to remove user from channel'
          set({ 
            memberError: errorMessage, 
            isManagingMembers: false 
          }, false, 'removeUserFromChannel:error')
          throw error
        }
      },

      updateMemberRole: async (channelId: string, userId: string, role: 'admin' | 'member') => {
        set({ isManagingMembers: true, memberError: null }, false, 'updateMemberRole:start')
        
        try {
          await ChannelService.updateMemberRole(channelId, userId, role)
          
          // Optimistically update the member role
          set((state) => {
            const updateMemberRole = (members: ChannelMemberDetails[]) =>
              members.map(member => 
                member.id === userId 
                  ? { ...member, membership_role: role }
                  : member
              )
            
            const updatedChannels = state.channels.map(channel => 
              channel.id === channelId 
                ? { ...channel, members: updateMemberRole(channel.members) }
                : channel
            )
            
            const updatedSelectedChannel = state.selectedChannel?.id === channelId 
              ? { ...state.selectedChannel, members: updateMemberRole(state.selectedChannel.members) }
              : state.selectedChannel
            
            return {
              channels: updatedChannels,
              selectedChannel: updatedSelectedChannel,
              isManagingMembers: false
            }
          }, false, 'updateMemberRole:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update member role'
          set({ 
            memberError: errorMessage, 
            isManagingMembers: false 
          }, false, 'updateMemberRole:error')
          throw error
        }
      },

      refreshChannelMembers: async (channelId: string) => {
        try {
          const channel = await ChannelService.getChannelWithMembers(channelId)
          
          set((state) => {
            const updatedChannels = state.channels.map(ch => 
              ch.id === channelId ? channel : ch
            )
            
            const updatedSelectedChannel = state.selectedChannel?.id === channelId 
              ? channel 
              : state.selectedChannel
            
            return {
              channels: updatedChannels,
              selectedChannel: updatedSelectedChannel
            }
          }, false, 'refreshChannelMembers:success')
        } catch (error) {
          console.error('Failed to refresh channel members:', error)
        }
      },

      // Utility actions
      refreshChannels: async (organizationId: string) => {
        await get().fetchChannels(organizationId)
      },

      reset: () => 
        set({
          channels: [],
          selectedChannel: null,
          isLoading: false,
          error: null,
          total: 0,
          hasMore: false,
          isManagingMembers: false,
          memberError: null
        }, false, 'reset')
    }),
    {
      name: 'channel-store',
    }
  )
)