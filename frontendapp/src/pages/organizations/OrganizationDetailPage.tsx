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
  Chip,
  Tabs,
  Tab
} from '@mui/material'
import { 
  Home as HomeIcon, 
  Business as BusinessIcon,
  People as PeopleIcon,
  Tag as ChannelIcon
} from '@mui/icons-material'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useUserStore } from '@/stores/userStore'
import { useChannelStore } from '@/stores'
import { useAuthStore } from '@/stores/authStore'
import { UserManagementTable, UserForm } from '@/components/users'
import { ChannelList, ChannelForm, MemberManagementDialog, DeleteChannelDialog } from '@/components'
import type { Organization } from '@/types/organization'
import type { User } from '@/types/user'
import type { CreateUserRequest } from '@/services/userService'
import type { UserCreateForm, UserUpdateForm } from '@/types/user'
import type { ChannelWithDetails, ChannelCreateForm, ChannelUpdateForm } from '@/types/channel'

const OrganizationDetailPage = () => {
  const { id: organizationId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  // Auth and permissions
  const { user: currentUser, canAccess } = useAuthStore()
  
  // Stores
  const { organizations, fetchOrganization } = useOrganizationStore()
  const {
    fetchUsersByOrg,
    createUser,
    updateUser,
    getUserStats,
    error: usersError,
    clearError: clearUsersError
  } = useUserStore()
  const {
    channels,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    isLoading: channelsLoading,
    error: channelsError,
    clearError: clearChannelsError
  } = useChannelStore()

  // Local state for UI
  const [tabValue, setTabValue] = useState(0)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [userFormMode, setUserFormMode] = useState<'create' | 'edit'>('create')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [userStats, setUserStats] = useState<{ total: number; byRole: Record<string, number> }>({ total: 0, byRole: {} })

  // Channel management state
  const [selectedChannel, setSelectedChannel] = useState<ChannelWithDetails | null>(null)
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false)
  const [channelFormMode, setChannelFormMode] = useState<'create' | 'edit'>('create')
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)
  const [isDeleteChannelDialogOpen, setIsDeleteChannelDialogOpen] = useState(false)

  // Check permissions
  const canManageUsers = canAccess(['god', 'admin'])
  const canViewOrganization = canAccess(['god']) || (canAccess(['admin']) && currentUser?.organization_id === organizationId)

  useEffect(() => {
    if (!organizationId) {
      navigate('/organizations')
      return
    }

    if (!canViewOrganization) {
      navigate('/dashboard')
      return
    }

    // Load organization data
    const loadOrganization = async () => {
      try {
        // First check if we already have it in the store
        const existingOrg = organizations.find(o => o.id === organizationId)
        if (existingOrg) {
          setOrganization(existingOrg)
        } else {
          // Fetch the organization
          const org = await fetchOrganization(organizationId)
          setOrganization(org)
        }
      } catch (error) {
        console.error('Failed to load organization:', error)
        // Organization will remain null, triggering the "not found" message
      }
    }

    loadOrganization()

    // Fetch users and stats
    if (canManageUsers) {
      fetchUsersByOrg(organizationId)
      loadUserStats()
    }

    // Fetch channels
    if (canManageUsers) {
      fetchChannels(organizationId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, canViewOrganization, canManageUsers, organizations, fetchOrganization, fetchUsersByOrg, fetchChannels, navigate])

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


  const handleSaveUser = async (userData: UserCreateForm | UserUpdateForm) => {
    if (!organizationId) return
    
    setIsSubmitting(true)
    try {
      if (userFormMode === 'create') {
        const createData = userData as UserCreateForm
        await createUser({
          email: createData.email!,
          organization_id: organizationId,
          role: createData.role!,
          password: createData.auto_generate_password ? undefined : createData.password,
          auto_generate_password: createData.auto_generate_password,
          whatsapp_id: createData.whatsapp_id || undefined,
          instagram_id: createData.instagram_id || undefined,
          send_welcome_email: createData.send_welcome_email || true
        } as CreateUserRequest)
        setSuccessMessage('User created successfully')
      } else if (selectedUser) {
        const updateData = userData as UserUpdateForm
        await updateUser(selectedUser.id, {
          email: updateData.email,
          role: updateData.role,
          whatsapp_id: updateData.whatsapp_id || null,
          instagram_id: updateData.instagram_id || null
        })
        setSuccessMessage('User updated successfully')
      }
      
      setIsUserModalOpen(false)
      setSelectedUser(null)
      await loadUserStats()
    } catch {
      // Error handled by store
    } finally {
      setIsSubmitting(false)
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

  // Tab management
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // Channel management handlers
  const handleCreateChannel = () => {
    setSelectedChannel(null)
    setChannelFormMode('create')
    setIsChannelModalOpen(true)
  }

  const handleEditChannel = (channel: ChannelWithDetails) => {
    setSelectedChannel(channel)
    setChannelFormMode('edit')
    setIsChannelModalOpen(true)
  }

  const handleDeleteChannel = (channel: ChannelWithDetails) => {
    setSelectedChannel(channel)
    setIsDeleteChannelDialogOpen(true)
  }

  const handleManageMembers = (channel: ChannelWithDetails) => {
    setSelectedChannel(channel)
    setIsMemberDialogOpen(true)
  }

  const handleSaveChannel = async (channelData: ChannelCreateForm | ChannelUpdateForm) => {
    console.log('🔵 OrganizationDetailPage: handleSaveChannel called', { channelData, organizationId, currentUser: currentUser?.id })
    
    if (!organizationId || !currentUser) {
      console.error('🔴 OrganizationDetailPage: Missing organizationId or currentUser', { organizationId, currentUser })
      return
    }
    
    setIsSubmitting(true)
    try {
      if (channelFormMode === 'create') {
        console.log('🟡 OrganizationDetailPage: Creating channel')
        const createData = channelData as ChannelCreateForm
        await createChannel(createData, organizationId, currentUser.id)
        setSuccessMessage('Channel created successfully')
      } else if (selectedChannel) {
        console.log('🟡 OrganizationDetailPage: Updating channel')
        const updateData = channelData as ChannelUpdateForm
        await updateChannel(selectedChannel.id, updateData)
        setSuccessMessage('Channel updated successfully')
      }
      
      setIsChannelModalOpen(false)
      setSelectedChannel(null)
    } catch (error) {
      console.error('🔴 OrganizationDetailPage: Error in handleSaveChannel', error)
      // Error handled by store
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDeleteChannel = async () => {
    if (!selectedChannel) return
    
    try {
      await deleteChannel(selectedChannel.id)
      setSuccessMessage('Channel deleted successfully')
      setIsDeleteChannelDialogOpen(false)
      setSelectedChannel(null)
    } catch {
      // Error handled by store
    }
  }

  const handleChannelModalClose = () => {
    setIsChannelModalOpen(false)
    setSelectedChannel(null)
    clearChannelsError()
  }

  const handleMemberDialogClose = () => {
    setIsMemberDialogOpen(false)
    setSelectedChannel(null)
  }

  const handleDeleteChannelDialogClose = () => {
    setIsDeleteChannelDialogOpen(false)
    setSelectedChannel(null)
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
      {(usersError || channelsError) && (
        <Alert 
          severity="error" 
          onClose={() => {
            clearUsersError()
            clearChannelsError()
          }}
          sx={{ mb: 3 }}
        >
          {usersError || channelsError}
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

      {/* Management Tabs */}
      {canManageUsers && organizationId && (
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab 
                icon={<PeopleIcon />} 
                label={`Users (${userStats.total})`} 
                iconPosition="start"
              />
              <Tab 
                icon={<ChannelIcon />} 
                label={`Channels (${channels.length})`} 
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Users Tab */}
          {tabValue === 0 && (
            <UserManagementTable
              organizationId={organizationId}
              onCreateUser={handleCreateUser}
              onEditUser={handleEditUser}
            />
          )}

          {/* Channels Tab */}
          {tabValue === 1 && (
            <ChannelList
              organizationId={organizationId}
              onCreateClick={handleCreateChannel}
              onEditClick={handleEditChannel}
              onDeleteClick={handleDeleteChannel}
              onManageMembersClick={handleManageMembers}
            />
          )}
        </Box>
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

      {/* Channel Form Modal */}
      {organizationId && (
        <ChannelForm
          open={isChannelModalOpen}
          onClose={handleChannelModalClose}
          onSubmit={handleSaveChannel}
          channel={selectedChannel}
          isSubmitting={isSubmitting}
          error={channelsError}
        />
      )}

      {/* Member Management Dialog */}
      {selectedChannel && organizationId && (
        <MemberManagementDialog
          open={isMemberDialogOpen}
          onClose={handleMemberDialogClose}
          channel={selectedChannel}
          organizationId={organizationId}
        />
      )}

      {/* Delete Channel Dialog */}
      {selectedChannel && (
        <DeleteChannelDialog
          open={isDeleteChannelDialogOpen}
          onClose={handleDeleteChannelDialogClose}
          onConfirm={handleConfirmDeleteChannel}
          channel={selectedChannel}
          isDeleting={channelsLoading}
          error={channelsError}
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