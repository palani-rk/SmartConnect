import React, { useState, useCallback } from 'react'
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
  Button,
  Chip,
  Select,
  MenuItem,
  FormControl,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { useUserStore } from '@/stores/userStore'
import { useAuthStore } from '@/stores/authStore'
import { USER_ROLES } from '@/constants'
import type { User } from '@/types/user'

interface UserManagementTableProps {
  organizationId: string
  onCreateUser: () => void
  onEditUser: (user: User) => void
}

const UserManagementTable: React.FC<UserManagementTableProps> = ({
  organizationId,
  onCreateUser,
  onEditUser,
}) => {
  const { user: currentUser } = useAuthStore()
  const userRole = currentUser?.role

  const {
    getUsersByOrg,
    deleteUser,
    updateUserRole,
    isLoading,
    error,
    clearError,
  } = useUserStore()

  // Local state
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Get users and apply filters
  const allUsers = getUsersByOrg(organizationId)
  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = !roleFilter || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Permission helpers
  const canCreateUsers = userRole === USER_ROLES.GOD || userRole === USER_ROLES.ADMIN
  const canEditUser = (user: User) => {
    if (userRole === USER_ROLES.GOD) return true
    if (userRole === USER_ROLES.ADMIN) {
      // Admin can edit users in their org, but not other god users
      return user.role !== USER_ROLES.GOD
    }
    return false
  }
  const canDeleteUser = (user: User) => canEditUser(user)
  const canChangeRole = (user: User) => canEditUser(user)

  // Get available roles for role changes
  const getAvailableRoles = (user: User) => {
    if (userRole === USER_ROLES.GOD) {
      return [USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.CLIENT, USER_ROLES.GOD]
    }
    if (userRole === USER_ROLES.ADMIN) {
      // Admin can assign user, admin, client roles but not god
      return [USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.CLIENT]
    }
    return []
  }

  // Event handlers
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  const handleRoleFilterChange = (event: any) => {
    setRoleFilter(event.target.value)
  }

  const handleDeleteClick = useCallback((user: User) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return

    setIsDeleting(true)
    try {
      await deleteUser(userToDelete.id, organizationId)
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    } catch (error) {
      // Error handled by store
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setUserToDelete(null)
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole)
    } catch (error) {
      // Error handled by store
    }
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

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <PersonIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            User Management
          </Typography>
          <Chip 
            label={filteredUsers.length} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>
        
        {canCreateUsers && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateUser}
            sx={{ minWidth: 'auto' }}
          >
            Add User
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          placeholder="Search users..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
          size="small"
        />
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={roleFilter}
            onChange={handleRoleFilterChange}
            displayEmpty
          >
            <MenuItem value="">All Roles</MenuItem>
            <MenuItem value={USER_ROLES.GOD}>God</MenuItem>
            <MenuItem value={USER_ROLES.ADMIN}>Admin</MenuItem>
            <MenuItem value={USER_ROLES.USER}>User</MenuItem>
            <MenuItem value={USER_ROLES.CLIENT}>Client</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Error Display */}
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
                <Typography variant="subtitle2" fontWeight="bold">
                  Email
                </Typography>
              </TableCell>
              <TableCell width={120}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Role
                </Typography>
              </TableCell>
              <TableCell width={140}>
                <Typography variant="subtitle2" fontWeight="bold">
                  WhatsApp
                </Typography>
              </TableCell>
              <TableCell width={140}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Instagram
                </Typography>
              </TableCell>
              <TableCell width={120}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Created
                </Typography>
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
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Loading users...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {searchTerm || roleFilter ? 'No users found matching your filters.' : 'No users in this organization yet.'}
                  </Typography>
                  {!searchTerm && !roleFilter && canCreateUsers && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={onCreateUser}
                      sx={{ mt: 2 }}
                    >
                      Add First User
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {canChangeRole(user) ? (
                      <FormControl size="small" fullWidth>
                        <Select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          variant="outlined"
                        >
                          {getAvailableRoles(user).map((role) => (
                            <MenuItem key={role} value={role}>
                              <Chip 
                                label={role} 
                                size="small" 
                                color={getRoleColor(role) as any}
                                variant="outlined"
                              />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <Chip 
                        label={user.role} 
                        size="small" 
                        color={getRoleColor(user.role) as any}
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {user.whatsapp_id || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {user.instagram_id || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {user.created_at
                        ? format(new Date(user.created_at), 'MMM dd, yyyy')
                        : '-'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={1} justifyContent="center">
                      {canEditUser(user) && (
                        <Tooltip title="Edit user">
                          <IconButton
                            size="small"
                            onClick={() => onEditUser(user)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canDeleteUser(user) && (
                        <Tooltip title="Delete user">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(user)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
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
          {filteredUsers.length === 0 
            ? 'No users found' 
            : `${filteredUsers.length} of ${allUsers.length} user${allUsers.length === 1 ? '' : 's'}`
          }
        </Typography>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{userToDelete?.email}</strong>?
            This action cannot be undone and will remove all user data and access.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default UserManagementTable