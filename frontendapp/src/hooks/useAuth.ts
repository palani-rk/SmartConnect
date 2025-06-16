import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types/auth'

// Main auth hook
export const useAuth = () => {
  const store = useAuthStore()

  // Initialize auth on first use - only run once
  useEffect(() => {
    if (!store.initialized) {
      store.initialize()
    }
  }, []) // Remove store dependency to prevent re-runs

  return store
}

// Hook to require authentication
export const useRequireAuth = () => {
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Could redirect to login here
      console.warn('Authentication required')
    }
  }, [auth.isLoading, auth.isAuthenticated])

  return auth
}

// Hook to check role-based access
export const useRoleAccess = (requiredRoles: UserRole | UserRole[]) => {
  const auth = useAuth()
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  
  const hasAccess = auth.canAccess(roles)
  const isLoading = auth.isLoading
  
  return { hasAccess, isLoading, userRole: auth.getUserRole() }
}

// Hook for specific role checks
export const useIsGod = () => useRoleAccess('god')
export const useIsAdmin = () => useRoleAccess('admin')
export const useIsUser = () => useRoleAccess('user')
export const useIsClient = () => useRoleAccess('client')