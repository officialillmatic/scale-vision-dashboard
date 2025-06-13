
import React, { useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SuperAdminCreditPanel } from '@/components/admin/SuperAdminCreditPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function SuperAdminCreditPage() {
  const { user } = useAuth();
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = useSuperAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    // No hacer nada mientras está cargando
    if (isSuperAdminLoading) return;
    
    console.log('🔍 [SuperAdminCreditPage] Checking access permissions...');
    console.log('🔍 [SuperAdminCreditPage] User email:', user?.email);
    console.log('🔍 [SuperAdminCreditPage] Is super admin:', isSuperAdmin);
    
    // 🚨 SOLUCIÓN: Misma verificación que en TeamPage y Dashboard
    const hasAccess = isSuperAdmin || 
                     user?.email === 'aiagentsdevelopers@gmail.com' || 
                     user?.email === 'produpublicol@gmail.com';
    
    if (!hasAccess) {
      console.log('❌ [SuperAdminCreditPage] Access denied, redirecting to dashboard');
      toast.error("Access denied - Super admin required");
      navigate('/dashboard');
      return;
    } else {
      console.log('✅ [SuperAdminCreditPage] Access granted');
    }
  }, [user, isSuperAdmin, isSuperAdminLoading, navigate]);

  // Mostrar loading mientras verifica permisos
  if (isSuperAdminLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading permissions...</div>
        </div>
      </DashboardLayout>
    );
  }

  // Verificación de acceso
  const hasAccess = isSuperAdmin || 
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
        <SuperAdminCreditPanel />
      </div>
    </DashboardLayout>
  );
}
