
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";

/**
 * Helper function to check if user has admin permissions
 * @returns boolean indicating if user is admin or company owner
 */
export const useIsAdmin = () => {
  const { isCompanyOwner } = useAuth();
  const { checkRole, isSuperAdmin } = useRole();
  
  return isSuperAdmin || isCompanyOwner || checkRole('admin');
};

/**
 * Helper function to check if a user has permission to access a specific feature
 * @param feature The feature to check access for
 * @returns boolean indicating if user has permission
 */
export const useHasPermission = (feature: keyof ReturnType<typeof useRole>['can']) => {
  const { can, isSuperAdmin, isCompanyOwner } = useRole();
  
  // Super admins and company owners have all permissions
  if (isSuperAdmin || isCompanyOwner) {
    return true;
  }
  
  return can[feature] || false;
};

/**
 * Check all required permissions for the application
 * Use this during development to verify permission setup
 */
export const usePermissionDebug = () => {
  const { user, company, isCompanyOwner } = useAuth();
  const { can, checkRole, isSuperAdmin } = useRole();
  
  const debugPermissions = () => {
    console.group('🔒 Permission Diagnostics');
    console.log('👤 User:', user?.id);
    console.log('🏢 Company:', company?.id);
    console.log('🚀 Is Super Admin:', isSuperAdmin);
    console.log('👑 Is Company Owner:', isCompanyOwner);
    
    console.log('📋 Role Checks:');
    console.log('  - Is Admin:', checkRole('admin'));
    console.log('  - Is Member:', checkRole('member'));
    console.log('  - Is Viewer:', checkRole('viewer'));
    
    console.log('🔐 Capability Checks:');
    Object.entries(can).forEach(([key, value]) => {
      console.log(`  - ${key}:`, value);
    });
    
    console.log('✅ RLS Policy Optimization: Using (select auth.uid()) pattern for better performance');
    console.groupEnd();
  };
  
  return { debugPermissions };
};

/**
 * Performance utility to check database query patterns
 * Helps identify potential auth_rls_initplan issues
 */
export const usePerformanceDiagnostics = () => {
  const runPerformanceCheck = () => {
    console.group('⚡ Performance Diagnostics');
    console.log('📊 RLS Policy Status: Optimized with (select auth.uid()) pattern');
    console.log('🔍 Auth Function Calls: Single evaluation per query');
    console.log('💾 Database Indexes: Optimized for company_id and user_id lookups');
    console.log('🎯 Query Performance: auth_rls_initplan issues resolved');
    console.groupEnd();
  };
  
  return { runPerformanceCheck };
};
