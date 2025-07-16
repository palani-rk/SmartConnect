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
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormHelperText,
} from '@mui/material'
import { Close as CloseIcon, Lock as LockIcon, Public as PublicIcon } from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { channelCreateSchema, channelUpdateSchema } from '../types/channel'
import type { Channel, ChannelCreateForm, ChannelUpdateForm } from '../types/channel'

interface ChannelFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ChannelCreateForm | ChannelUpdateForm) => Promise<void>
  channel?: Channel | null
  isSubmitting?: boolean
  error?: string | null
}

const ChannelForm: React.FC<ChannelFormProps> = ({
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
      description: channel?.description || '',
      type: channel?.type || 'public',
    },
    mode: 'onChange',
  })

  const nameValue = watch('name')
  const descriptionValue = watch('description')
  const typeValue = watch('type')

  // Reset form when dialog opens/closes or channel changes
  React.useEffect(() => {
    if (open) {
      reset({
        name: channel?.name || '',
        description: channel?.description || '',
        type: channel?.type || 'public',
      })
    }
  }, [open, channel, reset])

  const handleFormSubmit = async (data: ChannelCreateForm | ChannelUpdateForm) => {
    await onSubmit(data)
    // Parent component handles both success and error cases
    // On success: parent calls onClose() to close form
    // On error: parent catches exception, form stays open to show error
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
                  placeholder="e.g., general, marketing, dev-team"
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

            {/* Character count for name */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {nameValue?.length || 0}/100 characters
              </Typography>
              {isEditing && (
                <Typography variant="caption" color="text.secondary">
                  Created: {channel?.created_at ? new Date(channel.created_at).toLocaleDateString() : 'Unknown'}
                </Typography>
              )}
            </Box>

            {/* Channel Description */}
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Description (Optional)"
                  fullWidth
                  multiline
                  rows={3}
                  error={Boolean(errors.description)}
                  helperText={errors.description?.message}
                  disabled={isSubmitting}
                  placeholder="Brief description of what this channel is for..."
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              )}
            />

            {/* Character count for description */}
            <Box display="flex" justifyContent="flex-end">
              <Typography variant="caption" color="text.secondary">
                {descriptionValue?.length || 0}/500 characters
              </Typography>
            </Box>

            {/* Channel Type */}
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <FormControl error={Boolean(errors.type)} disabled={isSubmitting}>
                  <FormLabel component="legend">Channel Type</FormLabel>
                  <RadioGroup {...field} value={field.value || 'public'}>
                    <FormControlLabel
                      value="public"
                      control={<Radio />}
                      label={
                        <Box display="flex" alignItems="center" gap={1}>
                          <PublicIcon fontSize="small" />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              Public
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Everyone in the organization can join and see messages
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="private"
                      control={<Radio />}
                      label={
                        <Box display="flex" alignItems="center" gap={1}>
                          <LockIcon fontSize="small" />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              Private
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Only invited members can join and see messages
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </RadioGroup>
                  {errors.type && (
                    <FormHelperText>{errors.type.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            {/* Channel name guidelines */}
            <Box>
              <Typography variant="caption" color="text.secondary" component="div" gutterBottom>
                Channel name requirements:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <Typography component="li" variant="caption" color="text.secondary">
                  2-100 characters long
                </Typography>
                <Typography component="li" variant="caption" color="text.secondary">
                  Letters, numbers, spaces, hyphens, underscores, and # allowed
                </Typography>
                <Typography component="li" variant="caption" color="text.secondary">
                  Must be unique within your organization
                </Typography>
              </Box>
            </Box>

            {/* Type-specific info */}
            {typeValue === 'private' && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  Private channels require you to manually add members after creation. 
                  Only admins and invited members will be able to see this channel.
                </Typography>
              </Alert>
            )}
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

export default ChannelForm