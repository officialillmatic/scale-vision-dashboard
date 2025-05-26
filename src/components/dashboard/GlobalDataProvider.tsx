import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuth } from '@/contexts/AuthContextFixed';

interface GlobalDataContextType {
  isSuperAdmin: boolean;
  superAdminData: {
    globalMetrics: any;
    companyMetrics: any[];
    isLoading: boolean;
    error: any;
  };
  globalAgents: {
    agents: any[];
    isLoading: boolean;
    error: any;
  };
  globalCalls: {
    calls: any[];
    isLoading: boolean;
    error: any;
  };
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
};

interface GlobalDataProviderProps {
  children: ReactNode;
}

export const GlobalDataProvider: React.FC<GlobalDataProviderProps> = ({ children }) => {
  const { isSuperAdmin } = useSuperAdmin();
  const { user } = useAuth();

  // Fetch global metrics for super admins
  const { data: globalMetrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['super-admin-metrics'],
    queryFn: async () => {
      if (!isSuperAdmin) return null;
      
      const { data, error } = await supabase.rpc('get_super_admin_call_metrics');
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: isSuperAdmin && !!user,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Fetch company metrics for super admins
  const { data: companyMetrics, isLoading: companyLoading } = useQuery({
    queryKey: ['super-admin-companies'],
    queryFn: async () => {
      if (!isSuperAdmin) return [];
      
      const { data, error } = await supabase.rpc('get_super_admin_company_metrics');
      if (error) throw error;
      return data || [];
    },
    enabled: isSuperAdmin && !!user,
    staleTime: 1000 * 60 * 5
  });

  // Fetch global agents for super admins
  const { data: agents, isLoading: agentsLoading, error: agentsError } = useQuery({
    queryKey: ['global-agents'],
    queryFn: async () => {
      if (!isSuperAdmin) return [];
      
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
    enabled: isSuperAdmin && !!user,
    staleTime: 1000 * 60 * 5
  });

  // Fetch global calls for super admins
  const { data: calls, isLoading: callsLoading, error: callsError } = useQuery({
    queryKey: ['global-calls'],
    queryFn: async () => {
      if (!isSuperAdmin) return [];
      
      const { data, error } = await supabase
        .from('calls')
        .select(`
          *,
          agent:agent_id (id, name)
        `)
        .order('timestamp', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      return data || [];
    },
    enabled: isSuperAdmin && !!user,
    staleTime: 1000 * 60 * 2
  });

  const value: GlobalDataContextType = {
    isSuperAdmin,
    superAdminData: {
      globalMetrics,
      companyMetrics: companyMetrics || [],
      isLoading: metricsLoading || companyLoading,
      error: metricsError
    },
    globalAgents: {
      agents: agents || [],
      isLoading: agentsLoading,
      error: agentsError
    },
    globalCalls: {
      calls: calls || [],
      isLoading: callsLoading,
      error: callsError
    }
  };

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
};
