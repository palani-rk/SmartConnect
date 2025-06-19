import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/auth'
import { Box, CircularProgress, Typography } from '@mui/material'

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
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />
  }

  // Check role-based access if roles are specified
  if (requiredRoles.length > 0 && !canAccess(requiredRoles)) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Box textAlign="center">
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'grey.900', mb: 2 }}>
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            You don't have permission to access this page.
          </Typography>
        </Box>
      </Box>
    )
  }

  return <>{children}</>
}