import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Box, CircularProgress } from '@mui/material'

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

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={redirectIfAuthenticated} replace />
  }

  return <>{children}</>
}