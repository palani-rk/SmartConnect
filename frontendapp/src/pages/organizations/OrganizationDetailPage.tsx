import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Box, 
  Container, 
  Breadcrumbs, 
  Link, 
  Typography, 
  Alert, 
  Snackbar,
  Card,
  CardContent,
  Grid,
  Chip
} from '@mui/material'
import { 
  Home as HomeIcon, 
  Business as BusinessIcon,
  People as PeopleIcon 
} from '@mui/icons-material'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useUserStore } from '@/stores/userStore'
import { useAuthStore } from '@/stores/authStore'
import { UserManagementTable, UserForm } from '@/components/users'
import type { Organization } from '@/types/organization'
import type { User } from '@/types/user'
import type { CreateUserRequest } from '@/services/userService'
import type { UserCreateForm, UserUpdateForm } from '@/types/user'

const OrganizationDetailPage = () => {
  const { id: organizationId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  // Auth and permissions
  const { user: currentUser, canAccess } = useAuthStore()
  const userRole = currentUser?.role
  
  // Stores
  const { organizations } = useOrganizationStore()
  const {
    fetchUsersByOrg,
    createUser,
    updateUser,
    deleteUser,
    getUsersByOrg,
    getUserStats,
    isLoading: usersLoading,
    error: usersError,
    clearError: clearUsersError
  } = useUserStore()

  // Local state for UI
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [userFormMode, setUserFormMode] = useState<'create' | 'edit'>('create')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [userStats, setUserStats] = useState<{ total: number; byRole: Record<string, number> }>({ total: 0, byRole: {} })

  // Check permissions
  const canManageUsers = canAccess(['god', 'admin'])
  const canViewOrganization = canAccess(['god']) || (canAccess(['admin']) && currentUser?.organization_id === organizationId)

  // Get organization and users data
  const users = organizationId ? getUsersByOrg(organizationId) : []

  useEffect(() => {
    if (!organizationId) {
      navigate('/organizations')
      return
    }

    if (!canViewOrganization) {
      navigate('/dashboard')
      return
    }

    // Find organization
    const org = organizations.find(o => o.id === organizationId)
    if (org) {
      setOrganization(org)
    }

    // Fetch users and stats
    if (canManageUsers) {
      fetchUsersByOrg(organizationId)
      loadUserStats()
    }
  }, [organizationId, canViewOrganization, canManageUsers, organizations, fetchUsersByOrg, navigate])

  const loadUserStats = async () => {
    if (!organizationId) return
    
    try {
      const stats = await getUserStats(organizationId)
      setUserStats(stats)
    } catch (error) {
      console.error('Failed to load user stats:', error)
    }
  }

  // User management handlers
  const handleCreateUser = () => {
    setSelectedUser(null)
    setUserFormMode('create')
    setIsUserModalOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setUserFormMode('edit')
    setIsUserModalOpen(true)
  }

  const handleDeleteUser = async (userId: string) => {
    if (!organizationId || !confirm('Are you sure you want to delete this user?')) return
    
    try {
      await deleteUser(userId, organizationId)
      setSuccessMessage('User deleted successfully')
      await loadUserStats()
    } catch (error) {
      // Error handled by store
    }
  }

  const handleSaveUser = async (userData: UserCreateForm | UserUpdateForm) => {
    if (!organizationId) return
    
    setIsSubmitting(true)
    try {
      if (userFormMode === 'create') {
        await createUser({
          email: userData.email!,
          organization_id: organizationId,
          role: userData.role!,
          whatsapp_id: userData.whatsapp_id || undefined,
          instagram_id: userData.instagram_id || undefined,
          auto_generate_password: true,
          send_welcome_email: true
        } as CreateUserRequest)
        setSuccessMessage('User created successfully')
      } else if (selectedUser) {
        await updateUser(selectedUser.id, {
          email: userData.email,
          role: userData.role,
          whatsapp_id: userData.whatsapp_id || null,
          instagram_id: userData.instagram_id || null
        })
        setSuccessMessage('User updated successfully')
      }
      
      setIsUserModalOpen(false)
      setSelectedUser(null)
      await loadUserStats()
    } catch (error) {
      // Error handled by store
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    try {
      await updateUser(userId, { role: newRole })
      setSuccessMessage('User role updated successfully')
      await loadUserStats()
    } catch (error) {
      // Error handled by store
    }
  }

  const handleModalClose = () => {
    setIsUserModalOpen(false)
    setSelectedUser(null)
    clearUsersError()
  }

  const handleSuccessClose = () => {
    setSuccessMessage(null)
  }

  if (!canViewOrganization) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">
          You don't have permission to view this organization.
        </Alert>
      </Container>
    )
  }

  if (!organization) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">
          Organization not found.
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          color="inherit"
          href="/dashboard"
          sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </Link>
        <Link
          color="inherit"
          href="/organizations"
          sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
        >
          <BusinessIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Organizations
        </Link>
        <Typography color="text.primary">{organization.name}</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          {organization.name}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Organization details and user management
        </Typography>
      </Box>

      {/* Error Display */}
      {usersError && (
        <Alert 
          severity="error" 
          onClose={clearUsersError}
          sx={{ mb: 3 }}
        >
          {usersError}
        </Alert>
      )}

      {/* Organization Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Organization Details</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Name: {organization.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Created: {new Date(organization.created_at || '').toLocaleDateString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ID: {organization.id}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">User Statistics</Typography>
              </Box>
              <Typography variant="h4" color="primary.main" gutterBottom>
                {userStats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Users
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                {Object.entries(userStats.byRole).map(([role, count]) => (
                  <Chip 
                    key={role} 
                    label={`${role}: ${count}`} 
                    size="small" 
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* User Management Section */}
      {canManageUsers && organizationId && (
        <UserManagementTable
          organizationId={organizationId}
          onCreateUser={handleCreateUser}
          onEditUser={handleEditUser}
        />
      )}

      {/* User Form Modal */}
      {organizationId && (
        <UserForm
          open={isUserModalOpen}
          onClose={handleModalClose}
          onSubmit={handleSaveUser}
          user={selectedUser}
          organizationId={organizationId}
          isSubmitting={isSubmitting}
          error={usersError}
        />
      )}

      {/* Success Notification */}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={4000}
        onClose={handleSuccessClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSuccessClose} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default OrganizationDetailPage