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

  // Validate access permissions
  useEffect(() => {
    if (isSuperAdminLoading) return;

    const hasAccess =
      isSuperAdmin ||
      user?.email === 'aiagentsdevelopers@gmail.com' ||
      user?.email === 'produpublicol@gmail.com';

    if (!hasAccess) {
      toast.error('Access denied - Super admin required');
      navigate('/dashboard');
    }
  }, [user, isSuperAdmin, isSuperAdminLoading, navigate]);

  if (isSuperAdminLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading permissions...</div>
        </div>
      </DashboardLayout>
    );
  }

  const hasAccess =
    isSuperAdmin ||
    user?.email === 'aiagentsdevelopers@gmail.com' ||
    user?.email === 'produpublicol@gmail.com';

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied - Super administrator privileges required.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        
        {/* 🟢 HEADER CON AVISOS TEMPORALES */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Admin Credits 💳
            </h1>
            
            {/* 🟢 MOSTRAR BADGE DE SUPER ADMIN SI APLICA */}
            {(isSuperAdmin || user?.email === 'aiagentsdevelopers@gmail.com' || user?.email === 'produpublicol@gmail.com') && (
              <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
                <Crown className="h-3 w-3" />
                SUPER ADMIN
              </Badge>
            )}
            
          </div>
          
          </div>

        {/* 🟢 COMPONENTE PRINCIPAL - ACCESIBLE PARA TODOS */}
        <SuperAdminCreditPanel />
      </div>
    </DashboardLayout>
  );
}
