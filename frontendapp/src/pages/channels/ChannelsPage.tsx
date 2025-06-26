import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { useChannelStore } from '@/stores/channelStore'
import { useUserStore } from '@/stores/userStore'
import { useAuthStore } from '@/stores/authStore'
import ChannelList from '@/components/channels/ChannelList'
import CreateChannelDialog from '@/components/channels/CreateChannelDialog'
import AssignUsersDialog from '@/components/channels/AssignUsersDialog'
import DeleteConfirmationDialog from '@/components/organizations/DeleteConfirmationDialog'
import type { Channel, ChannelCreateForm, ChannelUpdateForm, CHANNEL_TYPES } from '@/types/channel'

const ChannelsPage = () => {
  const { user } = useAuthStore()
  const {
    channelsByOrganization,
    channelDetails,
    isLoading,
    error: channelError,
    fetchChannelsByOrg,
    fetchChannelDetails,
    createChannel,
    updateChannel,
    deleteChannel,
    clearError,
    getChannelsByOrg,
    getChannelDetails,
  } = useChannelStore()

  const { fetchUsersByOrg } = useUserStore()

  // Local state
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [privacyFilter, setPrivacyFilter] = useState<string>('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [selectedChannelForMembers, setSelectedChannelForMembers] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const organizationId = user?.organization_id

  // Load data on mount
  useEffect(() => {
    if (organizationId) {
      loadChannels()
      loadUsers()
    }
  }, [organizationId])

  const loadChannels = async () => {
    if (!organizationId) return
    try {
      await fetchChannelsByOrg(organizationId)
    } catch (error) {
      console.error('Error loading channels:', error)
    }
  }

  const loadUsers = async () => {
    if (!organizationId) return
    try {
      await fetchUsersByOrg(organizationId)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleCreateChannel = async (data: ChannelCreateForm) => {
    if (!organizationId) return

    setIsSubmitting(true)
    try {
      await createChannel({
        ...data,
        organization_id: organizationId,
      })
      setSuccessMessage('Channel created successfully!')
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Error creating channel:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateChannel = async (data: ChannelUpdateForm) => {
    if (!selectedChannel) return

    setIsSubmitting(true)
    try {
      await updateChannel(selectedChannel.id, data)
      setSuccessMessage('Channel updated successfully!')
      setIsCreateDialogOpen(false)
      setSelectedChannel(null)
    } catch (error) {
      console.error('Error updating channel:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteChannel = async () => {
    if (!selectedChannel || !organizationId) return

    setIsSubmitting(true)
    try {
      await deleteChannel(selectedChannel.id, organizationId)
      setSuccessMessage('Channel deleted successfully!')
      setIsDeleteDialogOpen(false)
      setSelectedChannel(null)
    } catch (error) {
      console.error('Error deleting channel:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleManageMembers = async (channelId: string) => {
    try {
      await fetchChannelDetails(channelId)
      setSelectedChannelForMembers(channelId)
      setIsAssignDialogOpen(true)
    } catch (error) {
      console.error('Error fetching channel details:', error)
    }
  }

  const handleAssignUsersSuccess = () => {
    setSuccessMessage('Channel members updated successfully!')
    setIsAssignDialogOpen(false)
    setSelectedChannelForMembers(null)
  }

  const handleRefresh = () => {
    loadChannels()
    loadUsers()
  }

  const handleCloseSnackbar = () => {
    setSuccessMessage(null)
    clearError()
  }

  // Filter channels based on search and filters
  const channels = organizationId ? getChannelsByOrg(organizationId) : []
  const filteredChannels = channels.filter((channel) => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !typeFilter || channel.type === typeFilter
    const matchesPrivacy = privacyFilter === '' || 
      (privacyFilter === 'private' && channel.is_private) ||
      (privacyFilter === 'public' && !channel.is_private)
    
    return matchesSearch && matchesType && matchesPrivacy
  })

  const canManageChannels = user?.role === 'admin' || user?.role === 'god'

  if (!organizationId) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'grey.900', mb: 3 }}>
          Channels
        </Typography>
        <Alert severity="error">
          No organization selected. Please contact your administrator.
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'grey.900' }}>
          Channels
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Refresh
          </Button>
          {canManageChannels && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={isLoading}
            >
              Create Channel
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          placeholder="Search channels..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="general">General</MenuItem>
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="announcements">Announcements</MenuItem>
            <MenuItem value="support">Support</MenuItem>
            <MenuItem value="voice">Voice</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Privacy</InputLabel>
          <Select
            value={privacyFilter}
            label="Privacy"
            onChange={(e) => setPrivacyFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="public">Public</MenuItem>
            <MenuItem value="private">Private</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Error Display */}
      {channelError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
          {channelError}
        </Alert>
      )}

      {/* Channel List */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <ChannelList
          channels={filteredChannels}
          onEditChannel={(channel) => {
            setSelectedChannel(channel)
            setIsCreateDialogOpen(true)
          }}
          onDeleteChannel={(channel) => {
            setSelectedChannel(channel)
            setIsDeleteDialogOpen(true)
          }}
          onManageMembers={handleManageMembers}
        />
      )}

      {/* Create/Edit Channel Dialog */}
      <CreateChannelDialog
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false)
          setSelectedChannel(null)
        }}
        onSubmit={selectedChannel ? handleUpdateChannel : handleCreateChannel}
        channel={selectedChannel}
        isSubmitting={isSubmitting}
        error={channelError}
      />

      {/* Assign Users Dialog */}
      <AssignUsersDialog
        open={isAssignDialogOpen}
        onClose={() => {
          setIsAssignDialogOpen(false)
          setSelectedChannelForMembers(null)
        }}
        channel={selectedChannelForMembers ? getChannelDetails(selectedChannelForMembers) : null}
        organizationId={organizationId}
        isSubmitting={isSubmitting}
        error={channelError}
        onSuccess={handleAssignUsersSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false)
          setSelectedChannel(null)
        }}
        onConfirm={handleDeleteChannel}
        title="Delete Channel"
        content={`Are you sure you want to delete the channel "${selectedChannel?.name}"? This action cannot be undone and will remove all channel data and member assignments.`}
        isSubmitting={isSubmitting}
      />

      {/* Success/Error Snackbar */}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ChannelsPage