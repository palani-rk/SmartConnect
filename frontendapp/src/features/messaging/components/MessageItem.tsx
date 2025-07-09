import React, { useState } from 'react'
import {
  Box,
  Typography,
  Avatar,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PushPin as PushPinIcon,
  Reply as ReplyIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material'
import { format, isToday, isYesterday } from 'date-fns'
import type { MessageWithDetails } from '../types/message'

interface MessageItemProps {
  message: MessageWithDetails
  isOwnMessage: boolean
  showAvatar?: boolean
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onReply?: (messageId: string) => void
  onTogglePin?: (messageId: string, isPinned: boolean) => void
  onRetry?: (messageId: string) => void
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwnMessage,
  showAvatar = true,
  onEdit,
  onDelete,
  onReply,
  onTogglePin,
  onRetry,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    
    if (isToday(date)) {
      return format(date, 'h:mm a')
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`
    } else {
      return format(date, 'MMM d, h:mm a')
    }
  }

  const getStatusIcon = () => {
    if (message.isOptimistic) {
      switch (message.status) {
        case 'sending':
          return <ScheduleIcon fontSize="small" color="action" />
        case 'sent':
          return <CheckCircleIcon fontSize="small" color="success" />
        case 'failed':
          return <ErrorIcon fontSize="small" color="error" />
        default:
          return null
      }
    }
    return null
  }

  const getStatusColor = () => {
    if (message.isOptimistic) {
      switch (message.status) {
        case 'sending':
          return 'rgba(0, 0, 0, 0.6)'
        case 'failed':
          return 'rgba(211, 47, 47, 0.8)'
        default:
          return 'inherit'
      }
    }
    return 'inherit'
  }

  const handleEditClick = () => {
    handleMenuClose()
    onEdit?.(message.id)
  }

  const handleDeleteClick = () => {
    handleMenuClose()
    onDelete?.(message.id)
  }

  const handleReplyClick = () => {
    handleMenuClose()
    onReply?.(message.id)
  }

  const handleTogglePinClick = () => {
    handleMenuClose()
    onTogglePin?.(message.id, !message.is_pinned)
  }

  const handleRetryClick = () => {
    handleMenuClose()
    onRetry?.(message.id)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        px: 2,
        py: 1,
        '&:hover': {
          backgroundColor: 'action.hover',
        },
        '&:hover .message-actions': {
          opacity: 1,
        },
        opacity: message.status === 'sending' ? 0.7 : 1,
      }}
    >
      {/* Avatar */}
      {showAvatar && (
        <Avatar
          sx={{
            width: 36,
            height: 36,
            fontSize: '0.875rem',
            bgcolor: isOwnMessage ? 'primary.main' : 'secondary.main',
          }}
        >
          {message.author.email.charAt(0).toUpperCase()}
        </Avatar>
      )}

      {/* Message Content */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        {/* Message Header */}
        {showAvatar && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 0.5,
            }}
          >
            <Typography
              variant="body2"
              fontWeight="600"
              sx={{
                color: isOwnMessage ? 'primary.main' : 'text.primary',
              }}
            >
              {message.author.email}
            </Typography>
            
            {message.author.role !== 'member' && (
              <Chip
                label={message.author.role}
                size="small"
                variant="outlined"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  color: 'text.secondary',
                  borderColor: 'divider',
                }}
              />
            )}
            
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <AccessTimeIcon fontSize="inherit" />
              {formatMessageTime(message.created_at)}
            </Typography>
          </Box>
        )}

        {/* Message Body */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            backgroundColor: isOwnMessage ? 'primary.50' : 'grey.50',
            borderRadius: 2,
            border: message.is_pinned ? '2px solid' : '1px solid',
            borderColor: message.is_pinned ? 'warning.main' : 'divider',
            color: getStatusColor(),
            position: 'relative',
          }}
        >
          {/* Pinned indicator */}
          {message.is_pinned && (
            <Box
              sx={{
                position: 'absolute',
                top: -1,
                right: -1,
                bgcolor: 'warning.main',
                borderRadius: '50%',
                p: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PushPinIcon fontSize="small" sx={{ color: 'white' }} />
            </Box>
          )}

          {/* Message content */}
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: getStatusColor(),
            }}
          >
            {message.content}
          </Typography>

          {/* Edited indicator */}
          {message.is_edited && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                mt: 0.5,
                fontStyle: 'italic',
              }}
            >
              (edited)
            </Typography>
          )}

          {/* Status indicator */}
          {getStatusIcon() && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {getStatusIcon()}
            </Box>
          )}
        </Paper>

        {/* Thread indicator */}
        {message.thread_id && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 0.5,
            }}
          >
            <ReplyIcon fontSize="inherit" />
            Thread reply
          </Typography>
        )}
      </Box>

      {/* Actions Menu */}
      <Box
        className="message-actions"
        sx={{
          opacity: 0,
          transition: 'opacity 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {/* Retry button for failed messages */}
        {message.status === 'failed' && (
          <Tooltip title="Retry sending">
            <IconButton
              size="small"
              onClick={handleRetryClick}
              sx={{ color: 'error.main' }}
            >
              <ErrorIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* More actions menu */}
        <Tooltip title="More actions">
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{ color: 'text.secondary' }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {/* Reply option */}
        <MenuItem onClick={handleReplyClick}>
          <ListItemIcon>
            <ReplyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Reply</ListItemText>
        </MenuItem>

        {/* Pin/Unpin option */}
        <MenuItem onClick={handleTogglePinClick}>
          <ListItemIcon>
            <PushPinIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            {message.is_pinned ? 'Unpin' : 'Pin'} Message
          </ListItemText>
        </MenuItem>

        {/* Own message actions */}
        {isOwnMessage && (
          <>
            <Divider />
            <MenuItem onClick={handleEditClick}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  )
}

export default MessageItem