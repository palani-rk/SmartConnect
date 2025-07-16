import React, { useState } from 'react'
import {
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  Alert,
  Grid,
  Tooltip,
} from '@mui/material'
import { 
  Visibility, 
  VisibilityOff, 
  Info as InfoIcon 
} from '@mui/icons-material'
import { Controller } from 'react-hook-form'
import type { Control, FieldErrors } from 'react-hook-form'
import { USER_ROLES } from '@/constants'
import { useAuthStore } from '@/stores/authStore'

export interface UserFormData {
  email: string
  role?: string
  password?: string
  auto_generate_password?: boolean
  whatsapp_id?: string
  instagram_id?: string
  send_welcome_email?: boolean
}

interface UserFormFieldsProps {
  control: Control<any>
  errors: FieldErrors<any>
  isSubmitting?: boolean
  showPasswordFields?: boolean
  showRoleField?: boolean
  showNotificationFields?: boolean
  availableRoles?: Array<{ value: string; label: string }>
  fieldPrefix?: string // For nested form structures like "admin" in organization form
  autoFocus?: boolean
  mode?: 'create' | 'edit'
}

export const UserFormFields: React.FC<UserFormFieldsProps> = ({
  control,
  errors,
  isSubmitting = false,
  showPasswordFields = true,
  showRoleField = true,
  showNotificationFields = true,
  availableRoles,
  fieldPrefix = '',
  autoFocus = false,
  mode = 'create'
}) => {
  const { user: currentUser } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  // Helper to get field name with optional prefix
  const getFieldName = (fieldName: string) => fieldPrefix ? `${fieldPrefix}.${fieldName}` : fieldName
  
  // Helper to get nested errors
  const getFieldError = (fieldName: string) => {
    if (fieldPrefix) {
      return errors[fieldPrefix]?.[fieldName]
    }
    return errors[fieldName]
  }

  // Get available roles based on current user's permissions
  const getDefaultAvailableRoles = () => {
    const userRole = currentUser?.role
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

  const roleOptions = availableRoles || getDefaultAvailableRoles()

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

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {/* Email Field */}
      <Controller
        name={getFieldName('email')}
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Email Address"
            type="email"
            fullWidth
            required
            error={Boolean(getFieldError('email'))}
            helperText={getFieldError('email')?.message}
            disabled={isSubmitting}
            placeholder="user@example.com"
            autoFocus={autoFocus}
            InputProps={{
              autoComplete: 'email'
            }}
          />
        )}
      />

      {/* Role Field */}
      {showRoleField && roleOptions.length > 0 && (
        <Controller
          name={getFieldName('role')}
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={Boolean(getFieldError('role'))} required>
              <InputLabel id={`${fieldPrefix}-role-label`}>Role</InputLabel>
              <Select
                {...field}
                labelId={`${fieldPrefix}-role-label`}
                label="Role"
                disabled={isSubmitting}
                renderValue={(value) => (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={roleOptions.find(r => r.value === value)?.label || value} 
                      size="small" 
                      color={getRoleColor(value as string) as any}
                      variant="outlined"
                    />
                  </Box>
                )}
              >
                {roleOptions.map((role) => (
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
              {getFieldError('role') && (
                <FormHelperText>{getFieldError('role')?.message}</FormHelperText>
              )}
            </FormControl>
          )}
        />
      )}

      {/* Password Fields */}
      {showPasswordFields && mode === 'create' && (
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="subtitle1" fontWeight="medium">
              Password Configuration
            </Typography>
            <Tooltip title="Choose whether to auto-generate a secure password or set a custom one.">
              <InfoIcon fontSize="small" color="action" />
            </Tooltip>
          </Box>

          {/* Auto-generate password checkbox */}
          <Controller
            name={getFieldName('auto_generate_password')}
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    {...field}
                    checked={field.value}
                    disabled={isSubmitting}
                  />
                }
                label="Generate secure password automatically"
                sx={{ mb: 2 }}
              />
            )}
          />

          {/* Manual password field - only show if not auto-generating */}
          <Controller
            name={getFieldName('auto_generate_password')}
            control={control}
            render={({ field: autoGenField }) => (
              !autoGenField.value && (
                <Controller
                  name={getFieldName('password')}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      fullWidth
                      required={!autoGenField.value}
                      error={Boolean(getFieldError('password'))}
                      helperText={getFieldError('password')?.message || 'Minimum 8 characters required'}
                      disabled={isSubmitting}
                      placeholder="Enter secure password"
                      InputProps={{
                        autoComplete: 'new-password',
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              disabled={isSubmitting}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              )
            )}
          />
        </Box>
      )}

      {/* Integration Fields */}
      <Box>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          Integration Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Connect external messaging platforms (optional)
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Controller
              name={getFieldName('whatsapp_id')}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value || ''}
                  label="WhatsApp ID"
                  fullWidth
                  error={Boolean(getFieldError('whatsapp_id'))}
                  helperText={getFieldError('whatsapp_id')?.message || 'Phone number or WhatsApp ID'}
                  disabled={isSubmitting}
                  placeholder="+1234567890"
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name={getFieldName('instagram_id')}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value || ''}
                  label="Instagram Handle"
                  fullWidth
                  error={Boolean(getFieldError('instagram_id'))}
                  helperText={getFieldError('instagram_id')?.message || 'Instagram username or handle'}
                  disabled={isSubmitting}
                  placeholder="@username"
                />
              )}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Notification Settings */}
      {showNotificationFields && mode === 'create' && (
        <Box>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            Notification Settings
          </Typography>
          <Controller
            name={getFieldName('send_welcome_email')}
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    {...field}
                    checked={field.value}
                    disabled={isSubmitting}
                  />
                }
                label="Send welcome email to user"
              />
            )}
          />
        </Box>
      )}

      {/* Role Description */}
      {showRoleField && (
        <Controller
          name={getFieldName('role')}
          control={control}
          render={({ field }) => {
            const selectedRole = field.value
            if (!selectedRole) return null

            return (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Role: {roleOptions.find(r => r.value === selectedRole)?.label}</strong>
                  <br />
                  {selectedRole === USER_ROLES.GOD && 'Full platform access including organization management.'}
                  {selectedRole === USER_ROLES.ADMIN && 'Can manage users, channels, and integrations within this organization.'}
                  {selectedRole === USER_ROLES.USER && 'Can participate in channels and send messages.'}
                  {selectedRole === USER_ROLES.CLIENT && 'Limited access, typically assigned to external users.'}
                </Typography>
              </Alert>
            )
          }}
        />
      )}
    </Box>
  )
}