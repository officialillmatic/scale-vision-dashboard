
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useRole() {
  const { user, company } = useAuth();
  const [isCompanyOwner, setIsCompanyOwner] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!user || !company) {
        setIsCompanyOwner(false);
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
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
    if (isCompanyOwner) return true;
    if (requiredRole === 'admin') return userRole === 'admin';
    return true; // All authenticated users can access basic features
  };

  return {
    isCompanyOwner,
    userRole,
    loading,
    checkRole,
  };
}
