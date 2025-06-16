import { useAuth } from '@/hooks/useAuth'
import { env } from '@/utils/env'

export const Header = () => {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="bg-white shadow-lg border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SC</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                {env.APP_NAME}
              </h1>
            </div>
            <span className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full font-medium">
              v{env.APP_VERSION}
            </span>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <div className="text-sm text-right">
                  <div className="font-medium text-gray-900">{user.email}</div>
                  <div className="text-primary-600 capitalize font-medium">{user.role}</div>
                </div>
                
                <button
                  onClick={handleSignOut}
                  className="bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-200"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}