import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Divider,
} from '@mui/material'
import { 
  Close as CloseIcon, 
  Search as SearchIcon, 
  Person as PersonIcon
} from '@mui/icons-material'
import { useChannelStore } from '@/stores/channelStore'
import { useUserStore } from '@/stores/userStore'
import type { User } from '@/types/user'
import type { ChannelWithMembers } from '@/services/channelService'

interface AssignUsersDialogProps {
  open: boolean
  onClose: () => void
  channel: ChannelWithMembers | null
  organizationId: string
  isSubmitting?: boolean
  error?: string | null
  onSuccess?: () => void
}

const AssignUsersDialog: React.FC<AssignUsersDialogProps> = ({
  open,
  onClose,
  channel,
  organizationId,
  isSubmitting = false,
  error,
  onSuccess,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  const { assignUsersToChannel } = useChannelStore()
  const { getUsersByOrg } = useUserStore()

  // Load available users when dialog opens
  useEffect(() => {
    if (open && channel && organizationId) {
      loadAvailableUsers()
      // Initialize with current members
      const currentMemberIds = new Set(channel.members.map(m => m.id))
      setSelectedUserIds(currentMemberIds)
    }
  }, [open, channel?.id, organizationId])

  const loadAvailableUsers = async () => {
    if (!channel) return
    
    setIsLoadingUsers(true)
    try {
      // Get all users in organization 
      const allUsers = getUsersByOrg(organizationId)
      setAvailableUsers(allUsers)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setSearchTerm('')
      setSelectedUserIds(new Set())
      onClose()
    }
  }

  const handleUserToggle = (userId: string) => {
    const newSelected = new Set(selectedUserIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUserIds(newSelected)
  }

  const handleSubmit = async () => {
    if (!channel) return

    try {
      await assignUsersToChannel(channel.id, Array.from(selectedUserIds))
      onSuccess?.()
      handleClose()
    } catch (error) {
      console.error('Error assigning users:', error)
    }
  }

  const filteredUsers = availableUsers.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const currentMembers = channel?.members || []
  const newlySelectedUsers = availableUsers.filter(u => 
    selectedUserIds.has(u.id) && !currentMembers.some(m => m.id === u.id)
  )
  const removedUsers = currentMembers.filter(m => !selectedUserIds.has(m.id))
  
  const hasChanges = newlySelectedUsers.length > 0 || removedUsers.length > 0

  if (!channel) return null

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={isSubmitting}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" component="div">
              Manage Channel Members
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {channel.name} • {channel.is_private ? 'Private' : 'Public'} Channel
            </Typography>
          </Box>
          <IconButton
            edge="end"
            color="inherit"
            onClick={handleClose}
            disabled={isSubmitting}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box display="flex" flexDirection="column" gap={3}>
          {/* Search */}
          <TextField
            fullWidth
            placeholder="Search users by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            disabled={isSubmitting || isLoadingUsers}
          />

          {/* Summary of changes */}
          {hasChanges && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Changes Summary:
              </Typography>
              {newlySelectedUsers.length > 0 && (
                <Box mb={1}>
                  <Typography variant="body2" color="success.main" gutterBottom>
                    Adding {newlySelectedUsers.length} user(s):
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {newlySelectedUsers.map(user => (
                      <Chip 
                        key={user.id} 
                        label={user.email} 
                        size="small" 
                        color="success"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
              {removedUsers.length > 0 && (
                <Box mb={1}>
                  <Typography variant="body2" color="error.main" gutterBottom>
                    Removing {removedUsers.length} user(s):
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {removedUsers.map(user => (
                      <Chip 
                        key={user.id} 
                        label={user.email} 
                        size="small" 
                        color="error"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
              <Divider sx={{ mt: 2 }} />
            </Box>
          )}

          {/* User List */}
          {isLoadingUsers ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Organization Users ({filteredUsers.length}):
              </Typography>
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.has(user.id)
                  const isCurrentMember = currentMembers.some(m => m.id === user.id)
                  
                  return (
                    <ListItem
                      key={user.id}
                      sx={{
                        bgcolor: isSelected ? 'action.selected' : 'transparent',
                        '&:hover': {
                          bgcolor: isSelected ? 'action.selected' : 'action.hover',
                        },
                      }}
                    >
                      <ListItemButton
                        onClick={() => handleUserToggle(user.id)}
                        disabled={isSubmitting}
                      >
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        <PersonIcon />
                      </Avatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body1">
                              {user.email}
                            </Typography>
                            {isCurrentMember && (
                              <Chip 
                                label="Current Member" 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box display="flex" alignItems="center" gap={2}>
                            <Typography variant="caption" color="text.secondary">
                              Role: {user.role}
                            </Typography>
                            {user.whatsapp_id && (
                              <Typography variant="caption" color="text.secondary">
                                WhatsApp: {user.whatsapp_id}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      </ListItemButton>
                      <ListItemSecondaryAction>
                        <Checkbox
                          edge="end"
                          checked={isSelected}
                          onChange={() => handleUserToggle(user.id)}
                          disabled={isSubmitting}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  )
                })}
              </List>

              {filteredUsers.length === 0 && (
                <Box textAlign="center" py={3}>
                  <Typography color="text.secondary">
                    {searchTerm ? 'No users found matching your search.' : 'No users available.'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Current selection count */}
          <Typography variant="body2" color="text.secondary">
            Selected: {selectedUserIds.size} user(s)
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          disabled={isSubmitting}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!hasChanges || isSubmitting || isLoadingUsers}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
        >
          {isSubmitting ? 'Updating...' : 'Update Members'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AssignUsersDialog