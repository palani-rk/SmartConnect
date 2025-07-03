import React from 'react'
import { render, RenderOptions, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'
import type { Organization } from '@/types/organization'

const theme = createTheme()

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
}

// Enhanced wrapper with all providers
const AllTheProviders: React.FC<{ 
  children: React.ReactNode
  initialEntries?: string[]
}> = ({ children, initialEntries = ['/'] }) => {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </BrowserRouter>
  )
}

// Custom render function
const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialEntries, ...renderOptions } = options
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders initialEntries={initialEntries}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Utility functions
export const createMockOrganization = (overrides: Partial<Organization> = {}): Organization => ({
  id: Date.now().toString(),
  name: 'Test Organization',
  created_at: new Date().toISOString(),
  ...overrides,
})

export const waitForLoadingToFinish = () => 
  waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })

export const waitForElementToDisappear = (text: string | RegExp) =>
  waitFor(() => {
    expect(screen.queryByText(text)).not.toBeInTheDocument()
  })

export const waitForElementToAppear = (text: string | RegExp) =>
  waitFor(() => {
    expect(screen.getByText(text)).toBeInTheDocument()
  })

// Common test data
export const mockOrganizations: Organization[] = [
  {
    id: '1',
    name: 'Test Organization 1',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Test Organization 2',
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    name: 'Alpha Organization',
    created_at: '2024-01-03T00:00:00Z',
  },
]

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }