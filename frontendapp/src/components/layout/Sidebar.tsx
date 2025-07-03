import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { USER_ROLES } from '@/constants'
import type { UserRole } from '@/types/auth'
import { useAuthStore } from '@/stores/authStore'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material'

interface NavItem {
  path: string | ((user: any) => string)
  label: string
  roles?: string[]
}

const getNavItems = (user: any): NavItem[] => [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/messages', label: 'Messages' },
  { 
    path: '/channels', 
    label: 'Channels',
    roles: [USER_ROLES.GOD, USER_ROLES.ADMIN, USER_ROLES.USER]
  },
  { 
    path: (currentUser: any) => {
      // Admin users go to their organization detail page to manage users
      if (currentUser?.role === USER_ROLES.ADMIN && currentUser?.organization_id) {
        return `/organizations/${currentUser.organization_id}`
      }
      // God users go to the general users page
      return '/users'
    },
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

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ open = true, onClose }) => {
  const { canAccess, getUserRole } = useAuth()
  const { user } = useAuthStore()
  const userRole = getUserRole()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const navItems = getNavItems(user)
  const visibleNavItems = navItems.filter(item => {
    if (!item.roles) return true // No role restriction
    return canAccess(item.roles as UserRole[])
  })

  const drawerWidth = 256

  // Shared drawer content
  const drawerContent = (
    <Box sx={{ p: 2 }}>
      <List sx={{ gap: 1 }}>
        {visibleNavItems.map((item) => {
          const path = typeof item.path === 'function' ? item.path(user) : item.path
          const itemKey = typeof item.path === 'function' ? item.label : item.path
          
          return (
            <ListItem key={itemKey} disablePadding>
              <ListItemButton
                component={NavLink}
                to={path}
                onClick={isMobile ? onClose : undefined}
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
          )
        })}
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
  )

  if (isMobile) {
    // Mobile: Temporary drawer that slides in from left
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: 'white',
            boxShadow: 1,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    )
  }

  // Desktop: Permanent drawer
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          position: 'relative',
          backgroundColor: 'white',
          boxShadow: 1,
          borderRight: 1,
          borderColor: 'grey.200',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  )
}