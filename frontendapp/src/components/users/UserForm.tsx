import React, { useEffect } from 'react'
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
  FormHelperText,
  Chip,
} from '@mui/material'
import { Close as CloseIcon, Person as PersonIcon } from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userCreateSchema, userUpdateSchema } from '@/types/user'
import { USER_ROLES } from '@/constants'
import { useAuthStore } from '@/stores/authStore'
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
  const { user: currentUser } = useAuthStore()
  const userRole = currentUser?.role
  const isEditing = Boolean(user)
  const schema = isEditing ? userUpdateSchema : userCreateSchema

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    watch,
  } = useForm<UserCreateForm | UserUpdateForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: user?.email || '',
      role: user?.role || 'user',
      whatsapp_id: user?.whatsapp_id || '',
      instagram_id: user?.instagram_id || '',
    },
  })

  // Get available roles based on current user's permissions
  const getAvailableRoles = () => {
    if (userRole === USER_ROLES.GOD) {
      return [
        { value: USER_ROLES.USER, label: 'User' },
        { value: USER_ROLES.ADMIN, label: 'Admin' },
        { value: USER_ROLES.CLIENT, label: 'Client' },
        { value: USER_ROLES.GOD, label: 'God' },
      ]
    }
    if (userRole === USER_ROLES.ADMIN) {
      return [
        { value: USER_ROLES.USER, label: 'User' },
        { value: USER_ROLES.ADMIN, label: 'Admin' },
        { value: USER_ROLES.CLIENT, label: 'Client' },
      ]
    }
    return []
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case USER_ROLES.GOD:
        return 'error'
      case USER_ROLES.ADMIN:
        return 'warning'
      case USER_ROLES.USER:
        return 'primary'
      case USER_ROLES.CLIENT:
        return 'secondary'
      default:
        return 'default'
    }
  }

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (open) {
      reset({
        email: user?.email || '',
        role: user?.role || 'user',
        whatsapp_id: user?.whatsapp_id || '',
        instagram_id: user?.instagram_id || '',
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

  const availableRoles = getAvailableRoles()
  const selectedRole = watch('role')

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

          <Box display="flex" flexDirection="column" gap={3}>
            {/* Email Field */}
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email Address"
                  type="email"
                  fullWidth
                  required
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                  disabled={isSubmitting}
                  placeholder="user@example.com"
                  InputProps={{
                    autoComplete: 'email'
                  }}
                />
              )}
            />

            {/* Role Field */}
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={Boolean(errors.role)} required>
                  <InputLabel id="role-label">Role</InputLabel>
                  <Select
                    {...field}
                    labelId="role-label"
                    label="Role"
                    disabled={isSubmitting}
                    renderValue={(value) => (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip 
                          label={availableRoles.find(r => r.value === value)?.label || value} 
                          size="small" 
                          color={getRoleColor(value as string) as any}
                          variant="outlined"
                        />
                      </Box>
                    )}
                  >
                    {availableRoles.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        <Chip 
                          label={role.label} 
                          size="small" 
                          color={getRoleColor(role.value) as any}
                          variant="outlined"
                        />
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.role && (
                    <FormHelperText>{errors.role.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            {/* WhatsApp ID Field */}
            <Controller
              name="whatsapp_id"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value || ''}
                  label="WhatsApp ID"
                  fullWidth
                  error={Boolean(errors.whatsapp_id)}
                  helperText={errors.whatsapp_id?.message || 'Optional: WhatsApp phone number or ID for integration'}
                  disabled={isSubmitting}
                  placeholder="+1234567890"
                />
              )}
            />

            {/* Instagram ID Field */}
            <Controller
              name="instagram_id"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value || ''}
                  label="Instagram ID"
                  fullWidth
                  error={Boolean(errors.instagram_id)}
                  helperText={errors.instagram_id?.message || 'Optional: Instagram username or ID for integration'}
                  disabled={isSubmitting}
                  placeholder="@username"
                />
              )}
            />

            {/* Role Description */}
            {selectedRole && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Role: {availableRoles.find(r => r.value === selectedRole)?.label}</strong>
                  <br />
                  {selectedRole === USER_ROLES.GOD && 'Full platform access including organization management.'}
                  {selectedRole === USER_ROLES.ADMIN && 'Can manage users, channels, and integrations within this organization.'}
                  {selectedRole === USER_ROLES.USER && 'Can participate in channels and send messages.'}
                  {selectedRole === USER_ROLES.CLIENT && 'Limited access, typically assigned to external users.'}
                </Typography>
              </Alert>
            )}
          </Box>
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