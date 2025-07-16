import React, { useState } from 'react'
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
  Divider,
  Grid,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material'
import { 
  Close as CloseIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { organizationWithAdminFormSchema } from '@/types/organization'
import { UserFormFields } from '@/components/users'
import type { OrganizationWithAdminForm, CreateOrganizationWithAdminResponse } from '@/types/organization'

interface OrganizationWithAdminFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: OrganizationWithAdminForm) => Promise<CreateOrganizationWithAdminResponse>
  isSubmitting?: boolean
  error?: string | null
}

const OrganizationWithAdminFormComponent: React.FC<OrganizationWithAdminFormProps> = ({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  error,
}) => {
  const [result, setResult] = useState<CreateOrganizationWithAdminResponse | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    watch,
  } = useForm<OrganizationWithAdminForm>({
    resolver: zodResolver(organizationWithAdminFormSchema),
    defaultValues: {
      organizationName: '',
      admin: {
        email: '',
        password: '',
        auto_generate_password: true,
        whatsapp_id: '',
        instagram_id: '',
        send_welcome_email: true,
      },
    },
    mode: 'onChange',
  })

  const organizationName = watch('organizationName')
  const adminEmail = watch('admin.email')

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      reset({
        organizationName: '',
        admin: {
          email: '',
          password: '',
          auto_generate_password: true,
          whatsapp_id: '',
          instagram_id: '',
          send_welcome_email: true,
        },
      })
      setResult(null)
    }
  }, [open, reset])

  const handleFormSubmit = async (data: OrganizationWithAdminForm) => {
    try {
      const response = await onSubmit(data)
      setResult(response)
    } catch (error) {
      // Error is handled by parent component and passed via error prop
      console.error('Form submission error:', error)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  // Check if required fields are filled
  const hasRequiredFields = organizationName?.trim() && adminEmail?.trim()
  const canSubmit = isValid && hasRequiredFields && !isSubmitting


  // If we have a successful result, show the success screen
  if (result) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="div" color="success.main">
              Organization Created Successfully!
            </Typography>
            <IconButton edge="end" color="inherit" onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={3}>
            <Alert severity="success">
              Organization "{result.organization.name}" has been created successfully with an admin user account.
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Organization Details
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Name:</Typography>
                        <Typography variant="body1">{result.organization.name}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">ID:</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {result.organization.id}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Created:</Typography>
                        <Typography variant="body2">
                          {new Date(result.organization.created_at || '').toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Administrator Account
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Email:</Typography>
                        <Typography variant="body1">{result.adminUser.email}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Role:</Typography>
                        <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                          {result.adminUser.role}
                        </Typography>
                      </Box>
                      {result.adminUser.whatsapp_id && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">WhatsApp:</Typography>
                          <Typography variant="body1">{result.adminUser.whatsapp_id}</Typography>
                        </Box>
                      )}
                      {result.adminUser.instagram_id && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">Instagram:</Typography>
                          <Typography variant="body1">{result.adminUser.instagram_id}</Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {result.temporaryPassword && (
              <Card sx={{ backgroundColor: 'warning.light', color: 'warning.contrastText' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    ⚠️ Important: Save These Credentials
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={2}>
                    <Typography variant="body2">
                      A temporary password has been generated for the administrator account.
                      Please save these credentials securely and share them with the organization administrator.
                    </Typography>
                    <Box sx={{ backgroundColor: 'rgba(0,0,0,0.1)', p: 2, borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">Email:</Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {result.adminUser.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mt={1}>Temporary Password:</Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {result.temporaryPassword}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      The administrator should change this password after their first login.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="div">
            Create New Organization with Administrator
          </Typography>
          <IconButton edge="end" color="inherit" onClick={handleClose} disabled={isSubmitting} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box display="flex" flexDirection="column" gap={4}>
            {/* Organization Details Section */}
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                Organization Details
              </Typography>
              <Controller
                name="organizationName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Organization Name"
                    fullWidth
                    required
                    error={Boolean(errors.organizationName)}
                    helperText={errors.organizationName?.message}
                    disabled={isSubmitting}
                    placeholder="Enter organization name"
                    autoFocus
                  />
                )}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {organizationName?.length || 0}/100 characters
              </Typography>
            </Box>

            <Divider />

            {/* Administrator Account Section */}
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <Typography variant="h6" color="primary">
                  Administrator Account
                </Typography>
                <Tooltip title="The administrator will have full control over this organization and its users.">
                  <InfoIcon fontSize="small" color="action" />
                </Tooltip>
              </Box>

              <UserFormFields
                control={control}
                errors={errors}
                isSubmitting={isSubmitting}
                showPasswordFields={true}
                showRoleField={false}
                showNotificationFields={true}
                fieldPrefix="admin"
                mode="create"
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={isSubmitting} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!canSubmit}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
            title={
              !canSubmit 
                ? `Button disabled: ${!isValid ? 'Form invalid' : !hasRequiredFields ? 'Missing required fields' : 'Submitting'}`
                : 'Ready to create organization'
            }
          >
            {isSubmitting ? 'Creating Organization...' : 'Create Organization'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default OrganizationWithAdminFormComponent