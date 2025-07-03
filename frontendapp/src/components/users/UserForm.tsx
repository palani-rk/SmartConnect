import React, { useEffect } from 'react'
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
} from '@mui/material'
import { Close as CloseIcon, Person as PersonIcon } from '@mui/icons-material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userCreateSchema, userUpdateSchema } from '@/types/user'
import { UserFormFields } from './UserFormFields'
import type { User, UserCreateForm, UserUpdateForm } from '@/types/user'

interface UserFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: UserCreateForm | UserUpdateForm) => Promise<void>
  user?: User | null
  organizationId: string
  isSubmitting?: boolean
  error?: string | null
}

const UserForm: React.FC<UserFormProps> = ({
  open,
  onClose,
  onSubmit,
  user,
  organizationId,
  isSubmitting = false,
  error,
}) => {
  const isEditing = Boolean(user)
  const schema = isEditing ? userUpdateSchema : userCreateSchema

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
  } = useForm<UserCreateForm | UserUpdateForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: user?.email || '',
      role: user?.role || 'user',
      password: '',
      auto_generate_password: true,
      whatsapp_id: user?.whatsapp_id || '',
      instagram_id: user?.instagram_id || '',
      send_welcome_email: true,
    },
  })


  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (open) {
      reset({
        email: user?.email || '',
        role: user?.role || 'user',
        password: '',
        auto_generate_password: true,
        whatsapp_id: user?.whatsapp_id || '',
        instagram_id: user?.instagram_id || '',
        send_welcome_email: true,
      })
    }
  }, [open, user, reset])

  const handleFormSubmit = async (data: UserCreateForm | UserUpdateForm) => {
    try {
      await onSubmit(data)
      // Form will be closed by parent component on success
    } catch (error) {
      // Error handling is done by parent component
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <PersonIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              {isEditing ? 'Edit User' : 'Create New User'}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <UserFormFields
            control={control}
            errors={errors}
            isSubmitting={isSubmitting}
            showPasswordFields={!isEditing}
            mode={isEditing ? 'edit' : 'create'}
            autoFocus
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!isValid || isSubmitting || (!isDirty && isEditing)}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
          >
            {isSubmitting 
              ? (isEditing ? 'Updating...' : 'Creating...') 
              : (isEditing ? 'Update User' : 'Create User')
            }
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default UserForm