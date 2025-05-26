
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SecurityAlert {
  id: string;
  type: 'suspicious_activity' | 'rate_limit' | 'unauthorized_access' | 'rls_violation';
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const useSecurityMonitor = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { user } = useAuth();

  const startMonitoring = () => {
    if (!user || isMonitoring) return;

    setIsMonitoring(true);
    
    // Monitor for webhook errors and security issues
    const channel = supabase
      .channel('security-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webhook_errors'
        },
        (payload) => {
          const error = payload.new;
          if (error.error_type === 'unauthorized' || error.error_type === 'rate_limit') {
            const alert: SecurityAlert = {
              id: error.id,
              type: error.error_type === 'rate_limit' ? 'rate_limit' : 'unauthorized_access',
              message: `Security alert: ${error.error_details}`,
              timestamp: error.created_at,
              severity: 'high'
            };
            
            setAlerts(prev => [alert, ...prev.slice(0, 9)]);
            toast.error(`Security Alert: ${alert.message}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setIsMonitoring(false);
    };
  };

  const checkRateLimit = async (action: string) => {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_user_id: user?.id,
        p_action: action,
        p_limit_per_hour: 100
      });

      if (error) {
        console.error('Rate limit check failed:', error);
        return true; // Allow on error to prevent blocking
      }

      return data;
    } catch (error) {
      console.error('Rate limit check error:', error);
      return true;
    }
  };

  const logSecurityEvent = async (eventType: string, details: string) => {
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          event_type: `security_${eventType}`,
          status: 'logged',
          user_id: user?.id,
          processing_time_ms: 0
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const validateSystemSecurity = async () => {
    const securityChecks = [];
    
    try {
      // Check if RLS is enabled on critical tables
      const criticalTables = ['calls', 'companies', 'user_balances', 'transactions'];
      for (const table of criticalTables) {
        const { error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
          
        if (error && error.message.includes('row-level security')) {
          securityChecks.push(`RLS properly enforced on ${table}`);
        }
      }
      
      return securityChecks;
    } catch (error) {
      console.error('Security validation error:', error);
      return [];
    }
  };

  useEffect(() => {
    const cleanup = startMonitoring();
    return cleanup;
  }, [user]);

  return {
    alerts,
    isMonitoring,
    checkRateLimit,
    logSecurityEvent,
    validateSystemSecurity,
    clearAlerts: () => setAlerts([])
  };
};
