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
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { organizationCreateSchema, organizationUpdateSchema } from '@/types/organization'
import type { Organization, OrganizationCreateForm, OrganizationUpdateForm } from '@/types/organization'

interface OrganizationFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: OrganizationCreateForm | OrganizationUpdateForm) => Promise<void>
  organization?: Organization | null
  isSubmitting?: boolean
  error?: string | null
}

const OrganizationForm: React.FC<OrganizationFormProps> = ({
  open,
  onClose,
  onSubmit,
  organization,
  isSubmitting = false,
  error,
}) => {
  const isEditing = Boolean(organization)
  const schema = isEditing ? organizationUpdateSchema : organizationCreateSchema

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    watch,
  } = useForm<OrganizationCreateForm | OrganizationUpdateForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: organization?.name || '',
    },
    mode: 'onChange',
  })

  const nameValue = watch('name')

  // Reset form when dialog opens/closes or organization changes
  React.useEffect(() => {
    if (open) {
      reset({
        name: organization?.name || '',
      })
    }
  }, [open, organization, reset])

  const handleFormSubmit = async (data: OrganizationCreateForm | OrganizationUpdateForm) => {
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
            {isEditing ? 'Edit Organization' : 'Create New Organization'}
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
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Organization Name"
                  fullWidth
                  required
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                  disabled={isSubmitting}
                  placeholder="Enter organization name"
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

            {/* Character count */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {nameValue?.length || 0}/100 characters
              </Typography>
              {isEditing && (
                <Typography variant="caption" color="text.secondary">
                  Last updated: {organization?.created_at ? new Date(organization.created_at).toLocaleDateString() : 'Unknown'}
                </Typography>
              )}
            </Box>

            {/* Organization name guidelines */}
            <Box>
              <Typography variant="caption" color="text.secondary" component="div" gutterBottom>
                Organization name requirements:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <Typography component="li" variant="caption" color="text.secondary">
                  2-100 characters long
                </Typography>
                <Typography component="li" variant="caption" color="text.secondary">
                  Letters, numbers, spaces, hyphens, and underscores only
                </Typography>
                <Typography component="li" variant="caption" color="text.secondary">
                  Must be unique across the platform
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
              : (isEditing ? 'Update Organization' : 'Create Organization')
            }
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default OrganizationForm