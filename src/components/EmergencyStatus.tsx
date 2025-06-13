import React from 'react'
import { useEmergencySuperAdmin } from '@/hooks/useEmergencySuperAdmin'
import { emergencySupabase } from '@/integrations/supabase/emergency-client'

export const EmergencyStatus = () => {
  const { user, isSuper, loading } = useEmergencySuperAdmin()
  const [connectionTest, setConnectionTest] = React.useState(null)

  const testConnection = async () => {
    try {
      const { data, error } = await emergencySupabase
        .from('profiles')
        .select('id')
        .limit(1)
      
      setConnectionTest({
        success: !error,
        error: error?.message,
        count: data?.length || 0
      })
    } catch (err) {
      setConnectionTest({
        success: false,
        error: err.message,
        count: 0
      })
    }
  }

  React.useEffect(() => {
    testConnection()
  }, [])

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
      <h3 className="font-bold text-sm mb-2">🚨 Emergency Status</h3>
      
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Usuario:</span>
          <span className={user ? "text-green-600" : "text-red-600"}>
            {user?.email || 'No autenticado'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Super Admin:</span>
          <span className={isSuper ? "text-green-600" : "text-red-600"}>
            {loading ? '...' : (isSuper ? 'Sí' : 'No')}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Conexión DB:</span>
          <span className={connectionTest?.success ? "text-green-600" : "text-red-600"}>
            {connectionTest ? (connectionTest.success ? 'OK' : 'FALLO') : '...'}
          </span>
        </div>
        
        {connectionTest?.error && (
          <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
            {connectionTest.error}
          </div>
        )}
      </div>
      
      <button
        onClick={testConnection}
        className="mt-2 w-full px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
      >
        🔄 Test
      </button>
    </div>
  )
}
