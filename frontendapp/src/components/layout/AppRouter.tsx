import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicRoute } from './PublicRoute'
import { Layout } from './Layout'
import { USER_ROLES } from '@/constants'

// Lazy load page components for better performance
import { lazy, Suspense } from 'react'

// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))

// Dashboard pages
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))

// Organization pages
const OrganizationsPage = lazy(() => import('@/pages/organizations/OrganizationsPage'))

// User pages
const UsersPage = lazy(() => import('@/pages/users/UsersPage'))

// Channel pages
const ChannelsPage = lazy(() => import('@/pages/channels/ChannelsPage'))

// Message pages
const MessagesPage = lazy(() => import('@/pages/messages/MessagesPage'))

// Integration pages
const IntegrationsPage = lazy(() => import('@/pages/integrations/IntegrationsPage'))

// Profile pages
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'))

// Loading component
const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
  </div>
)

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/auth/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />

          {/* Protected Routes with Layout */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            {/* Dashboard - All authenticated users */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Organizations - God users only */}
            <Route path="organizations" element={
              <ProtectedRoute requiredRoles={[USER_ROLES.GOD]}>
                <OrganizationsPage />
              </ProtectedRoute>
            } />

            {/* Users - God and Admin users */}
            <Route path="users" element={
              <ProtectedRoute requiredRoles={[USER_ROLES.GOD, USER_ROLES.ADMIN]}>
                <UsersPage />
              </ProtectedRoute>
            } />

            {/* Channels - God, Admin, and User roles */}
            <Route path="channels" element={
              <ProtectedRoute requiredRoles={[USER_ROLES.GOD, USER_ROLES.ADMIN, USER_ROLES.USER]}>
                <ChannelsPage />
              </ProtectedRoute>
            } />

            {/* Messages - All authenticated users */}
            <Route path="messages" element={<MessagesPage />} />
            <Route path="channels/:channelId" element={<MessagesPage />} />
            <Route path="direct/:userId" element={<MessagesPage />} />

            {/* Integrations - Admin users only */}
            <Route path="integrations" element={
              <ProtectedRoute requiredRoles={[USER_ROLES.ADMIN]}>
                <IntegrationsPage />
              </ProtectedRoute>
            } />

            {/* Profile - All authenticated users */}
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}