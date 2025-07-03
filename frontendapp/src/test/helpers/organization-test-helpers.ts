import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Organization } from '@/types/organization'

/**
 * Helper functions specifically for organization testing
 */

export const organizationTestHelpers = {
  // Form interaction helpers
  async fillOrganizationForm(name: string) {
    const user = userEvent.setup()
    const nameInput = screen.getByLabelText('Organization Name')
    await user.clear(nameInput)
    await user.type(nameInput, name)
  },

  async submitOrganizationForm(action: 'create' | 'update' = 'create') {
    const user = userEvent.setup()
    const buttonText = action === 'create' ? 'Create Organization' : 'Update Organization'
    const submitButton = screen.getByText(buttonText)
    await user.click(submitButton)
  },

  async cancelOrganizationForm() {
    const user = userEvent.setup()
    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)
  },

  // Modal/Dialog helpers
  async openCreateDialog() {
    const user = userEvent.setup()
    const createButton = screen.getByLabelText(/create new organization/i)
    await user.click(createButton)
    
    await waitFor(() => {
      expect(screen.getByText('Create New Organization')).toBeInTheDocument()
    })
  },

  async openEditDialog(organizationName: string) {
    const user = userEvent.setup()
    
    // Find the row containing the organization
    const targetRow = screen.getByText(organizationName).closest('tr')!
    const editButton = targetRow.querySelector('[aria-label*="edit"]') as HTMLElement
    await user.click(editButton)
    
    await waitFor(() => {
      expect(screen.getByText('Edit Organization')).toBeInTheDocument()
    })
  },

  async openDeleteDialog(organizationName: string) {
    const user = userEvent.setup()
    
    // Find the row containing the organization
    const targetRow = screen.getByText(organizationName).closest('tr')!
    const deleteButton = targetRow.querySelector('[aria-label*="delete"]') as HTMLElement
    await user.click(deleteButton)
    
    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
    })
  },

  async confirmDelete() {
    const user = userEvent.setup()
    const confirmButton = screen.getByText('Delete')
    await user.click(confirmButton)
  },

  async cancelDelete() {
    const user = userEvent.setup()
    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)
  },

  // Search and filter helpers
  async searchForOrganization(searchTerm: string) {
    const user = userEvent.setup()
    const searchInput = screen.getByPlaceholderText('Search organizations...')
    await user.clear(searchInput)
    await user.type(searchInput, searchTerm)
  },

  async clearSearch() {
    const user = userEvent.setup()
    const clearButton = screen.getByText('×')
    await user.click(clearButton)
  },

  // Sorting helpers
  async sortByName() {
    const user = userEvent.setup()
    const nameHeader = screen.getByText('Organization Name').closest('button')!
    await user.click(nameHeader)
  },

  async sortByCreatedDate() {
    const user = userEvent.setup()
    const createdHeader = screen.getByText('Created').closest('button')!
    await user.click(createdHeader)
  },

  // Verification helpers
  async expectOrganizationInList(organizationName: string, shouldExist = true) {
    if (shouldExist) {
      await waitFor(() => {
        expect(screen.getByText(organizationName)).toBeInTheDocument()
      })
    } else {
      await waitFor(() => {
        expect(screen.queryByText(organizationName)).not.toBeInTheDocument()
      })
    }
  },

  async expectSuccessMessage(organizationName: string, action: 'created' | 'updated' | 'deleted') {
    await waitFor(() => {
      expect(screen.getByText(`Organization "${organizationName}" ${action} successfully`)).toBeInTheDocument()
    })
  },

  async expectErrorMessage(errorText: string) {
    await waitFor(() => {
      expect(screen.getByText(errorText)).toBeInTheDocument()
    })
  },

  async expectTotalCount(count: number) {
    const expectedText = count === 0 
      ? 'No organizations found' 
      : `${count} organization${count === 1 ? '' : 's'} total`
    
    await waitFor(() => {
      expect(screen.getByText(expectedText)).toBeInTheDocument()
    })
  },

  async expectEmptyState() {
    await waitFor(() => {
      expect(screen.getByText('No organizations yet.')).toBeInTheDocument()
      expect(screen.getByText('Create First Organization')).toBeInTheDocument()
    })
  },

  async expectNoResultsState() {
    await waitFor(() => {
      expect(screen.getByText('No organizations found matching your search.')).toBeInTheDocument()
    })
  },

  async expectLoadingState() {
    expect(screen.getByText('Loading organizations...')).toBeInTheDocument()
  },

  async expectNoLoadingState() {
    expect(screen.queryByText('Loading organizations...')).not.toBeInTheDocument()
  },

  // Complex workflow helpers
  async createOrganization(name: string) {
    await this.openCreateDialog()
    await this.fillOrganizationForm(name)
    await this.submitOrganizationForm('create')
    await this.expectSuccessMessage(name, 'created')
  },

  async editOrganization(currentName: string, newName: string) {
    await this.openEditDialog(currentName)
    await this.fillOrganizationForm(newName)
    await this.submitOrganizationForm('update')
    await this.expectSuccessMessage(newName, 'updated')
  },

  async deleteOrganization(name: string) {
    await this.openDeleteDialog(name)
    await this.confirmDelete()
    await this.expectSuccessMessage(name, 'deleted')
  },

  // Validation helpers
  expectFormValidation: {
    async requiredField() {
      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument()
      })
    },

    async minLength() {
      await waitFor(() => {
        expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument()
      })
    },

    async maxLength() {
      await waitFor(() => {
        expect(screen.getByText(/less than 100 characters/i)).toBeInTheDocument()
      })
    },

    async duplicateName() {
      await waitFor(() => {
        expect(screen.getByText(/already exists/i)).toBeInTheDocument()
      })
    }
  },

  // Accessibility helpers
  async expectKeyboardNavigation() {
    const user = userEvent.setup()
    
    // Tab to create button
    await user.tab()
    expect(screen.getByLabelText(/create new organization/i)).toHaveFocus()
    
    // Tab to search input
    await user.tab()
    expect(screen.getByPlaceholderText('Search organizations...')).toHaveFocus()
  },

  async expectProperAriaLabels() {
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(3)
    expect(screen.getAllByLabelText(/edit organization/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/delete organization/i).length).toBeGreaterThan(0)
  }
}

// Export individual functions for convenience
export const {
  fillOrganizationForm,
  submitOrganizationForm,
  cancelOrganizationForm,
  openCreateDialog,
  openEditDialog,
  openDeleteDialog,
  confirmDelete,
  cancelDelete,
  searchForOrganization,
  clearSearch,
  sortByName,
  sortByCreatedDate,
  expectOrganizationInList,
  expectSuccessMessage,
  expectErrorMessage,
  expectTotalCount,
  expectEmptyState,
  expectNoResultsState,
  expectLoadingState,
  expectNoLoadingState,
  createOrganization,
  editOrganization,
  deleteOrganization,
} = organizationTestHelpers

// Test data generators
export const generateMockOrganizations = (count: number): Organization[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: (index + 1).toString(),
    name: `Test Organization ${index + 1}`,
    created_at: new Date(2024, 0, index + 1).toISOString(),
  }))
}

export const generateLargeDataset = (count = 100): Organization[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: (index + 1).toString(),
    name: `Organization ${String(index + 1).padStart(3, '0')}`,
    created_at: new Date(2024, 0, (index % 30) + 1).toISOString(),
  }))
}

// Common test scenarios
export const testScenarios = {
  validNames: [
    'Valid Organization',
    'Org with Numbers 123',
    'Org-with-hyphens',
    'Org_with_underscores',
    'A'.repeat(100), // Max length
  ],
  
  invalidNames: [
    '', // Empty
    ' ', // Just spaces
    'A', // Too short
    'A'.repeat(101), // Too long
  ],
  
  edgeCaseNames: [
    'Organization with very long name that approaches the character limit and tests UI handling',
    'Org with émojis 🏢',
    'Org with "quotes" and special chars!@#$%',
    '   Org with leading/trailing spaces   ',
  ]
}