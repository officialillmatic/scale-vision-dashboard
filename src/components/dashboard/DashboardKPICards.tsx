import { debugLog } from "@/lib/debug";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useRole } from '@/hooks/useRole';
import { DashboardMetrics } from './DashboardMetrics';
import { UserDashboardKPIs } from './UserDashboardKPIs';

export function DashboardKPICards() {
  const { user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const { isCompanyOwner, can } = useRole();

  debugLog('🔍 [DashboardKPICards] Current user role check:', {
    userId: user?.id,
    isSuperAdmin,
    isCompanyOwner,
    canManageTeam: can.manageTeam
  });

  // Super admins and company owners get the full business metrics
  if (isSuperAdmin || isCompanyOwner || can.manageTeam) {
    return <DashboardMetrics />;
  }

  // Regular users get user-specific KPIs
  return <UserDashboardKPIs />;
}
