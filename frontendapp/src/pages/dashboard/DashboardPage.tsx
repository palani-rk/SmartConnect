import { useAuth } from '@/hooks/useAuth'

const DashboardPage = () => {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Welcome back, {user?.email}!
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700">Your Role</h3>
            <p className="text-2xl font-bold text-primary-600 capitalize mt-2">
              {user?.role}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700">Organization</h3>
            <p className="text-sm text-gray-600 mt-2">
              ID: {user?.organization_id}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700">Integrations</h3>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-600">
                WhatsApp: {user?.whatsapp_id || 'Not connected'}
              </p>
              <p className="text-xs text-gray-600">
                Instagram: {user?.instagram_id || 'Not connected'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage