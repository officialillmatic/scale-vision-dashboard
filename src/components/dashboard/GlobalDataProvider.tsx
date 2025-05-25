
import React, { createContext, useContext } from 'react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useSuperAdminData } from '@/hooks/useSuperAdminData';
import { useGlobalAgents } from '@/hooks/useGlobalAgents';
import { useGlobalCalls } from '@/hooks/useGlobalCalls';

interface GlobalDataContextType {
  isSuperAdmin: boolean;
  superAdminData: ReturnType<typeof useSuperAdminData>;
  globalAgents: ReturnType<typeof useGlobalAgents>;
  globalCalls: ReturnType<typeof useGlobalCalls>;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSuperAdmin } = useSuperAdmin();
  const superAdminData = useSuperAdminData();
  const globalAgents = useGlobalAgents();
  const globalCalls = useGlobalCalls();

  const value = {
    isSuperAdmin,
    superAdminData,
    globalAgents,
    globalCalls
  };

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (context === undefined) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
};
