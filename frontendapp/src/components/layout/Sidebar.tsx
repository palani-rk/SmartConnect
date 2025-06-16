import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { USER_ROLES } from '@/constants'

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
    return canAccess(item.roles as any)
  })

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <nav className="p-4">
        <ul className="space-y-2">
          {visibleNavItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Role indicator */}
        {userRole && (
          <div className="mt-8 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">Role</div>
            <div className="text-sm font-medium text-gray-700 capitalize">
              {userRole}
            </div>
          </div>
        )}
      </nav>
    </aside>
  )
}