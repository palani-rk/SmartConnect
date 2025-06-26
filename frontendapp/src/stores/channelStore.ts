import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { 
  ChannelService, 
  type CreateChannelRequest, 
  type ChannelSearchParams,
  type ChannelWithMembers
} from '@/services/channelService'
import type { Channel, ChannelUpdate } from '@/types/channel'
import type { User } from '@/types/user'

interface ChannelState {
  // State
  channelsByOrganization: Record<string, Channel[]>
  channelDetails: Record<string, ChannelWithMembers>
  selectedOrganization: string | null
  isLoading: boolean
  error: string | null
  total: Record<string, number>

  // Actions
  setSelectedOrganization: (orgId: string | null) => void
  setError: (error: string | null) => void
  clearError: () => void

  // Async Actions
  fetchChannelsByOrg: (orgId: string, params?: ChannelSearchParams) => Promise<void>
  fetchChannelDetails: (channelId: string) => Promise<void>
  createChannel: (channelData: CreateChannelRequest) => Promise<Channel>
  updateChannel: (channelId: string, updates: ChannelUpdate) => Promise<Channel>
  deleteChannel: (channelId: string, orgId: string) => Promise<void>
  assignUsersToChannel: (channelId: string, userIds: string[]) => Promise<void>
  addUsersToChannel: (channelId: string, userIds: string[]) => Promise<void>
  removeUsersFromChannel: (channelId: string, userIds: string[]) => Promise<void>
  refreshChannels: (orgId: string) => Promise<void>
  
  // Utilities
  getChannelsByOrg: (orgId: string) => Channel[]
  getChannelById: (channelId: string, orgId: string) => Channel | null
  getChannelDetails: (channelId: string) => ChannelWithMembers | null
  getChannelStats: (orgId: string) => Promise<{ total: number; byType: Record<string, number>; privateChannels: number; publicChannels: number }>
  getUsersNotInChannel: (channelId: string, orgId: string) => Promise<User[]>
}

export const useChannelStore = create<ChannelState>()(
  devtools(
    (set, get) => ({
      // Initial state
      channelsByOrganization: {},
      channelDetails: {},
      selectedOrganization: null,
      isLoading: false,
      error: null,
      total: {},

      // Synchronous actions
      setSelectedOrganization: (orgId) => 
        set({ selectedOrganization: orgId }, false, 'setSelectedOrganization'),

      setError: (error) => 
        set({ error }, false, 'setError'),

      clearError: () => 
        set({ error: null }, false, 'clearError'),

      // Async actions
      fetchChannelsByOrg: async (orgId, params = {}) => {
        set({ isLoading: true, error: null }, false, 'fetchChannelsByOrg:start')
        
        try {
          const response = await ChannelService.getChannelsByOrganization(orgId, params)
          
          set((state) => ({
            channelsByOrganization: {
              ...state.channelsByOrganization,
              [orgId]: response.channels
            },
            total: {
              ...state.total,
              [orgId]: response.total
            },
            isLoading: false
          }), false, 'fetchChannelsByOrg:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch channels'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'fetchChannelsByOrg:error')
          throw error
        }
      },

      fetchChannelDetails: async (channelId) => {
        set({ isLoading: true, error: null }, false, 'fetchChannelDetails:start')
        
        try {
          const channelDetails = await ChannelService.getChannelWithMembers(channelId)
          
          set((state) => ({
            channelDetails: {
              ...state.channelDetails,
              [channelId]: channelDetails
            },
            isLoading: false
          }), false, 'fetchChannelDetails:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch channel details'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'fetchChannelDetails:error')
          throw error
        }
      },

      createChannel: async (channelData) => {
        set({ isLoading: true, error: null }, false, 'createChannel:start')
        
        try {
          const newChannel = await ChannelService.createChannel(channelData)
          
          // Optimistically add to the list
          const orgId = channelData.organization_id
          set((state) => ({
            channelsByOrganization: {
              ...state.channelsByOrganization,
              [orgId]: [newChannel, ...(state.channelsByOrganization[orgId] || [])]
            },
            total: {
              ...state.total,
              [orgId]: (state.total[orgId] || 0) + 1
            },
            isLoading: false
          }), false, 'createChannel:success')
          
          return newChannel
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create channel'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'createChannel:error')
          throw error
        }
      },

      updateChannel: async (channelId, updates) => {
        set({ isLoading: true, error: null }, false, 'updateChannel:start')
        
        try {
          const updatedChannel = await ChannelService.updateChannel(channelId, updates)
          
          // Update channel in the appropriate organization list
          set((state) => {
            const orgId = updatedChannel.organization_id
            const orgChannels = state.channelsByOrganization[orgId] || []
            
            return {
              channelsByOrganization: {
                ...state.channelsByOrganization,
                [orgId]: orgChannels.map(channel => 
                  channel.id === channelId ? updatedChannel : channel
                )
              },
              // Also update channel details if cached
              channelDetails: state.channelDetails[channelId] 
                ? {
                    ...state.channelDetails,
                    [channelId]: { ...state.channelDetails[channelId], ...updatedChannel }
                  }
                : state.channelDetails,
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

      deleteChannel: async (channelId, orgId) => {
        set({ isLoading: true, error: null }, false, 'deleteChannel:start')
        
        try {
          await ChannelService.deleteChannel(channelId)
          
          // Remove from store
          set((state) => ({
            channelsByOrganization: {
              ...state.channelsByOrganization,
              [orgId]: (state.channelsByOrganization[orgId] || []).filter(c => c.id !== channelId)
            },
            total: {
              ...state.total,
              [orgId]: Math.max(0, (state.total[orgId] || 0) - 1)
            },
            // Remove from channel details cache
            channelDetails: Object.fromEntries(
              Object.entries(state.channelDetails).filter(([id]) => id !== channelId)
            ),
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

      assignUsersToChannel: async (channelId, userIds) => {
        set({ isLoading: true, error: null }, false, 'assignUsersToChannel:start')
        
        try {
          await ChannelService.assignUsersToChannel(channelId, userIds)
          
          // Refresh channel details to get updated member list
          await get().fetchChannelDetails(channelId)
          
          set({ isLoading: false }, false, 'assignUsersToChannel:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to assign users to channel'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'assignUsersToChannel:error')
          throw error
        }
      },

      addUsersToChannel: async (channelId, userIds) => {
        set({ isLoading: true, error: null }, false, 'addUsersToChannel:start')
        
        try {
          await ChannelService.addUsersToChannel(channelId, userIds)
          
          // Refresh channel details to get updated member list
          await get().fetchChannelDetails(channelId)
          
          set({ isLoading: false }, false, 'addUsersToChannel:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add users to channel'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'addUsersToChannel:error')
          throw error
        }
      },

      removeUsersFromChannel: async (channelId, userIds) => {
        set({ isLoading: true, error: null }, false, 'removeUsersFromChannel:start')
        
        try {
          await ChannelService.removeUsersFromChannel(channelId, userIds)
          
          // Refresh channel details to get updated member list
          await get().fetchChannelDetails(channelId)
          
          set({ isLoading: false }, false, 'removeUsersFromChannel:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to remove users from channel'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'removeUsersFromChannel:error')
          throw error
        }
      },

      refreshChannels: async (orgId) => {
        await get().fetchChannelsByOrg(orgId)
      },

      // Utility functions
      getChannelsByOrg: (orgId) => {
        return get().channelsByOrganization[orgId] || []
      },

      getChannelById: (channelId, orgId) => {
        const orgChannels = get().channelsByOrganization[orgId] || []
        return orgChannels.find(channel => channel.id === channelId) || null
      },

      getChannelDetails: (channelId) => {
        return get().channelDetails[channelId] || null
      },

      getChannelStats: async (orgId) => {
        try {
          return await ChannelService.getChannelStats(orgId)
        } catch (error) {
          console.error('Error fetching channel stats:', error)
          throw error
        }
      },

      getUsersNotInChannel: async (channelId, orgId) => {
        try {
          return await ChannelService.getUsersNotInChannel(channelId, orgId)
        } catch (error) {
          console.error('Error fetching users not in channel:', error)
          throw error
        }
      }
    }),
    {
      name: 'channel-store',
    }
  )
)