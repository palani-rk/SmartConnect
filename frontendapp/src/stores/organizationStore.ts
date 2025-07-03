import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { OrganizationService } from '@/services/organizationService'
import type { 
  Organization, 
  OrganizationInsert, 
  OrganizationUpdate,
  OrganizationSearchParams,
  AdminUserData,
  CreateOrganizationWithAdminResponse
} from '@/types/organization'

interface OrganizationState {
  // State
  organizations: Organization[]
  selectedOrganization: Organization | null
  isLoading: boolean
  error: string | null
  total: number

  // Actions
  setSelectedOrganization: (org: Organization | null) => void
  setError: (error: string | null) => void
  clearError: () => void

  // Async Actions
  fetchOrganizations: (params?: OrganizationSearchParams) => Promise<void>
  fetchOrganization: (id: string) => Promise<Organization>
  createOrganization: (data: OrganizationInsert) => Promise<Organization>
  createOrganizationWithAdmin: (orgData: OrganizationInsert, adminData: AdminUserData) => Promise<CreateOrganizationWithAdminResponse>
  updateOrganization: (id: string, data: OrganizationUpdate) => Promise<Organization>
  deleteOrganization: (id: string) => Promise<void>
  refreshOrganizations: () => Promise<void>
}

export const useOrganizationStore = create<OrganizationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      organizations: [],
      selectedOrganization: null,
      isLoading: false,
      error: null,
      total: 0,

      // Synchronous actions
      setSelectedOrganization: (org) => 
        set({ selectedOrganization: org }, false, 'setSelectedOrganization'),

      setError: (error) => 
        set({ error }, false, 'setError'),

      clearError: () => 
        set({ error: null }, false, 'clearError'),

      // Async actions
      fetchOrganizations: async (params = {}) => {
        set({ isLoading: true, error: null }, false, 'fetchOrganizations:start')
        
        try {
          const response = await OrganizationService.getOrganizations(params)
          
          set({ 
            organizations: response.organizations,
            total: response.total,
            isLoading: false 
          }, false, 'fetchOrganizations:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch organizations'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'fetchOrganizations:error')
          throw error
        }
      },

      fetchOrganization: async (id: string) => {
        set({ isLoading: true, error: null }, false, 'fetchOrganization:start')
        
        try {
          const organization = await OrganizationService.getOrganization(id)
          
          // Update the organizations array if this org is not already in it
          set((state) => {
            const existingIndex = state.organizations.findIndex(org => org.id === id)
            const updatedOrganizations = existingIndex >= 0 
              ? state.organizations.map(org => org.id === id ? organization : org)
              : [...state.organizations, organization]
            
            return {
              organizations: updatedOrganizations,
              selectedOrganization: organization,
              isLoading: false
            }
          }, false, 'fetchOrganization:success')
          
          return organization
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch organization'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'fetchOrganization:error')
          throw error
        }
      },

      createOrganization: async (data) => {
        set({ isLoading: true, error: null }, false, 'createOrganization:start')
        
        try {
          const newOrganization = await OrganizationService.createOrganization(data)
          
          // Optimistically add to the list
          set((state) => ({
            organizations: [newOrganization, ...state.organizations],
            total: state.total + 1,
            isLoading: false
          }), false, 'createOrganization:success')
          
          return newOrganization
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create organization'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'createOrganization:error')
          throw error
        }
      },

      createOrganizationWithAdmin: async (orgData, adminData) => {
        set({ isLoading: true, error: null }, false, 'createOrganizationWithAdmin:start')
        
        try {
          const result = await OrganizationService.createOrganizationWithAdmin(orgData, adminData)
          
          // Optimistically add to the list
          set((state) => ({
            organizations: [result.organization, ...state.organizations],
            total: state.total + 1,
            isLoading: false
          }), false, 'createOrganizationWithAdmin:success')
          
          return result
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create organization with admin'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'createOrganizationWithAdmin:error')
          throw error
        }
      },

      updateOrganization: async (id, data) => {
        set({ isLoading: true, error: null }, false, 'updateOrganization:start')
        
        try {
          const updatedOrganization = await OrganizationService.updateOrganization(id, data)
          
          // Optimistically update the list
          set((state) => ({
            organizations: state.organizations.map(org => 
              org.id === id ? updatedOrganization : org
            ),
            selectedOrganization: state.selectedOrganization?.id === id 
              ? updatedOrganization 
              : state.selectedOrganization,
            isLoading: false
          }), false, 'updateOrganization:success')
          
          return updatedOrganization
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update organization'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'updateOrganization:error')
          throw error
        }
      },

      deleteOrganization: async (id) => {
        set({ isLoading: true, error: null }, false, 'deleteOrganization:start')
        
        try {
          await OrganizationService.deleteOrganization(id)
          
          // Optimistically remove from the list
          set((state) => ({
            organizations: state.organizations.filter(org => org.id !== id),
            total: state.total - 1,
            selectedOrganization: state.selectedOrganization?.id === id 
              ? null 
              : state.selectedOrganization,
            isLoading: false
          }), false, 'deleteOrganization:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete organization'
          set({ 
            error: errorMessage, 
            isLoading: false 
          }, false, 'deleteOrganization:error')
          throw error
        }
      },

      refreshOrganizations: async () => {
        await get().fetchOrganizations()
      }
    }),
    {
      name: 'organization-store',
    }
  )
)