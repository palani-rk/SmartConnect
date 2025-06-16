import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/auth'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRoles?: UserRole[]
  fallbackPath?: string
}

export const ProtectedRoute = ({ 
  children, 
  requiredRoles = [], 
  fallbackPath = '/auth/login' 
}: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, canAccess } = useAuth()

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />
  }

  // Check role-based access if roles are specified
  if (requiredRoles.length > 0 && !canAccess(requiredRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}