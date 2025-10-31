
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ValidationResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
}

export const validateProductionReadiness = async (): Promise<ValidationResult> => {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  try {
    // 1. Check if super admin exists
    const { count: superAdminCount, error: adminError } = await supabase
      .from('super_admins')
      .select('count', { count: 'exact', head: true });

    if (adminError) {
      issues.push('Failed to verify super admin configuration');
    } else if (superAdminCount === 0) {
      issues.push('No super admin configured - critical security issue');
    }

    // 2. Check storage buckets existence
    const requiredBuckets = ['avatars', 'company-logos', 'recordings'];
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      warnings.push('Unable to verify storage bucket configuration');
    } else {
      const existingBuckets = buckets.map(b => b.id);
      const missingBuckets = requiredBuckets.filter(b => !existingBuckets.includes(b));
      
      if (missingBuckets.length > 0) {
        warnings.push(`Missing storage buckets: ${missingBuckets.join(', ')}`);
      }
    }

    // 3. Check database performance metrics
    const { data: performanceData, error: perfError } = await supabase
      .from('performance_metrics')
      .select('*')
      .limit(1);

    if (perfError && !perfError.message?.includes('permission denied')) {
      warnings.push('Performance monitoring table access issues');
    }

    // 4. Validate user authentication flow
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) {
      warnings.push('Authentication validation requires active session');
    }

    // 5. Test rate limiting function
    try {
      const { data: rateLimitTest, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
        p_user_id: authData.session?.user?.id || '00000000-0000-0000-0000-000000000000',
        p_action: 'test_action',
        p_limit_per_hour: 100
      });

      if (rateLimitError) {
        warnings.push('Rate limiting function not available');
      }
    } catch (error) {
      warnings.push('Rate limiting system needs verification');
    }

    // 6. Check if critical tables exist and are accessible
    const criticalTables = ['companies', 'calls', 'user_agents', 'agents'];
    for (const table of criticalTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (error && !error.message?.includes('permission denied')) {
          warnings.push(`Table ${table} has access issues: ${error.message}`);
        }
      } catch (error) {
        warnings.push(`Unable to verify table ${table}`);
      }
    }

    // 7. Verify webhook health
    try {
      const { data: webhookHealth, error: webhookError } = await supabase.functions.invoke('webhook-monitor', {
        method: 'GET'
      });
      
      if (webhookError) {
        warnings.push('Webhook monitoring system needs attention');
      }
    } catch (error) {
      warnings.push('Webhook system verification failed');
    }

    const passed = issues.length === 0;
    
    return {
      passed,
      issues,
      warnings
    };

  } catch (error) {
    console.error('Production validation error:', error);
    return {
      passed: false,
      issues: ['Failed to complete production readiness validation'],
      warnings: []
    };
  }
};

export const runProductionChecklist = async () => {
  const result = await validateProductionReadiness();
  
  if (result.passed) {
    toast.success('Production readiness validation passed!');
    
    if (result.warnings.length > 0) {
      console.group('⚠️ Production Warnings');
      result.warnings.forEach(warning => console.warn(warning));
      console.groupEnd();
    }
  } else {
    toast.error('Production readiness validation failed');
    
    console.group('❌ Critical Issues');
    result.issues.forEach(issue => console.error(issue));
    console.groupEnd();
    
    if (result.warnings.length > 0) {
      console.group('⚠️ Warnings');
      result.warnings.forEach(warning => console.warn(warning));
      console.groupEnd();
    }
  }
  
  return result;
};
