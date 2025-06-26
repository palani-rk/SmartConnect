import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  FormHelperText,
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { channelCreateSchema, channelUpdateSchema, CHANNEL_TYPES } from '@/types/channel'
import type { Channel, ChannelCreateForm, ChannelUpdateForm } from '@/types/channel'

interface CreateChannelDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ChannelCreateForm | ChannelUpdateForm) => Promise<void>
  channel?: Channel | null
  isSubmitting?: boolean
  error?: string | null
}

const CreateChannelDialog: React.FC<CreateChannelDialogProps> = ({
  open,
  onClose,
  onSubmit,
  channel,
  isSubmitting = false,
  error,
}) => {
  const isEditing = Boolean(channel)
  const schema = isEditing ? channelUpdateSchema : channelCreateSchema

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    watch,
  } = useForm<ChannelCreateForm | ChannelUpdateForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: channel?.name || '',
      type: channel?.type || CHANNEL_TYPES.GENERAL,
      is_private: channel?.is_private || false,
    },
    mode: 'onChange',
  })

  const nameValue = watch('name')
  const isPrivateValue = watch('is_private')

  // Reset form when dialog opens/closes or channel changes
  React.useEffect(() => {
    if (open) {
      reset({
        name: channel?.name || '',
        type: channel?.type || CHANNEL_TYPES.GENERAL,
        is_private: channel?.is_private || false,
      })
    }
  }, [open, channel, reset])

  const handleFormSubmit = async (data: ChannelCreateForm | ChannelUpdateForm) => {
    await onSubmit(data)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  const canSubmit = isValid && isDirty && !isSubmitting

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={isSubmitting}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="div">
            {isEditing ? 'Edit Channel' : 'Create New Channel'}
          </Typography>
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

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box display="flex" flexDirection="column" gap={3}>
            {/* Channel Name */}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Channel Name"
                  fullWidth
                  required
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                  disabled={isSubmitting}
                  placeholder="e.g., general, announcements, support"
                  autoFocus
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                />
              )}
            />

            {/* Channel Type */}
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={Boolean(errors.type)} disabled={isSubmitting}>
                  <InputLabel id="channel-type-label">Channel Type</InputLabel>
                  <Select
                    {...field}
                    labelId="channel-type-label"
                    label="Channel Type"
                  >
                    <MenuItem value={CHANNEL_TYPES.GENERAL}>General</MenuItem>
                    <MenuItem value={CHANNEL_TYPES.TEXT}>Text</MenuItem>
                    <MenuItem value={CHANNEL_TYPES.ANNOUNCEMENTS}>Announcements</MenuItem>
                    <MenuItem value={CHANNEL_TYPES.SUPPORT}>Support</MenuItem>
                    <MenuItem value={CHANNEL_TYPES.VOICE}>Voice</MenuItem>
                  </Select>
                  {errors.type && (
                    <FormHelperText>{errors.type.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            {/* Privacy Settings */}
            <Controller
              name="is_private"
              control={control}
              render={({ field: { value, onChange } }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={value || false}
                      onChange={(e) => onChange(e.target.checked)}
                      disabled={isSubmitting}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">
                        Private Channel
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {isPrivateValue 
                          ? 'Only invited users can see and join this channel'
                          : 'All organization members can see and join this channel'
                        }
                      </Typography>
                    </Box>
                  }
                />
              )}
            />

            {/* Character count and info */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {nameValue?.length || 0}/50 characters
              </Typography>
              {isEditing && (
                <Typography variant="caption" color="text.secondary">
                  Created: {channel?.created_at ? new Date(channel.created_at).toLocaleDateString() : 'Unknown'}
                </Typography>
              )}
            </Box>

            {/* Channel name guidelines */}
            <Box>
              <Typography variant="caption" color="text.secondary" component="div" gutterBottom>
                Channel name requirements:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <Typography component="li" variant="caption" color="text.secondary">
                  2-50 characters long
                </Typography>
                <Typography component="li" variant="caption" color="text.secondary">
                  Letters, numbers, spaces, hyphens, underscores, and # only
                </Typography>
                <Typography component="li" variant="caption" color="text.secondary">
                  Should be descriptive and easy to understand
                </Typography>
              </Box>
            </Box>
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
            type="submit"
            variant="contained"
            disabled={!canSubmit}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
          >
            {isSubmitting
              ? (isEditing ? 'Updating...' : 'Creating...')
              : (isEditing ? 'Update Channel' : 'Create Channel')
            }
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default CreateChannelDialog