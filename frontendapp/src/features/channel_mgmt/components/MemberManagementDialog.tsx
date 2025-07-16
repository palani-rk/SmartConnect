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
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Checkbox,
  FormControlLabel,
  Tab,
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material'
import { useUserStore } from '@/stores/userStore'
import { useChannelStore } from '../stores/channelStore'
import type { ChannelWithDetails } from '../types/channel'

interface MemberManagementDialogProps {
  open: boolean
  onClose: () => void
  channel: ChannelWithDetails
  organizationId: string
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`member-tabpanel-${index}`}
      aria-labelledby={`member-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  )
}

const MemberManagementDialog: React.FC<MemberManagementDialogProps> = ({
  open,
  onClose,
  channel,
  organizationId,
}) => {
  const { getUsersByOrg, fetchUsersByOrg, isLoading: isLoadingUsers } = useUserStore()
  const { 
    addUsersToChannel, 
    removeUserFromChannel, 
    updateMemberRole,
    isManagingMembers,
    memberError,
    clearMemberError,
  } = useChannelStore()

  const [tabValue, setTabValue] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get all organization users
  const allUsers = getUsersByOrg(organizationId)
  
  // Get users not in channel
  const availableUsers = allUsers.filter(user => 
    !channel.members.some(member => member.id === user.id)
  )

  // Filter available users based on search
  const filteredAvailableUsers = availableUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter current members based on search
  const filteredCurrentMembers = channel.members.filter(member =>
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Fetch users when dialog opens
  useEffect(() => {
    if (open && organizationId) {
      // Check if we already have users for this organization
      const existingUsers = getUsersByOrg(organizationId)
      if (existingUsers.length === 0) {
        // Fetch users if we don't have them yet
        fetchUsersByOrg(organizationId).catch(error => {
          console.error('Failed to fetch organization users:', error)
        })
      }
    }
  }, [open, organizationId, getUsersByOrg, fetchUsersByOrg])

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setTabValue(0)
      setSearchTerm('')
      setSelectedUsers(new Set())
      setNewMemberRole('member')
      clearMemberError()
    }
  }, [open, clearMemberError])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
    setSearchTerm('')
    setSelectedUsers(new Set())
  }

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  const handleUserSelection = (userId: string, checked: boolean) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(userId)
      } else {
        newSet.delete(userId)
      }
      return newSet
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(filteredAvailableUsers.map(user => user.id)))
    } else {
      setSelectedUsers(new Set())
    }
  }

  const handleAddMembers = async () => {
    if (selectedUsers.size === 0) return

    setIsSubmitting(true)
    try {
      await addUsersToChannel(channel.id, Array.from(selectedUsers), newMemberRole)
      setSelectedUsers(new Set())
      setTabValue(1) // Switch to current members tab
    } catch (error) {
      console.error('Failed to add members:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeUserFromChannel(channel.id, userId)
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const handleUpdateMemberRole = async (userId: string, newRole: 'admin' | 'member') => {
    try {
      await updateMemberRole(channel.id, userId, newRole)
    } catch (error) {
      console.error('Failed to update member role:', error)
    }
  }

  const handleClose = () => {
    if (!isManagingMembers && !isSubmitting) {
      onClose()
    }
  }


  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={isManagingMembers || isSubmitting}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="div">
            Manage Members - #{channel.name}
          </Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={handleClose}
            disabled={isManagingMembers || isSubmitting}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {(memberError || memberError) && (
          <Alert severity="error" sx={{ m: 2 }} onClose={clearMemberError}>
            {memberError}
          </Alert>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`Add Members (${filteredAvailableUsers.length} available)`} />
            <Tab label={`Current Members (${channel.member_count})`} />
          </Tabs>
        </Box>

        {/* Search */}
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={tabValue === 0 ? "Search available users..." : "Search current members..."}
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            size="small"
          />
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          {/* Add Members Tab */}
          <Box sx={{ px: 2, pb: 2 }}>
            {isLoadingUsers ? (
              <Box textAlign="center" py={4}>
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Loading organization users...
                </Typography>
              </Box>
            ) : filteredAvailableUsers.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  {availableUsers.length === 0 
                    ? 'All organization users are already members of this channel.'
                    : 'No users found matching your search.'
                  }
                </Typography>
              </Box>
            ) : (
              <>
                {/* Bulk selection controls */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedUsers.size === filteredAvailableUsers.length && filteredAvailableUsers.length > 0}
                        indeterminate={selectedUsers.size > 0 && selectedUsers.size < filteredAvailableUsers.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        disabled={isManagingMembers}
                      />
                    }
                    label={`Select all (${filteredAvailableUsers.length})`}
                  />
                  
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'member')}
                      label="Role"
                      disabled={isManagingMembers}
                    >
                      <MenuItem value="member">Member</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {selectedUsers.size > 0 && (
                  <Box mb={2}>
                    <Button
                      variant="contained"
                      startIcon={isSubmitting ? <CircularProgress size={16} /> : <AddIcon />}
                      onClick={handleAddMembers}
                      disabled={isManagingMembers || isSubmitting}
                      fullWidth
                    >
                      {isSubmitting 
                        ? `Adding ${selectedUsers.size} member${selectedUsers.size === 1 ? '' : 's'}...`
                        : `Add ${selectedUsers.size} member${selectedUsers.size === 1 ? '' : 's'} as ${newMemberRole}${selectedUsers.size === 1 ? '' : 's'}`
                      }
                    </Button>
                  </Box>
                )}

                {/* Available users list */}
                <List dense>
                  {filteredAvailableUsers.map((user) => (
                    <ListItem key={user.id}>
                      <ListItemAvatar>
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onChange={(e) => handleUserSelection(user.id, e.target.checked)}
                          disabled={isManagingMembers}
                        />
                      </ListItemAvatar>
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.email}
                        secondary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip 
                              size="small" 
                              label={user.role} 
                              variant="outlined"
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Current Members Tab */}
          <Box sx={{ px: 2, pb: 2 }}>
            {filteredCurrentMembers.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  {channel.members.length === 0 
                    ? 'No members in this channel yet.'
                    : 'No members found matching your search.'
                  }
                </Typography>
              </Box>
            ) : (
              <List dense>
                {filteredCurrentMembers.map((member) => (
                  <ListItem key={member.id}>
                    <ListItemAvatar>
                      <Avatar>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={member.email}
                      secondary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="caption" color="text.secondary">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" alignItems="center" gap={1}>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <Select
                            value={member.membership_role}
                            onChange={(e) => handleUpdateMemberRole(member.id, e.target.value as 'admin' | 'member')}
                            disabled={isManagingMembers}
                          >
                            <MenuItem value="member">Member</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                          </Select>
                        </FormControl>
                        
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={isManagingMembers}
                          color="error"
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>

        {/* Loading overlay */}
        {isManagingMembers && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bgcolor="rgba(255, 255, 255, 0.8)"
            zIndex={1}
          >
            <CircularProgress />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          disabled={isManagingMembers || isSubmitting}
          color="inherit"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default MemberManagementDialog