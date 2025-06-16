import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface PublicRouteProps {
  children: ReactNode
  redirectIfAuthenticated?: string
}

export const PublicRoute = ({ 
  children, 
  redirectIfAuthenticated = '/dashboard' 
}: PublicRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={redirectIfAuthenticated} replace />
  }

  return <>{children}</>
}