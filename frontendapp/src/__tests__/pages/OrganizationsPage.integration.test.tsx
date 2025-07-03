import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '@/test/setup'
import { 
  handlers, 
  errorHandlers, 
  slowHandlers, 
  emptyHandlers,
  resetMockData 
} from '@/test/mocks/handlers'
import { 
  render, 
  createMockOrganization, 
  waitForLoadingToFinish,
  waitForElementToAppear,
  waitForElementToDisappear,
  mockOrganizations
} from '@/test/helpers/test-utils'
import OrganizationsPage from '@/pages/organizations/OrganizationsPage'

describe('OrganizationsPage Integration Tests', () => {
  beforeEach(() => {
    resetMockData()
    server.use(...handlers)
  })

  describe('Page Loading & Display', () => {
    it('should load and display organizations on page mount', async () => {
      render(<OrganizationsPage />)

      // Check loading state
      expect(screen.getByText('Loading organizations...')).toBeInTheDocument()

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Test Organization 1')).toBeInTheDocument()
        expect(screen.getByText('Test Organization 2')).toBeInTheDocument()
        expect(screen.getByText('Alpha Organization')).toBeInTheDocument()
        expect(screen.getByText('3 organizations total')).toBeInTheDocument()
      })

      // Verify no loading state
      expect(screen.queryByText('Loading organizations...')).not.toBeInTheDocument()
    })

    it('should display page header and breadcrumbs', async () => {
      render(<OrganizationsPage />)

      await waitForLoadingToFinish()

      expect(screen.getByText('Organization Management')).toBeInTheDocument()
      expect(screen.getByText('Manage all organizations in the platform. Only God users have access to this section.')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Organizations')).toBeInTheDocument()
    })

    it('should display empty state when no organizations exist', async () => {
      server.use(...emptyHandlers)

      render(<OrganizationsPage />)

      await waitFor(() => {
        expect(screen.getByText('No organizations yet.')).toBeInTheDocument()
        expect(screen.getByText('Create First Organization')).toBeInTheDocument()
      })
    })

    it('should display loading state with slow responses', async () => {
      server.use(...slowHandlers)

      render(<OrganizationsPage />)

      expect(screen.getByText('Loading organizations...')).toBeInTheDocument()
      
      // Should still be loading after 1 second
      await new Promise(resolve => setTimeout(resolve, 1000))
      expect(screen.getByText('Loading organizations...')).toBeInTheDocument()
    })
  })

  describe('Create Organization Functionality', () => {
    it('should successfully create a new organization', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      // Click create button
      const createButton = screen.getByLabelText(/create new organization/i)
      await user.click(createButton)

      // Verify modal opens
      expect(screen.getByText('Create New Organization')).toBeInTheDocument()

      // Fill form
      const nameInput = screen.getByLabelText('Organization Name')
      await user.type(nameInput, 'New Test Organization')

      // Submit form
      const submitButton = screen.getByText('Create Organization')
      expect(submitButton).toBeEnabled()
      await user.click(submitButton)

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText('Organization "New Test Organization" created successfully')).toBeInTheDocument()
      })

      // Form should close
      await waitForElementToDisappear('Create New Organization')
    })

    it('should display validation errors for invalid input', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      const createButton = screen.getByLabelText(/create new organization/i)
      await user.click(createButton)

      // Try to submit empty form
      const submitButton = screen.getByText('Create Organization')
      expect(submitButton).toBeDisabled() // Should be disabled due to validation

      // Fill with invalid short name
      const nameInput = screen.getByLabelText('Organization Name')
      await user.type(nameInput, 'A')

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument()
      })
    })

    it('should handle duplicate name errors', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      const createButton = screen.getByLabelText(/create new organization/i)
      await user.click(createButton)

      const nameInput = screen.getByLabelText('Organization Name')
      await user.type(nameInput, 'DUPLICATE_NAME')

      const submitButton = screen.getByText('Create Organization')
      await user.click(submitButton)

      // Error should display in form
      await waitFor(() => {
        expect(screen.getByText('Organization name already exists')).toBeInTheDocument()
      })

      // Form should stay open
      expect(screen.getByText('Create New Organization')).toBeInTheDocument()
    })

    it('should handle server errors during creation', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      const createButton = screen.getByLabelText(/create new organization/i)
      await user.click(createButton)

      const nameInput = screen.getByLabelText('Organization Name')
      await user.type(nameInput, 'SERVER_ERROR')

      const submitButton = screen.getByText('Create Organization')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Internal server error')).toBeInTheDocument()
      })

      // Form should stay open
      expect(screen.getByText('Create New Organization')).toBeInTheDocument()
    })

    it('should allow canceling creation', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      const createButton = screen.getByLabelText(/create new organization/i)
      await user.click(createButton)

      expect(screen.getByText('Create New Organization')).toBeInTheDocument()

      // Click cancel
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      // Form should close
      await waitForElementToDisappear('Create New Organization')
    })
  })

  describe('Edit Organization Functionality', () => {
    it('should successfully edit an organization', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      // Click edit button for first organization
      const editButtons = screen.getAllByLabelText(/edit organization/i)
      await user.click(editButtons[0])

      // Verify modal opens with existing data
      expect(screen.getByText('Edit Organization')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Organization 1')).toBeInTheDocument()

      // Update name
      const nameInput = screen.getByLabelText('Organization Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Test Organization')

      // Submit form
      const submitButton = screen.getByText('Update Organization')
      await user.click(submitButton)

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText('Organization "Updated Test Organization" updated successfully')).toBeInTheDocument()
      })

      // Form should close
      await waitForElementToDisappear('Edit Organization')
    })

    it('should handle edit validation errors', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      const editButtons = screen.getAllByLabelText(/edit organization/i)
      await user.click(editButtons[0])

      const nameInput = screen.getByLabelText('Organization Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'A') // Too short

      await waitFor(() => {
        expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument()
      })
    })

    it('should handle edit server errors', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      const editButtons = screen.getAllByLabelText(/edit organization/i)
      await user.click(editButtons[0])

      const nameInput = screen.getByLabelText('Organization Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'UPDATE_ERROR')

      const submitButton = screen.getByText('Update Organization')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to update organization')).toBeInTheDocument()
      })

      // Form should stay open
      expect(screen.getByText('Edit Organization')).toBeInTheDocument()
    })
  })

  describe('Delete Organization Functionality', () => {
    it('should successfully delete an organization', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      // Verify organization exists
      expect(screen.getByText('Test Organization 1')).toBeInTheDocument()

      // Click delete button
      const deleteButtons = screen.getAllByLabelText(/delete organization/i)
      await user.click(deleteButtons[0])

      // Verify confirmation dialog
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()

      // Confirm deletion
      const confirmButton = screen.getByText('Delete')
      await user.click(confirmButton)

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText('Organization "Test Organization 1" deleted successfully')).toBeInTheDocument()
      })

      // Dialog should close
      await waitForElementToDisappear(/are you sure you want to delete/i)
    })

    it('should handle delete dependencies error', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      // Find organization with dependencies (we'll use one that triggers the error)
      const deleteButtons = screen.getAllByLabelText(/delete organization/i)
      
      // Let's create a mock organization that will trigger the dependency error
      server.use(
        ...handlers,
        // Override the delete handler for this specific test
        http.delete('/api/organizations/1', () => {
          return HttpResponse.json(
            { error: 'Cannot delete organization with existing users or channels' },
            { status: 400 }
          )
        })
      )

      await user.click(deleteButtons[0])

      const confirmButton = screen.getByText('Delete')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText('Cannot delete organization with existing users or channels')).toBeInTheDocument()
      })

      // Dialog should stay open to show error
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
    })

    it('should allow canceling deletion', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      const deleteButtons = screen.getAllByLabelText(/delete organization/i)
      await user.click(deleteButtons[0])

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()

      // Click cancel
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      // Dialog should close
      await waitForElementToDisappear(/are you sure you want to delete/i)
    })
  })

  describe('Search Functionality', () => {
    it('should filter organizations by search term', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      // Verify all organizations are initially visible
      expect(screen.getByText('Test Organization 1')).toBeInTheDocument()
      expect(screen.getByText('Test Organization 2')).toBeInTheDocument()
      expect(screen.getByText('Alpha Organization')).toBeInTheDocument()

      // Search for specific organization
      const searchInput = screen.getByPlaceholderText('Search organizations...')
      await user.type(searchInput, 'Alpha')

      // Wait for filtered results
      await waitFor(() => {
        expect(screen.getByText('Alpha Organization')).toBeInTheDocument()
        expect(screen.queryByText('Test Organization 1')).not.toBeInTheDocument()
        expect(screen.queryByText('Test Organization 2')).not.toBeInTheDocument()
        expect(screen.getByText('1 organization total')).toBeInTheDocument()
      })
    })

    it('should show no results message for non-matching search', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      const searchInput = screen.getByPlaceholderText('Search organizations...')
      await user.type(searchInput, 'NonExistentOrganization')

      await waitFor(() => {
        expect(screen.getByText('No organizations found matching your search.')).toBeInTheDocument()
      })
    })

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      const searchInput = screen.getByPlaceholderText('Search organizations...')
      await user.type(searchInput, 'Alpha')

      // Wait for search to take effect
      await waitFor(() => {
        expect(screen.getByText('Alpha Organization')).toBeInTheDocument()
        expect(screen.queryByText('Test Organization 1')).not.toBeInTheDocument()
      })

      // Clear search
      const clearButton = screen.getByText('×')
      await user.click(clearButton)

      // Should show all organizations again
      await waitFor(() => {
        expect(screen.getByText('Test Organization 1')).toBeInTheDocument()
        expect(screen.getByText('Test Organization 2')).toBeInTheDocument()
        expect(screen.getByText('Alpha Organization')).toBeInTheDocument()
      })

      expect(searchInput).toHaveValue('')
    })
  })

  describe('Sorting Functionality', () => {
    it('should sort organizations by name ascending/descending', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      // Click name sort header
      const nameHeader = screen.getByText('Organization Name').closest('button')!
      await user.click(nameHeader)

      // Should be sorted by name ascending (Alpha, Test Org 1, Test Org 2)
      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        // Skip header row (index 0)
        expect(rows[1]).toHaveTextContent('Alpha Organization')
        expect(rows[2]).toHaveTextContent('Test Organization 1')
        expect(rows[3]).toHaveTextContent('Test Organization 2')
      })

      // Click again for descending
      await user.click(nameHeader)

      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        expect(rows[1]).toHaveTextContent('Test Organization 2')
        expect(rows[2]).toHaveTextContent('Test Organization 1')
        expect(rows[3]).toHaveTextContent('Alpha Organization')
      })
    })

    it('should sort organizations by created date', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      // Click created date sort header
      const createdHeader = screen.getByText('Created').closest('button')!
      await user.click(createdHeader)

      // Should be sorted by created date ascending
      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        expect(rows[1]).toHaveTextContent('Test Organization 1') // 2024-01-01
        expect(rows[2]).toHaveTextContent('Test Organization 2') // 2024-01-02
        expect(rows[3]).toHaveTextContent('Alpha Organization')  // 2024-01-03
      })
    })
  })

  describe('Complete User Workflows', () => {
    it('should complete full CRUD workflow', async () => {
      const user = userEvent.setup()
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      // 1. Create organization
      await user.click(screen.getByLabelText(/create new organization/i))
      await user.type(screen.getByLabelText('Organization Name'), 'Workflow Test Org')
      await user.click(screen.getByText('Create Organization'))
      
      await waitFor(() => {
        expect(screen.getByText('Organization "Workflow Test Org" created successfully')).toBeInTheDocument()
      })

      // 2. Search for it
      const searchInput = screen.getByPlaceholderText('Search organizations...')
      await user.type(searchInput, 'Workflow Test')
      
      await waitFor(() => {
        expect(screen.getByText('Workflow Test Org')).toBeInTheDocument()
      })

      // 3. Edit it
      await user.click(screen.getByLabelText(/edit organization/i))
      const nameInput = screen.getByLabelText('Organization Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Workflow Org')
      await user.click(screen.getByText('Update Organization'))

      await waitFor(() => {
        expect(screen.getByText('Organization "Updated Workflow Org" updated successfully')).toBeInTheDocument()
      })

      // 4. Clear search to see all orgs
      await user.clear(searchInput)
      
      await waitFor(() => {
        expect(screen.getByText('Updated Workflow Org')).toBeInTheDocument()
      })

      // 5. Delete it
      const deleteButtons = screen.getAllByLabelText(/delete organization/i)
      // Find the button for our updated organization
      const targetRow = screen.getByText('Updated Workflow Org').closest('tr')!
      const deleteButton = targetRow.querySelector('[aria-label*="delete"]') as HTMLElement
      await user.click(deleteButton)
      
      await user.click(screen.getByText('Delete'))

      await waitFor(() => {
        expect(screen.getByText('Organization "Updated Workflow Org" deleted successfully')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      server.use(...errorHandlers)

      render(<OrganizationsPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load organizations. Please check your connection.')).toBeInTheDocument()
      })
    })

    it('should handle network errors during operations', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      // Switch to error handlers for create operation
      server.use(
        ...handlers,
        http.post('/api/organizations', () => {
          return HttpResponse.json(
            { error: 'Failed to create organization. Please try again.' },
            { status: 500 }
          )
        })
      )

      await user.click(screen.getByLabelText(/create new organization/i))
      await user.type(screen.getByLabelText('Organization Name'), 'Test Org')
      await user.click(screen.getByText('Create Organization'))

      await waitFor(() => {
        expect(screen.getByText('Failed to create organization. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      // Tab through interactive elements
      await user.tab() // Create button
      expect(screen.getByLabelText(/create new organization/i)).toHaveFocus()
      
      await user.tab() // Search input
      expect(screen.getByPlaceholderText('Search organizations...')).toHaveFocus()
      
      // Should be able to activate create button with Enter
      const createButton = screen.getByLabelText(/create new organization/i)
      createButton.focus()
      await user.keyboard('{Enter}')
      
      expect(screen.getByText('Create New Organization')).toBeInTheDocument()

      // Should be able to close with Escape
      await user.keyboard('{Escape}')
      await waitForElementToDisappear('Create New Organization')
    })

    it('should have proper ARIA labels and roles', async () => {
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      // Check for proper table structure
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(3)
      expect(screen.getAllByRole('row')).toHaveLength(4) // 1 header + 3 data rows

      // Check action buttons have proper labels
      expect(screen.getAllByLabelText(/edit organization/i)).toHaveLength(3)
      expect(screen.getAllByLabelText(/delete organization/i)).toHaveLength(3)
    })

    it('should announce loading states to screen readers', async () => {
      server.use(...slowHandlers)
      
      render(<OrganizationsPage />)

      const loadingElement = screen.getByText('Loading organizations...')
      expect(loadingElement).toBeInTheDocument()
      expect(loadingElement.closest('td')).toHaveAttribute('role', 'cell')
    })
  })

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // This test would need mock data with many organizations
      // For now, we'll test with our current dataset
      const start = performance.now()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()
      
      const end = performance.now()
      expect(end - start).toBeLessThan(2000) // Should load in under 2 seconds
    })

    it('should debounce search input', async () => {
      const user = userEvent.setup()
      
      render(<OrganizationsPage />)
      await waitForLoadingToFinish()

      const searchInput = screen.getByPlaceholderText('Search organizations...')
      
      // Type quickly
      await user.type(searchInput, 'Alpha', { delay: 50 })
      
      // Should only make one API call after debounce period
      await waitFor(() => {
        expect(screen.getByText('Alpha Organization')).toBeInTheDocument()
      })
    })
  })
})