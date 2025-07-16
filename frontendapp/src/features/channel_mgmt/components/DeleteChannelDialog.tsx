import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Alert,
  TextField,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material'
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Tag as ChannelIcon,
  People as PeopleIcon,
  Message as MessageIcon,
  Lock as LockIcon,
  Public as PublicIcon,
} from '@mui/icons-material'
import type { ChannelWithDetails } from '../types/channel'

interface DeleteChannelDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  channel: ChannelWithDetails | null
  isDeleting?: boolean
  error?: string | null
}

const DeleteChannelDialog: React.FC<DeleteChannelDialogProps> = ({
  open,
  onClose,
  onConfirm,
  channel,
  isDeleting = false,
  error,
}) => {
  const [confirmationText, setConfirmationText] = useState('')
  const expectedText = channel?.name || ''
  const isConfirmed = confirmationText === expectedText

  // Reset confirmation text when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setConfirmationText('')
    }
  }, [open])

  const handleConfirm = async () => {
    if (isConfirmed && !isDeleting) {
      try {
        await onConfirm()
        onClose()
      } catch (confirmError) {
        // Error handling is done by parent component
        console.error('Delete confirmation error:', confirmError)
      }
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      onClose()
    }
  }

  if (!channel) return null

  const getChannelTypeIcon = () => {
    return channel.type === 'private' ? <LockIcon fontSize="small" /> : <PublicIcon fontSize="small" />
  }

  const getChannelTypeColor = () => {
    return channel.type === 'private' ? 'warning' : 'success'
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={isDeleting}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1} color="error.main">
          <WarningIcon />
          <Typography variant="h6" component="div">
            Delete Channel
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box display="flex" flexDirection="column" gap={3}>
          {/* Warning Message */}
          <Alert severity="warning" icon={<WarningIcon />}>
            <Typography variant="body2" gutterBottom>
              <strong>This action cannot be undone.</strong>
            </Typography>
            <Typography variant="body2">
              Deleting this channel will permanently remove all associated data.
            </Typography>
          </Alert>

          {/* Channel Info */}
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Channel to be deleted:
            </Typography>
            <Box display="flex" alignItems="center" gap={2} p={2} bgcolor="grey.50" borderRadius={1}>
              <ChannelIcon color="primary" />
              <Box flexGrow={1}>
                <Typography variant="body1" fontWeight={500}>
                  #{channel.name}
                </Typography>
                {channel.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {channel.description}
                  </Typography>
                )}
              </Box>
              <Chip
                icon={getChannelTypeIcon()}
                label={channel.type}
                size="small"
                color={getChannelTypeColor() as 'warning' | 'success'}
                variant="outlined"
              />
            </Box>
          </Box>

          {/* Channel Statistics */}
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Channel details:
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <PeopleIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>{channel.member_count}</strong> member{channel.member_count === 1 ? '' : 's'} will lose access
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <MessageIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  All message history will be permanently deleted
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <ChannelIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  Created on {new Date(channel.created_at || '').toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Impact Warning */}
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="error.main">
              What will be deleted:
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <MessageIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  All messages and attachments in this channel
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <PeopleIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  All channel memberships and permissions
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <ChannelIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  Channel settings and configurations
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Member Impact Warning */}
          {channel.member_count > 0 && (
            <Alert severity="info" variant="outlined">
              <Typography variant="body2">
                <strong>Member Impact:</strong> {channel.member_count} member{channel.member_count === 1 ? '' : 's'} 
                {channel.member_count === 1 ? ' is' : ' are'} currently part of this channel. 
                {channel.member_count === 1 ? ' They' : ' They'} will lose access to all channel content.
              </Typography>
            </Alert>
          )}

          <Divider />

          {/* Confirmation Input */}
          <Box>
            <Typography variant="body2" gutterBottom>
              To confirm deletion, please type the channel name exactly as shown:
            </Typography>
            <Chip 
              label={channel.name} 
              variant="outlined" 
              size="small" 
              sx={{ mb: 2, fontFamily: 'monospace' }}
            />
            <TextField
              fullWidth
              variant="outlined"
              placeholder={`Type "${channel.name}" to confirm`}
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={isDeleting}
              error={confirmationText.length > 0 && !isConfirmed}
              helperText={
                confirmationText.length > 0 && !isConfirmed
                  ? 'Channel name does not match'
                  : ''
              }
              InputProps={{
                style: { fontFamily: 'monospace' },
              }}
            />
          </Box>

          {/* Additional Warning */}
          <Alert severity="error" variant="outlined">
            <Typography variant="body2">
              <strong>Critical:</strong> This will permanently delete all content in 
              "#{channel.name}" including messages, files, and member history. 
              This action cannot be reversed.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          disabled={isDeleting}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!isConfirmed || isDeleting}
          color="error"
          variant="contained"
          startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
        >
          {isDeleting ? 'Deleting...' : 'Delete Channel'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteChannelDialog