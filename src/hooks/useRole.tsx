import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useRole() {
  const { user, company } = useAuth();
  const [isCompanyOwner, setIsCompanyOwner] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setIsCompanyOwner(false);
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        // ✅ DETECTAR SUPER ADMIN POR EMAIL (reemplaza con tu email)
        const SUPER_ADMIN_EMAILS = [
  'aiagentsdevelopers@gmail.com',  // ← TU EMAIL REAL
];

        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email || '');
        
        if (isSuperAdmin) {
          console.log('🔥 Super admin detected by email:', user.email);
          setIsCompanyOwner(true);  // Tratarlo como owner para permisos
          setUserRole('super_admin');
          setLoading(false);
          return;
        }

        // Lógica normal para usuarios con company
        if (!company) {
          setIsCompanyOwner(false);
          setUserRole('user');
          setLoading(false);
          return;
        }

        // Check if user is company owner
        const isOwner = company.owner_id === user.id;
        setIsCompanyOwner(isOwner);

        if (isOwner) {
          setUserRole('admin');
        } else {
          // Check company membership role
          const { data: membership } = await supabase
            .from('company_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('company_id', company.id)
            .eq('status', 'active')
            .single();

          setUserRole(membership?.role || 'user');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole('user');
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [user, company]);

  const checkRole = (requiredRole: string) => {
    // Super admin tiene acceso a todo
    if (userRole === 'super_admin') return true;
    if (isCompanyOwner) return true;
    if (requiredRole === 'admin') return userRole === 'admin';
    return true;
  };

  // ✅ OBJETO PARA COMPATIBILIDAD CON DASHBOARDSIDEBAR
  const can = {
    superAdminAccess: userRole === 'super_admin' || isCompanyOwner || userRole === 'admin',
    adminAccess: userRole === 'super_admin' || isCompanyOwner || userRole === 'admin',
    userAccess: true
  };

  // 🔍 DEBUG
  console.log('🎯 useRole state:', {
    userEmail: user?.email,
    userRole,
    isCompanyOwner,
    superAdminAccess: can.superAdminAccess,
    company: company?.id
  });

  return {
    isCompanyOwner,
    userRole,
    loading,
    checkRole,
    can,
  };
}