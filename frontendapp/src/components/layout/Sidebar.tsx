import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { USER_ROLES } from '@/constants'
import type { UserRole } from '@/types/auth'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  Divider,
} from '@mui/material'

interface NavItem {
  path: string
  label: string
  roles?: string[]
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/messages', label: 'Messages' },
  { 
    path: '/channels', 
    label: 'Channels',
    roles: [USER_ROLES.GOD, USER_ROLES.ADMIN, USER_ROLES.USER]
  },
  { 
    path: '/users', 
    label: 'Users',
    roles: [USER_ROLES.GOD, USER_ROLES.ADMIN]
  },
  { 
    path: '/organizations', 
    label: 'Organizations',
    roles: [USER_ROLES.GOD]
  },
  { 
    path: '/integrations', 
    label: 'Integrations',
    roles: [USER_ROLES.ADMIN]
  },
  { path: '/profile', label: 'Profile' },
]

export const Sidebar = () => {
  const { canAccess, getUserRole } = useAuth()
  const userRole = getUserRole()

  const visibleNavItems = navItems.filter(item => {
    if (!item.roles) return true // No role restriction
    return canAccess(item.roles as UserRole[])
  })

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 256,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 256,
          boxSizing: 'border-box',
          position: 'relative',
          backgroundColor: 'white',
          boxShadow: 1,
          borderRight: 1,
          borderColor: 'grey.200',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <List sx={{ gap: 1 }}>
          {visibleNavItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={NavLink}
                to={item.path}
                sx={() => ({
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  fontSize: '0.875rem',
                  fontWeight: 'medium',
                  '&.active': {
                    backgroundColor: 'primary.100',
                    color: 'primary.700',
                  },
                  '&:not(.active)': {
                    color: 'grey.700',
                    '&:hover': {
                      backgroundColor: 'grey.100',
                    },
                  },
                })}
              >
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: 'medium',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* Role indicator */}
        {userRole && (
          <Box sx={{ mt: 4, pt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="caption" color="text.secondary">
              Role
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 'medium', 
                color: 'grey.700',
                textTransform: 'capitalize'
              }}
            >
              {userRole}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  )
}