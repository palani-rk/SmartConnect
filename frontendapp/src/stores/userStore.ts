import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { 
  UserService, 
  type CreateUserRequest, 
  type CreateUserResponse,
  type UserSearchParams
} from '@/services/userService'
import type { User, UserUpdate } from '@/types/user'

interface UserState {
  // State
  usersByOrganization: Record<string, User[]>
  selectedOrganization: string | null
  isLoading: boolean
  error: string | null
  total: Record<string, number>

  // Actions
  setSelectedOrganization: (orgId: string | null) => void
  setError: (error: string | null) => void
  clearError: () => void

  // Async Actions
  fetchUsersByOrg: (orgId: string, params?: UserSearchParams) => Promise<void>
  createUser: (userData: CreateUserRequest) => Promise<CreateUserResponse>
  updateUser: (userId: string, updates: UserUpdate) => Promise<User>
  updateUserRole: (userId: string, role: string) => Promise<User>
  deleteUser: (userId: string, orgId: string) => Promise<void>
  refreshUsers: (orgId: string) => Promise<void>
  
  // Utilities
  getUsersByOrg: (orgId: string) => User[]
  getUserById: (userId: string, orgId: string) => User | null
  getUserStats: (orgId: string) => Promise<{ total: number; byRole: Record<string, number> }>
}

export const useUserStore = create<UserState>()(
  devtools(
    (set, get) => ({
      // Initial state
      usersByOrganization: {},
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
      fetchUsersByOrg: async (orgId, params = {}) => {
        set({ isLoading: true, error: null }, false, 'fetchUsersByOrg:start')
        
        try {
          const response = await UserService.getUsersByOrganization(orgId, params)
          
          set((state) => ({
            usersByOrganization: {
              ...state.usersByOrganization,
              [orgId]: response.users
            },
            total: {
              ...state.total,
              [orgId]: response.total
            },
            isLoading: false
          }), false, 'fetchUsersByOrg:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'fetchUsersByOrg:error')
          throw error
        }
      },

      createUser: async (userData) => {
        set({ isLoading: true, error: null }, false, 'createUser:start')
        
        try {
          const result = await UserService.createUser(userData)
          
          // Optimistically add to the list
          const orgId = userData.organization_id
          set((state) => ({
            usersByOrganization: {
              ...state.usersByOrganization,
              [orgId]: [result.user, ...(state.usersByOrganization[orgId] || [])]
            },
            total: {
              ...state.total,
              [orgId]: (state.total[orgId] || 0) + 1
            },
            isLoading: false
          }), false, 'createUser:success')
          
          return result
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create user'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'createUser:error')
          throw error
        }
      },

      updateUser: async (userId, updates) => {
        set({ isLoading: true, error: null }, false, 'updateUser:start')
        
        try {
          const updatedUser = await UserService.updateUser(userId, updates)
          
          // Update user in the appropriate organization list
          set((state) => {
            const orgId = updatedUser.organization_id
            const orgUsers = state.usersByOrganization[orgId] || []
            
            return {
              usersByOrganization: {
                ...state.usersByOrganization,
                [orgId]: orgUsers.map(user => 
                  user.id === userId ? updatedUser : user
                )
              },
              isLoading: false
            }
          }, false, 'updateUser:success')
          
          return updatedUser
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update user'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'updateUser:error')
          throw error
        }
      },

      updateUserRole: async (userId, role) => {
        return get().updateUser(userId, { role })
      },

      deleteUser: async (userId, orgId) => {
        set({ isLoading: true, error: null }, false, 'deleteUser:start')
        
        try {
          await UserService.deleteUser(userId)
          
          // Remove from store
          set((state) => ({
            usersByOrganization: {
              ...state.usersByOrganization,
              [orgId]: (state.usersByOrganization[orgId] || []).filter(u => u.id !== userId)
            },
            total: {
              ...state.total,
              [orgId]: Math.max(0, (state.total[orgId] || 0) - 1)
            },
            isLoading: false
          }), false, 'deleteUser:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete user'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'deleteUser:error')
          throw error
        }
      },

      refreshUsers: async (orgId) => {
        await get().fetchUsersByOrg(orgId)
      },

      // Utility functions
      getUsersByOrg: (orgId) => {
        return get().usersByOrganization[orgId] || []
      },

      getUserById: (userId, orgId) => {
        const orgUsers = get().usersByOrganization[orgId] || []
        return orgUsers.find(user => user.id === userId) || null
      },

      getUserStats: async (orgId) => {
        try {
          return await UserService.getUserStats(orgId)
        } catch (error) {
          console.error('Error fetching user stats:', error)
          throw error
        }
      }
    }),
    {
      name: 'user-store',
    }
  )
)