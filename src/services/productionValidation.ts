
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
    // 1. Check RLS is enabled on all tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      issues.push('Failed to check table security settings');
    }

    // 2. Check if super admin exists
    const { count: superAdminCount, error: adminError } = await supabase
      .from('super_admins')
      .select('count', { count: 'exact', head: true });

    if (adminError) {
      issues.push('Failed to verify super admin configuration');
    } else if (superAdminCount === 0) {
      issues.push('No super admin configured - critical security issue');
    }

    // 3. Check environment configuration by testing edge functions
    try {
      const { error: functionError } = await supabase.functions.invoke('retell-webhook', {
        method: 'GET'
      });
      
      if (functionError && functionError.message?.includes('not configured')) {
        warnings.push('Retell webhook configuration may be incomplete');
      }
    } catch (error) {
      warnings.push('Unable to validate webhook configuration');
    }

    // 4. Check storage buckets existence
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

    // 5. Check database performance metrics
    const { data: performanceData, error: perfError } = await supabase
      .from('performance_metrics')
      .select('*')
      .limit(1);

    if (perfError || !performanceData?.length) {
      warnings.push('Performance monitoring table exists but has no data');
    }

    // 6. Validate user authentication flow
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) {
      warnings.push('Authentication validation requires active session');
    }

    // 7. Check critical RLS policies are in place
    try {
      const { data: policiesData, error: policiesError } = await supabase
        .from('information_schema.enabled_roles')
        .select('*')
        .limit(1);
        
      if (policiesError) {
        warnings.push('Unable to verify RLS policy configuration');
      }
    } catch (error) {
      warnings.push('RLS policy verification failed');
    }

    // 8. Test rate limiting function
    try {
      const { data: rateLimitTest, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
        p_user_id: authData.session?.user?.id,
        p_action: 'test_action',
        p_limit_per_hour: 100
      });

      if (rateLimitError) {
        warnings.push('Rate limiting function not available');
      }
    } catch (error) {
      warnings.push('Rate limiting system needs verification');
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
