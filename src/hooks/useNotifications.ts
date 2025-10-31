import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LowBalanceUser {
  user_id: string;
  user_email: string;
  user_name: string;
  current_balance: number;
  alert_level: 'zero' | 'almost_zero' | 'critical' | 'warning' | 'normal';
  hours_since_last_notification: number;
}

export interface NotificationConfig {
  id?: string;
  notification_email: string;
  warning_threshold: number;
  critical_threshold: number;
  zero_balance_threshold: number;
  email_enabled: boolean;
  dashboard_alerts_enabled: boolean;
  notification_frequency_hours: number;
}

export interface NotificationStats {
  totalAlerted: number;
  zeroBalance: number;
  criticalBalance: number;
  warningBalance: number;
  lastCheck: Date | null;
}

export const useNotifications = () => {
  const [lowBalanceUsers, setLowBalanceUsers] = useState<LowBalanceUser[]>([]);
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 🔄 Función para verificar usuarios con balance bajo
  const checkLowBalanceUsers = useCallback(async (showToast = false) => {
    try {
      console.log('🔍 [useNotifications] Checking low balance users...');
      
      const { data, error } = await supabase
        .rpc('get_users_needing_notification');

      if (error) {
        throw error;
      }

      const users = data || [];
      setLowBalanceUsers(users);
      setLastCheck(new Date());

      console.log(`📊 [useNotifications] Found ${users.length} users with low balance`);

      if (showToast && users.length > 0) {
        toast.warning(`⚠️ ${users.length} usuarios con balance bajo detectados`);
      }

      return users;

    } catch (error: any) {
      console.error('❌ [useNotifications] Error checking low balance:', error);
      if (showToast) {
        toast.error(`Error verificando balances: ${error.message}`);
      }
      return [];
    }
  }, []);

  // 📧 Función para cargar configuración
  const loadConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_notifications_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setConfig(data);
      return data;

    } catch (error: any) {
      console.error('❌ [useNotifications] Error loading config:', error);
      return null;
    }
  }, []);

  // 🚨 Función para enviar notificaciones
  const sendNotifications = useCallback(async () => {
    try {
      console.log('📧 [useNotifications] Sending notifications...');
      
      const { data, error } = await supabase
        .rpc('send_low_balance_notifications');

      if (error) {
        throw error;
      }

      const result = data;
      
      if (result.success && result.sent_count > 0) {
        toast.success(`✅ ${result.sent_count} notificaciones enviadas a ${result.notification_email}`);
        
        // Refrescar datos después de enviar notificaciones
        await checkLowBalanceUsers();
      } else {
        toast.info('ℹ️ No hay notificaciones pendientes de enviar');
      }

      return result;

    } catch (error: any) {
      console.error('❌ [useNotifications] Error sending notifications:', error);
      toast.error(`Error enviando notificaciones: ${error.message}`);
      return { success: false, error: error.message };
    }
  }, [checkLowBalanceUsers]);

  // 💾 Función para guardar configuración
  const saveConfig = useCallback(async (newConfig: Partial<NotificationConfig>) => {
    try {
      console.log('💾 [useNotifications] Saving config...');
      
      const { data, error } = await supabase
        .from('admin_notifications_config')
        .upsert({
          ...config,
          ...newConfig,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setConfig(data);
      toast.success('✅ Configuración guardada');
      return data;

    } catch (error: any) {
      console.error('❌ [useNotifications] Error saving config:', error);
      toast.error(`Error guardando configuración: ${error.message}`);
      throw error;
    }
  }, [config]);

  // 📊 Calcular estadísticas
  const getStats = useCallback((): NotificationStats => {
    return {
      totalAlerted: lowBalanceUsers.length,
      zeroBalance: lowBalanceUsers.filter(u => u.alert_level === 'zero' || u.alert_level === 'almost_zero').length,
      criticalBalance: lowBalanceUsers.filter(u => u.alert_level === 'critical').length,
      warningBalance: lowBalanceUsers.filter(u => u.alert_level === 'warning').length,
      lastCheck
    };
  }, [lowBalanceUsers, lastCheck]);

  // 🎨 Funciones de utilidad para UI
  const getAlertColor = useCallback((level: string) => {
    switch (level) {
      case 'zero': return 'destructive';
      case 'almost_zero': return 'destructive';
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  }, []);

  const getAlertLabel = useCallback((level: string) => {
    switch (level) {
      case 'zero': return 'BALANCE CERO';
      case 'almost_zero': return 'CASI CERO';
      case 'critical': return 'CRÍTICO';
      case 'warning': return 'ADVERTENCIA';
      default: return 'NORMAL';
    }
  }, []);

  const getAlertPriority = useCallback((level: string): number => {
    switch (level) {
      case 'zero': return 4;
      case 'almost_zero': return 3;
      case 'critical': return 2;
      case 'warning': return 1;
      default: return 0;
    }
  }, []);

  // 🔄 Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      checkLowBalanceUsers();
    }, 5 * 60 * 1000); // Cada 5 minutos

    return () => clearInterval(interval);
  }, [autoRefresh, checkLowBalanceUsers]);

  // 🚀 Inicialización
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadConfig(),
          checkLowBalanceUsers()
        ]);
      } catch (error) {
        console.error('❌ [useNotifications] Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [loadConfig, checkLowBalanceUsers]);

  // 🎧 Listener para cambios en tiempo real
  useEffect(() => {
    // Escuchar cambios en user_credits
    const subscription = supabase
      .channel('user_credits_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits'
        },
        (payload) => {
          console.log('🔄 [useNotifications] User credits changed:', payload);
          
          // Verificar si el cambio afecta a los umbrales
          if (payload.new && typeof payload.new === 'object') {
            const newBalance = (payload.new as any).current_balance;
            const warningThreshold = config?.warning_threshold || 10;
            
            if (newBalance <= warningThreshold) {
              // Refrescar usuarios con balance bajo después de un pequeño delay
              setTimeout(() => {
                checkLowBalanceUsers();
              }, 1000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [config?.warning_threshold, checkLowBalanceUsers]);

  return {
    // State
    lowBalanceUsers,
    config,
    loading,
    lastCheck,
    autoRefresh,
    
    // Actions
    checkLowBalanceUsers,
    loadConfig,
    sendNotifications,
    saveConfig,
    setAutoRefresh,
    
    // Computed
    stats: getStats(),
    
    // Utilities
    getAlertColor,
    getAlertLabel,
    getAlertPriority,
    
    // Sorted users by priority
    sortedUsers: lowBalanceUsers.sort((a, b) => 
      getAlertPriority(b.alert_level) - getAlertPriority(a.alert_level)
    )
  };
};
