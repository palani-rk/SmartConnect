import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Tooltip,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Button,
  Chip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Add as AddIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  People as PeopleIcon,
  Lock as LockIcon,
  Public as PublicIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { useChannelStore } from '../stores/channelStore'
import { useAuthStore } from '@/stores/authStore'
import ChannelForm from './ChannelForm'
import DeleteChannelDialog from './DeleteChannelDialog'
import MemberManagementDialog from './MemberManagementDialog'
import type { ChannelWithDetails, ChannelCreateForm, ChannelUpdateForm } from '../types/channel'

interface ChannelListProps {
  organizationId: string
}

const ChannelList: React.FC<ChannelListProps> = ({
  organizationId,
}) => {
  const {
    channels,
    isLoading,
    error,
    total,
    hasMore,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    clearError,
  } = useChannelStore()
  
  const { user } = useAuthStore()

  // Dialog state management
  const [selectedChannel, setSelectedChannel] = useState<ChannelWithDetails | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showMemberDialog, setShowMemberDialog] = useState(false)
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'public' | 'private'>('all')
  const [sortField, setSortField] = useState<'name' | 'created_at' | 'member_count'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Track if initial load has completed
  const hasInitialLoaded = useRef(false)

  // Initial load - runs once on mount
  useEffect(() => {
    console.log('🔵 Channel list initial load effect triggered')
    fetchChannels(organizationId)
    hasInitialLoaded.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]) // Only run when organizationId changes

  // State changes - only runs after initial load
  useEffect(() => {
    if (!hasInitialLoaded.current) {
      return
    }

    console.log('🟡 Channel list state change effect triggered', {
      searchTerm,
      typeFilter,
      sortField,
      sortOrder
    })

    const timer = setTimeout(() => {
      const params = { 
        search: searchTerm || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      }
      fetchChannels(organizationId, params)
    }, searchTerm !== '' ? 300 : 0) // Debounce search, immediate for filters

    return () => clearTimeout(timer)
  }, [searchTerm, typeFilter, sortField, sortOrder, organizationId, fetchChannels])

  const handleSort = useCallback((field: 'name' | 'created_at' | 'member_count') => {
    console.log('🔴 Channel sort handler triggered', {
      field,
      currentSortField: sortField,
      currentSortOrder: sortOrder
    })
    
    const newSortOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc'
    setSortField(field)
    setSortOrder(newSortOrder)
    
    const params = {
      search: searchTerm || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
    }
    
    fetchChannels(organizationId, params)
  }, [sortField, sortOrder, searchTerm, typeFilter, organizationId, fetchChannels])

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  const handleSearchClear = () => {
    setSearchTerm('')
  }

  const handleTypeFilterChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setTypeFilter(event.target.value as 'all' | 'public' | 'private')
  }

  // Dialog action handlers
  const handleCreateClick = () => {
    setSelectedChannel(null)
    setFormError(null)
    setShowCreateForm(true)
  }

  const handleEditClick = useCallback((channel: ChannelWithDetails) => {
    setSelectedChannel(channel)
    setFormError(null)
    setShowEditForm(true)
  }, [])

  const handleDeleteClick = useCallback((channel: ChannelWithDetails) => {
    setSelectedChannel(channel)
    setShowDeleteDialog(true)
  }, [])

  const handleManageMembersClick = useCallback((channel: ChannelWithDetails) => {
    setSelectedChannel(channel)
    setShowMemberDialog(true)
  }, [])

  // Form submission handlers
  const handleChannelSubmit = async (data: ChannelCreateForm | ChannelUpdateForm) => {
    if (!user?.id) {
      setFormError('User not authenticated')
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      if (selectedChannel) {
        // Edit existing channel
        await updateChannel(selectedChannel.id, data as ChannelUpdateForm)
      } else {
        // Create new channel
        await createChannel(data as ChannelCreateForm, organizationId, user.id)
      }
      
      // Close form on success
      setShowCreateForm(false)
      setShowEditForm(false)
      setSelectedChannel(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save channel'
      setFormError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChannelDelete = async () => {
    if (!selectedChannel) return

    try {
      await deleteChannel(selectedChannel.id)
      setShowDeleteDialog(false)
      setSelectedChannel(null)
    } catch (error) {
      // Error is handled by the store and shown in the dialog
      console.error('Delete error:', error)
    }
  }

  // Dialog close handlers
  const handleFormClose = () => {
    if (!isSubmitting) {
      setShowCreateForm(false)
      setShowEditForm(false)
      setSelectedChannel(null)
      setFormError(null)
    }
  }

  const handleDeleteClose = () => {
    setShowDeleteDialog(false)
    setSelectedChannel(null)
  }

  const handleMemberDialogClose = () => {
    setShowMemberDialog(false)
    setSelectedChannel(null)
  }

  const getSortIcon = (field: 'name' | 'created_at' | 'member_count') => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
  }

  // Sort channels locally since the API doesn't handle sorting yet
  const sortedChannels = React.useMemo(() => {
    return [...channels].sort((a, b) => {
      let aVal: string | number
      let bVal: string | number

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'member_count':
          aVal = a.member_count
          bVal = b.member_count
          break
        case 'created_at':
        default:
          aVal = new Date(a.created_at || 0).getTime()
          bVal = new Date(b.created_at || 0).getTime()
          break
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [channels, sortField, sortOrder])

  const getChannelTypeIcon = (type: string) => {
    return type === 'private' ? <LockIcon fontSize="small" /> : <PublicIcon fontSize="small" />
  }

  const getChannelTypeColor = (type: string) => {
    return type === 'private' ? 'warning' : 'success'
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Channels
        </Typography>
        <Tooltip title="Create new channel">
          <IconButton
            color="primary"
            onClick={handleCreateClick}
            size="large"
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Search and Filters */}
      <Box mb={2} display="flex" gap={2} alignItems="center">
        <TextField
          variant="outlined"
          placeholder="Search channels..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleSearchClear}
                  edge="end"
                >
                  ×
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 300, flexGrow: 1 }}
        />
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            onChange={handleTypeFilterChange}
            label="Type"
            size="small"
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="public">Public</MenuItem>
            <MenuItem value="private">Private</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Data Table */}
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('name')}
                  IconComponent={() => getSortIcon('name')}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    Channel Name
                  </Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell width={100}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Type
                </Typography>
              </TableCell>
              <TableCell width={120}>
                <TableSortLabel
                  active={sortField === 'member_count'}
                  direction={sortField === 'member_count' ? sortOrder : 'asc'}
                  onClick={() => handleSort('member_count')}
                  IconComponent={() => getSortIcon('member_count')}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    Members
                  </Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell width={160}>
                <TableSortLabel
                  active={sortField === 'created_at'}
                  direction={sortField === 'created_at' ? sortOrder : 'asc'}
                  onClick={() => handleSort('created_at')}
                  IconComponent={() => getSortIcon('created_at')}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    Created
                  </Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell width={150} align="center">
                <Typography variant="subtitle2" fontWeight="bold">
                  Actions
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Loading channels...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : sortedChannels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {searchTerm || typeFilter !== 'all' 
                      ? 'No channels found matching your criteria.' 
                      : 'No channels yet.'
                    }
                  </Typography>
                  {!searchTerm && typeFilter === 'all' && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleCreateClick}
                      sx={{ mt: 2 }}
                    >
                      Create First Channel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              sortedChannels.map((channel) => (
                <TableRow
                  key={channel.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Box>
                      <Typography 
                        variant="body1" 
                        fontWeight={500}
                        sx={{ mb: 0.5 }}
                      >
                        #{channel.name}
                      </Typography>
                      {channel.description && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {channel.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getChannelTypeIcon(channel.type)}
                      label={channel.type}
                      size="small"
                      color={getChannelTypeColor(channel.type) as 'warning' | 'success'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <PeopleIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {channel.member_count}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {channel.created_at
                        ? format(new Date(channel.created_at), 'MMM dd, yyyy')
                        : '-'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={0.5} justifyContent="center">
                      <Tooltip title="Manage members">
                        <IconButton
                          size="small"
                          onClick={() => handleManageMembersClick(channel)}
                          color="info"
                        >
                          <PeopleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit channel">
                        <IconButton
                          size="small"
                          onClick={() => handleEditClick(channel)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Channel settings">
                        <IconButton
                          size="small"
                          onClick={() => handleEditClick(channel)}
                          color="default"
                        >
                          <SettingsIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete channel">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(channel)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary */}
      <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {total === 0 ? 'No channels found' : `${total} channel${total === 1 ? '' : 's'} total`}
          {hasMore && (
            <Typography component="span" variant="body2" color="text.secondary">
              {' • More available'}
            </Typography>
          )}
        </Typography>
        {isLoading && (
          <Box display="flex" alignItems="center" gap={1}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          </Box>
        )}
      </Box>

      {/* Channel Form Dialogs */}
      {showCreateForm && (
        <ChannelForm
          open={showCreateForm}
          onClose={handleFormClose}
          onSubmit={handleChannelSubmit}
          isSubmitting={isSubmitting}
          error={formError}
        />
      )}

      {showEditForm && selectedChannel && (
        <ChannelForm
          open={showEditForm}
          onClose={handleFormClose}
          onSubmit={handleChannelSubmit}
          channel={selectedChannel}
          isSubmitting={isSubmitting}
          error={formError}
        />
      )}

      {/* Delete Channel Dialog */}
      {showDeleteDialog && selectedChannel && (
        <DeleteChannelDialog
          open={showDeleteDialog}
          onClose={handleDeleteClose}
          onConfirm={handleChannelDelete}
          channel={selectedChannel}
          isDeleting={isSubmitting}
          error={error}
        />
      )}

      {/* Member Management Dialog */}
      {showMemberDialog && selectedChannel && (
        <MemberManagementDialog
          open={showMemberDialog}
          onClose={handleMemberDialogClose}
          channel={selectedChannel}
          organizationId={organizationId}
        />
      )}
    </Box>
  )
}

export default ChannelList