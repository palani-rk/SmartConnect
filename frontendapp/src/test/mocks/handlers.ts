import { http, HttpResponse } from 'msw'
import type { Organization } from '@/types/organization'

// Mock data storage (resets for each test)
let mockOrganizations: Organization[] = [
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

// Helper function to reset mock data
export const resetMockData = () => {
  mockOrganizations = [
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
}

// Default handlers for success scenarios
export const handlers = [
  // Get organizations with search, sort, and pagination
  http.get('/api/organizations', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const sortBy = url.searchParams.get('sortBy') || 'created_at'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    
    let filtered = [...mockOrganizations]
    
    // Apply search filter
    if (search) {
      filtered = filtered.filter(org => 
        org.name.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = sortBy === 'name' ? a.name : a.created_at
      const bVal = sortBy === 'name' ? b.name : b.created_at
      const comparison = aVal.localeCompare(bVal)
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedResults = filtered.slice(startIndex, endIndex)
    
    return HttpResponse.json({
      data: paginatedResults,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
      success: true,
    })
  }),

  // Create organization
  http.post('/api/organizations', async ({ request }) => {
    const body = await request.json() as { name: string }
    
    // Simulate validation errors
    if (!body.name || body.name.trim().length === 0) {
      return HttpResponse.json(
        { error: 'Organization name is required', field: 'name' },
        { status: 400 }
      )
    }
    
    if (body.name.length < 2) {
      return HttpResponse.json(
        { error: 'Organization name must be at least 2 characters', field: 'name' },
        { status: 400 }
      )
    }
    
    if (body.name.length > 100) {
      return HttpResponse.json(
        { error: 'Organization name must be less than 100 characters', field: 'name' },
        { status: 400 }
      )
    }
    
    // Simulate duplicate name error
    if (body.name === 'DUPLICATE_NAME' || mockOrganizations.some(org => org.name === body.name)) {
      return HttpResponse.json(
        { error: 'Organization name already exists', field: 'name' },
        { status: 400 }
      )
    }
    
    // Simulate server error
    if (body.name === 'SERVER_ERROR') {
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
    
    const newOrg: Organization = {
      id: (Date.now() + Math.random()).toString(),
      name: body.name.trim(),
      created_at: new Date().toISOString(),
    }
    
    mockOrganizations.push(newOrg)
    
    return HttpResponse.json({
      data: newOrg,
      success: true,
    })
  }),

  // Update organization
  http.put('/api/organizations/:id', async ({ request, params }) => {
    const body = await request.json() as { name: string }
    const { id } = params
    
    // Find organization
    const orgIndex = mockOrganizations.findIndex(org => org.id === id)
    if (orgIndex === -1) {
      return HttpResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }
    
    // Simulate validation errors (same as create)
    if (!body.name || body.name.trim().length === 0) {
      return HttpResponse.json(
        { error: 'Organization name is required', field: 'name' },
        { status: 400 }
      )
    }
    
    if (body.name.length < 2) {
      return HttpResponse.json(
        { error: 'Organization name must be at least 2 characters', field: 'name' },
        { status: 400 }
      )
    }
    
    if (body.name.length > 100) {
      return HttpResponse.json(
        { error: 'Organization name must be less than 100 characters', field: 'name' },
        { status: 400 }
      )
    }
    
    // Simulate duplicate name error (excluding current org)
    if (mockOrganizations.some(org => org.name === body.name && org.id !== id)) {
      return HttpResponse.json(
        { error: 'Organization name already exists', field: 'name' },
        { status: 400 }
      )
    }
    
    // Simulate specific error scenarios
    if (body.name === 'UPDATE_ERROR') {
      return HttpResponse.json(
        { error: 'Failed to update organization' },
        { status: 500 }
      )
    }
    
    const updatedOrg: Organization = {
      ...mockOrganizations[orgIndex],
      name: body.name.trim(),
    }
    
    mockOrganizations[orgIndex] = updatedOrg
    
    return HttpResponse.json({
      data: updatedOrg,
      success: true,
    })
  }),

  // Delete organization
  http.delete('/api/organizations/:id', ({ params }) => {
    const { id } = params
    
    // Find organization
    const orgIndex = mockOrganizations.findIndex(org => org.id === id)
    if (orgIndex === -1) {
      return HttpResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }
    
    // Simulate constraint error
    if (id === 'has-dependencies' || mockOrganizations[orgIndex].name.includes('Dependencies')) {
      return HttpResponse.json(
        { error: 'Cannot delete organization with existing users or channels' },
        { status: 400 }
      )
    }
    
    // Simulate server error
    if (id === 'delete-server-error') {
      return HttpResponse.json(
        { error: 'Internal server error during deletion' },
        { status: 500 }
      )
    }
    
    // Remove organization
    mockOrganizations.splice(orgIndex, 1)
    
    return HttpResponse.json({ 
      success: true,
      message: 'Organization deleted successfully'
    })
  }),
]

// Error handlers for testing error scenarios
export const errorHandlers = [
  // Network error for get organizations
  http.get('/api/organizations', () => {
    return HttpResponse.json(
      { error: 'Failed to load organizations. Please check your connection.' },
      { status: 500 }
    )
  }),
  
  // Network error for create
  http.post('/api/organizations', () => {
    return HttpResponse.json(
      { error: 'Failed to create organization. Please try again.' },
      { status: 500 }
    )
  }),
  
  // Network error for update
  http.put('/api/organizations/:id', () => {
    return HttpResponse.json(
      { error: 'Failed to update organization. Please try again.' },
      { status: 500 }
    )
  }),
  
  // Network error for delete
  http.delete('/api/organizations/:id', () => {
    return HttpResponse.json(
      { error: 'Failed to delete organization. Please try again.' },
      { status: 500 }
    )
  }),
]

// Slow response handlers for testing loading states
export const slowHandlers = [
  http.get('/api/organizations', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    return HttpResponse.json({
      data: mockOrganizations,
      total: mockOrganizations.length,
      success: true,
    })
  }),
]

// Empty data handlers
export const emptyHandlers = [
  http.get('/api/organizations', () => {
    return HttpResponse.json({
      data: [],
      total: 0,
      success: true,
    })
  }),
]