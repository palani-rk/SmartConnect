import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Avatar,
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Lock as LockIcon,
  Public as PublicIcon,
  Tag as TagIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import type { Channel } from '@/types/channel'

interface ChannelListProps {
  channels: Channel[]
  isLoading?: boolean
  onEditChannel: (channel: Channel) => void
  onDeleteChannel: (channel: Channel) => void
  onManageMembers: (channelId: string) => void
  onViewChannelDetails?: (channelId: string) => void
}

const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  isLoading = false,
  onEditChannel,
  onDeleteChannel,
  onManageMembers,
  onViewChannelDetails,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, channel: Channel) => {
    setAnchorEl(event.currentTarget)
    setSelectedChannel(channel)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedChannel(null)
  }

  const handleEdit = () => {
    if (selectedChannel) {
      onEditChannel(selectedChannel)
    }
    handleMenuClose()
  }

  const handleDelete = () => {
    if (selectedChannel) {
      onDeleteChannel(selectedChannel)
    }
    handleMenuClose()
  }

  const handleManageMembers = () => {
    if (selectedChannel) {
      onManageMembers(selectedChannel.id)
    }
    handleMenuClose()
  }

  const handleViewDetails = () => {
    if (selectedChannel && onViewChannelDetails) {
      onViewChannelDetails(selectedChannel.id)
    }
    handleMenuClose()
  }

  const getChannelTypeColor = (type: string) => {
    switch (type) {
      case 'general':
        return 'primary'
      case 'announcements':
        return 'warning'
      case 'support':
        return 'info'
      case 'voice':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getChannelTypeIcon = (type: string) => {
    switch (type) {
      case 'general':
        return <TagIcon fontSize="small" />
      case 'announcements':
        return <TagIcon fontSize="small" />
      case 'support':
        return <TagIcon fontSize="small" />
      case 'voice':
        return <TagIcon fontSize="small" />
      default:
        return <TagIcon fontSize="small" />
    }
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography>Loading channels...</Typography>
      </Box>
    )
  }

  if (channels.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Channels Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first channel to get started with team collaboration.
        </Typography>
      </Paper>
    )
  }

  return (
    <>
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Channel</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Privacy</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {channels.map((channel) => (
              <TableRow
                key={channel.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onViewChannelDetails?.(channel.id)}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        bgcolor: channel.is_private ? 'warning.main' : 'primary.main' 
                      }}
                    >
                      {channel.is_private ? <LockIcon fontSize="small" /> : <PublicIcon fontSize="small" />}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {channel.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {channel.id.slice(0, 8)}...
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getChannelTypeIcon(channel.type)}
                    label={channel.type}
                    size="small"
                    color={getChannelTypeColor(channel.type) as any}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {channel.is_private ? (
                      <>
                        <LockIcon fontSize="small" color="warning" />
                        <Typography variant="body2" color="warning.main">
                          Private
                        </Typography>
                      </>
                    ) : (
                      <>
                        <PublicIcon fontSize="small" color="primary" />
                        <Typography variant="body2" color="primary.main">
                          Public
                        </Typography>
                      </>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {channel.created_at 
                      ? format(new Date(channel.created_at), 'MMM dd, yyyy')
                      : 'Unknown'
                    }
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {channel.created_at 
                      ? format(new Date(channel.created_at), 'HH:mm')
                      : ''
                    }
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Channel actions">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMenuOpen(e, channel)
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        {onViewChannelDetails && (
          <MenuItem onClick={handleViewDetails}>
            <ListItemIcon>
              <PeopleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Details</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleManageMembers}>
          <ListItemIcon>
            <PeopleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Manage Members</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Channel</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Channel</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}

export default ChannelList