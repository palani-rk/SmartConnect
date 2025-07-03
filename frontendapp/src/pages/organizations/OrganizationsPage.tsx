import { useState } from 'react'
import { Box, Container, Breadcrumbs, Link, Typography, Alert, Snackbar } from '@mui/material'
import { Home as HomeIcon } from '@mui/icons-material'
import { 
  OrganizationList, 
  OrganizationForm, 
  DeleteConfirmationDialog 
} from '@/components/organizations'
import OrganizationWithAdminForm from '@/components/organizations/OrganizationWithAdminForm'
import { useOrganizationStore } from '@/stores/organizationStore'
import type { 
  Organization, 
  OrganizationCreateForm, 
  OrganizationUpdateForm, 
  OrganizationWithAdminForm as OrganizationWithAdminFormType 
} from '@/types/organization'

const OrganizationsPage = () => {
  const {
    createOrganization,
    createOrganizationWithAdmin,
    updateOrganization,
    deleteOrganization,
    error,
    clearError,
  } = useOrganizationStore()

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isEnhancedFormOpen, setIsEnhancedFormOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Success notification
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form handlers
  const handleCreateClick = () => {
    setSelectedOrganization(null)
    setIsEnhancedFormOpen(true)
  }

  const handleEditClick = (organization: Organization) => {
    setSelectedOrganization(organization)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (organization: Organization) => {
    setSelectedOrganization(organization)
    setIsDeleteDialogOpen(true)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setSelectedOrganization(null)
    clearError()
  }

  const handleEnhancedFormClose = () => {
    setIsEnhancedFormOpen(false)
    setSelectedOrganization(null)
    clearError()
  }

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false)
    setSelectedOrganization(null)
    clearError()
  }

  const handleFormSubmit = async (data: OrganizationCreateForm | OrganizationUpdateForm) => {
    setIsSubmitting(true)
    try {
      if (selectedOrganization) {
        // Update existing organization
        await updateOrganization(selectedOrganization.id, data as OrganizationUpdateForm)
        setSuccessMessage(`Organization "${data.name}" updated successfully`)
      } else {
        // Create new organization
        const newOrg = await createOrganization(data as OrganizationCreateForm)
        setSuccessMessage(`Organization "${newOrg.name}" created successfully`)
      }
      handleFormClose()
    } catch (error) {
      // Error is handled by the store and will be displayed in the form
      // Don't close the form on error so user can see the error message
      console.error('Form submission error:', error)
      // Error state is set by the store and will be displayed in the form
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEnhancedFormSubmit = async (data: OrganizationWithAdminFormType) => {
    setIsSubmitting(true)
    try {
      const result = await createOrganizationWithAdmin(
        { name: data.organizationName },
        {
          email: data.admin.email,
          password: data.admin.auto_generate_password ? undefined : data.admin.password,
          whatsapp_id: data.admin.whatsapp_id || undefined,
          instagram_id: data.admin.instagram_id || undefined,
        }
      )
      
      setSuccessMessage(
        `Organization "${result.organization.name}" and admin user "${result.adminUser.email}" created successfully`
      )
      return result
    } catch (error) {
      console.error('Enhanced form submission error:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedOrganization) return
    
    setIsDeleting(true)
    try {
      await deleteOrganization(selectedOrganization.id)
      setSuccessMessage(`Organization "${selectedOrganization.name}" deleted successfully`)
      handleDeleteDialogClose()
    } catch (error) {
      // Error is handled by the store and displayed in the dialog
      console.error('Delete confirmation error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSuccessClose = () => {
    setSuccessMessage(null)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          color="inherit"
          href="/dashboard"
          sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </Link>
        <Typography color="text.primary">Organizations</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Organization Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage all organizations in the platform. Only God users have access to this section.
        </Typography>
      </Box>

      {/* Global Error Display */}
      {error && !isFormOpen && !isEnhancedFormOpen && !isDeleteDialogOpen && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Organization List */}
      <OrganizationList
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
      />

      {/* Enhanced Organization Form with Admin */}
      <OrganizationWithAdminForm
        open={isEnhancedFormOpen}
        onClose={handleEnhancedFormClose}
        onSubmit={handleEnhancedFormSubmit}
        isSubmitting={isSubmitting}
        error={error}
      />

      {/* Simple Organization Form Modal */}
      <OrganizationForm
        open={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        organization={selectedOrganization}
        isSubmitting={isSubmitting}
        error={error}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteConfirm}
        organization={selectedOrganization}
        isDeleting={isDeleting}
        error={error}
      />

      {/* Success Notification */}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={4000}
        onClose={handleSuccessClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSuccessClose} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default OrganizationsPage