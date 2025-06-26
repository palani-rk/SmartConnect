import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Tooltip,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Button,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Add as AddIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { useOrganizationStore } from '@/stores/organizationStore'
import type { Organization } from '@/types/organization'

interface OrganizationListProps {
  onCreateClick: () => void
  onEditClick: (organization: Organization) => void
  onDeleteClick: (organization: Organization) => void
}

const OrganizationList: React.FC<OrganizationListProps> = ({
  onCreateClick,
  onEditClick,
  onDeleteClick,
}) => {
  const navigate = useNavigate()
  const {
    organizations,
    isLoading,
    error,
    total,
    fetchOrganizations,
    clearError,
  } = useOrganizationStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<'name' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Track if initial load has completed
  const hasInitialLoaded = useRef(false)

  // Initial load - runs once on mount
  useEffect(() => {
    console.log('🔵 Initial load effect triggered')
    fetchOrganizations()
    hasInitialLoaded.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only run once on mount

  // State changes - only runs after initial load
  useEffect(() => {
    if (!hasInitialLoaded.current) {
      return
    }

    console.log('🟡 State change effect triggered', {
      searchTerm,
      sortField,
      sortOrder
    })

    const timer = setTimeout(() => {
      const params = { 
        sortBy: sortField,
        sortOrder: sortOrder,
        search: searchTerm || undefined 
      }
      fetchOrganizations(params)
    }, searchTerm !== '' ? 300 : 0) // Debounce search, immediate for sort

    return () => clearTimeout(timer)
  }, [searchTerm, sortField, sortOrder, fetchOrganizations])

  const handleSort = useCallback((field: 'name' | 'created_at') => {

    console.log('🔴 Sort handler triggered', {
        field,
        currentSortField: sortField,
        currentSortOrder: sortOrder
      })
    
    const newSortOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc'
    setSortField(field)
    setSortOrder(newSortOrder)
    
    const newParams = {
      sortBy: field,
      sortOrder: newSortOrder,
      search: searchTerm || undefined
    }
    
    fetchOrganizations(newParams)
  }, [sortField, sortOrder, searchTerm, fetchOrganizations])

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  const handleSearchClear = () => {
    setSearchTerm('')
  }

  const handleEditClick = useCallback((organization: Organization) => {
    onEditClick(organization)
  }, [onEditClick])

  const handleDeleteClick = useCallback((organization: Organization) => {
    onDeleteClick(organization)
  }, [onDeleteClick])

  const handleViewClick = useCallback((organization: Organization) => {
    navigate(`/organizations/${organization.id}`)
  }, [navigate])

  const getSortIcon = (field: 'name' | 'created_at') => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Organizations
        </Typography>
        <Tooltip title="Create new organization">
          <IconButton
            color="primary"
            onClick={onCreateClick}
            size="large"
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Search */}
      <Box mb={2}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search organizations..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleSearchClear}
                  edge="end"
                >
                  ×
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 400 }}
        />
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Data Table */}
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('name')}
                  IconComponent={() => getSortIcon('name')}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    Organization Name
                  </Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell width={160}>
                <TableSortLabel
                  active={sortField === 'created_at'}
                  direction={sortField === 'created_at' ? sortOrder : 'asc'}
                  onClick={() => handleSort('created_at')}
                  IconComponent={() => getSortIcon('created_at')}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    Created
                  </Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell width={120} align="center">
                <Typography variant="subtitle2" fontWeight="bold">
                  Actions
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Loading organizations...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {searchTerm ? 'No organizations found matching your search.' : 'No organizations yet.'}
                  </Typography>
                  {!searchTerm && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={onCreateClick}
                      sx={{ mt: 2 }}
                    >
                      Create First Organization
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((organization) => (
                <TableRow
                  key={organization.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography 
                      variant="body1" 
                      fontWeight={500}
                      sx={{ 
                        cursor: 'pointer',
                        color: 'primary.main',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                      onClick={() => handleViewClick(organization)}
                    >
                      {organization.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {organization.created_at
                        ? format(new Date(organization.created_at), 'MMM dd, yyyy')
                        : '-'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={1} justifyContent="center">
                      <Tooltip title="View organization details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewClick(organization)}
                          color="info"
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit organization">
                        <IconButton
                          size="small"
                          onClick={() => handleEditClick(organization)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete organization">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(organization)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary */}
      <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {total === 0 ? 'No organizations found' : `${total} organization${total === 1 ? '' : 's'} total`}
        </Typography>
        {isLoading && (
          <Box display="flex" alignItems="center" gap={1}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default OrganizationList