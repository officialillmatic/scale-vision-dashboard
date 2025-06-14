import React, { useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SuperAdminCreditPanel } from '@/components/admin/SuperAdminCreditPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function SuperAdminCreditPage() {
  const { user } = useAuth();
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = useSuperAdmin();
  const navigate = useNavigate();

  // 🔓 ACCESO LIBRE - Sin verificaciones de permisos
  // Cualquier usuario logueado puede acceder a esta página
  
  console.log('📊 [SuperAdminCreditPage] User accessing credits:', user?.email);
  console.log('📊 [SuperAdminCreditPage] Is super admin:', isSuperAdmin);

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        
        {/* Header con indicadores de acceso */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Credits Management 💳
            </h1>
            
            {/* Mostrar badge de super admin si aplica */}
            {isSuperAdmin && (
              <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
                <Crown className="h-3 w-3" />
                SUPER ADMIN
              </Badge>
            )}
            
            {/* Badge indicando acceso libre */}
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              🔓 Open Access
            </Badge>
          </div>
          
          <p className="text-gray-600 mt-1">
            View and manage credit balances and transactions
          </p>
          
          {/* Aviso informativo sobre permisos */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Access Mode:</strong> All authenticated users can view credit data. 
              {isSuperAdmin ? ' You have full admin privileges.' : ' Modification actions are restricted to super administrators.'}
            </AlertDescription>
          </Alert>
        </div>

        {/* Componente principal */}
        <SuperAdminCreditPanel />
      </div>
    </DashboardLayout>
  );
}
