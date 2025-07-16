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
  Business as BusinessIcon,
  People as PeopleIcon,
  Chat as ChatIcon,
  Message as MessageIcon,
} from '@mui/icons-material'
import type { Organization } from '@/types/organization'

interface DeleteConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  organization: Organization | null
  isDeleting?: boolean
  error?: string | null
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  organization,
  isDeleting = false,
  error,
}) => {
  const [confirmationText, setConfirmationText] = useState('')
  const expectedText = organization?.name || ''
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

  if (!organization) return null

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
            Delete Organization
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
              Deleting this organization will permanently remove all associated data.
            </Typography>
          </Alert>

          {/* Organization Info */}
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Organization to be deleted:
            </Typography>
            <Box display="flex" alignItems="center" gap={1} p={2} bgcolor="grey.50" borderRadius={1}>
              <BusinessIcon color="primary" />
              <Typography variant="body1" fontWeight={500}>
                {organization.name}
              </Typography>
            </Box>
          </Box>

          {/* Impact Warning */}
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="error.main">
              What will be deleted:
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <PeopleIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  All users belonging to this organization
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <ChatIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  All channels and channel memberships
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <MessageIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  All messages and message history
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <BusinessIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  All integrations and configurations
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* Confirmation Input */}
          <Box>
            <Typography variant="body2" gutterBottom>
              To confirm deletion, please type the organization name exactly as shown:
            </Typography>
            <Chip 
              label={organization.name} 
              variant="outlined" 
              size="small" 
              sx={{ mb: 2, fontFamily: 'monospace' }}
            />
            <TextField
              fullWidth
              variant="outlined"
              placeholder={`Type "${organization.name}" to confirm`}
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={isDeleting}
              error={confirmationText.length > 0 && !isConfirmed}
              helperText={
                confirmationText.length > 0 && !isConfirmed
                  ? 'Organization name does not match'
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
              <strong>Critical:</strong> This will affect all users, channels, and data 
              associated with "{organization.name}". Make sure you have backups if needed.
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
          {isDeleting ? 'Deleting...' : 'Delete Organization'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteConfirmationDialog