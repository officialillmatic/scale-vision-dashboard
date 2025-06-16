// src/hooks/useAutoPollingBalance.ts
// Hook que detecta cambios automáticamente usando polling inteligente

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BalanceStats {
  user_id: string;
  current_balance: number;
  warning_threshold: number;
  critical_threshold: number;
  is_blocked: boolean;
  updated_at: string;
  recent_transactions_24h: number;
  total_spent_today: number;
  balance_status: 'empty' | 'critical' | 'warning' | 'healthy';
  last_check: string;
}

interface CallTransaction {
  transaction_id: string;
  amount: number;
  description: string;
  call_id_ref: string;
  created_at: string;
  transaction_type: string;
  balance_after: number;
}

interface BalanceChange {
  oldBalance: number;
  newBalance: number;
  difference: number;
  timestamp: string;
  isDeduction: boolean;
}

export function useAutoPollingBalance() {
  const { user } = useAuth();
  const [balanceStats, setBalanceStats] = useState<BalanceStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<CallTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastBalanceChange, setLastBalanceChange] = useState<BalanceChange | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Referencias para evitar memory leaks
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const lastKnownBalance = useRef<number | null>(null);
  const mounted = useRef(true);

  // Función para obtener estadísticas del balance
  const fetchBalanceStats = useCallback(async (): Promise<BalanceStats | null> => {
    if (!user?.id) return null;

    try {
      const { data, error: fetchError } = await supabase.rpc('get_user_balance_stats', {
        p_user_id: user.id
      });

      if (fetchError) {
        console.error('❌ Error fetching balance stats:', fetchError);
        throw fetchError;
      }

      return data as BalanceStats;
    } catch (err: any) {
      console.error('💥 Exception fetching balance stats:', err);
      throw err;
    }
  }, [user?.id]);

  // Función para obtener transacciones recientes
  const fetchRecentTransactions = useCallback(async (): Promise<CallTransaction[]> => {
    if (!user?.id) return [];

    try {
      const { data, error: fetchError } = await supabase.rpc('get_recent_call_transactions', {
        p_user_id: user.id,
        p_limit: 10
      });

      if (fetchError) {
        console.error('❌ Error fetching transactions:', fetchError);
        return [];
      }

      return (data || []).map((item: any) => ({
        transaction_id: item.transaction_id,
        amount: item.amount,
        description: item.description,
        call_id_ref: item.call_id_ref,
        created_at: item.created_at,
        transaction_type: item.transaction_type,
        balance_after: item.balance_after
      }));
    } catch (err) {
      console.error('💥 Exception fetching transactions:', err);
      return [];
    }
  }, [user?.id]);

  // Función principal para actualizar datos
  const updateData = useCallback(async (silent = false) => {
    if (!user?.id || !mounted.current) return;

    try {
      if (!silent) setError(null);

      // Obtener estadísticas del balance
      const newBalanceStats = await fetchBalanceStats();
      
      if (!newBalanceStats || !mounted.current) return;

      // Detectar cambios en el balance
      if (lastKnownBalance.current !== null && 
          lastKnownBalance.current !== newBalanceStats.current_balance) {
        
        const difference = lastKnownBalance.current - newBalanceStats.current_balance;
        const isDeduction = difference > 0;

        const balanceChange: BalanceChange = {
          oldBalance: lastKnownBalance.current,
          newBalance: newBalanceStats.current_balance,
          difference: Math.abs(difference),
          timestamp: new Date().toISOString(),
          isDeduction
        };

        setLastBalanceChange(balanceChange);

        // Log del cambio
        if (isDeduction) {
          console.log(`💸 Balance decreased by $${difference.toFixed(2)} - Call charge detected!`);
        } else {
          console.log(`💰 Balance increased by $${Math.abs(difference).toFixed(2)} - Credit added!`);
        }

        // Disparar evento personalizado para notificaciones
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('balance-changed', {
            detail: balanceChange
          }));
        }
      }

      // Actualizar referencias
      lastKnownBalance.current = newBalanceStats.current_balance;
      setBalanceStats(newBalanceStats);

      // Obtener transacciones recientes
      const transactions = await fetchRecentTransactions();
      if (mounted.current) {
        setRecentTransactions(transactions);
      }

    } catch (err: any) {
      if (mounted.current && !silent) {
        setError(`Error updating data: ${err.message}`);
      }
    } finally {
      if (mounted.current && !silent) {
        setLoading(false);
      }
    }
  }, [user?.id, fetchBalanceStats, fetchRecentTransactions]);

  // Función para iniciar polling
  const startPolling = useCallback(() => {
    if (pollingInterval.current || !user?.id) return;

    setIsPolling(true);
    console.log('🔄 Starting auto-polling for balance changes...');

    // Polling cada 5 segundos para detectar cambios rápidamente
    pollingInterval.current = setInterval(() => {
      updateData(true); // Silent update para no mostrar loading
    }, 5000);

  }, [user?.id, updateData]);

  // Función para detener polling
  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
      setIsPolling(false);
      console.log('⏹️ Stopped auto-polling');
    }
  }, []);

  // Función manual de refresh
  const refreshBalance = useCallback(() => {
    setLoading(true);
    updateData(false);
  }, [updateData]);

  // Función para verificar si puede hacer una llamada
  const canMakeCall = useCallback(async (estimatedCost: number = 0.02): Promise<{
    canCall: boolean;
    balance: number;
    message: string;
  }> => {
    if (!user?.id) {
      return {
        canCall: false,
        balance: 0,
        message: 'User not authenticated'
      };
    }

    try {
      const { data, error } = await supabase.rpc('check_user_balance_for_call', {
        p_user_id: user.id,
        p_estimated_cost: estimatedCost
      });

      if (error) {
        return {
          canCall: false,
          balance: balanceStats?.current_balance || 0,
          message: 'Error checking balance'
        };
      }

      return {
        canCall: data.can_make_call,
        balance: data.current_balance,
        message: data.balance_status === 'sufficient' 
          ? 'Balance sufficient for call'
          : data.balance_status === 'insufficient'
          ? 'Insufficient balance for call'
          : 'No balance available'
      };
    } catch (err) {
      return {
        canCall: false,
        balance: balanceStats?.current_balance || 0,
        message: 'Error checking balance'
      };
    }
  }, [user?.id, balanceStats?.current_balance]);

  // Función para simular una llamada (para pruebas)
  const simulateCall = useCallback(async (agentId: string, cost: number = 0.50) => {
    try {
      const { data, error } = await supabase.rpc('simulate_call_for_testing', {
        p_agent_id: agentId,
        p_cost: cost
      });

      if (error) {
        console.error('Error simulating call:', error);
        return { success: false, message: error.message };
      }

      console.log('✅ Call simulated successfully:', data);
      
      // Actualizar datos inmediatamente después de simular
      setTimeout(() => updateData(true), 1000);
      
      return data;
    } catch (err: any) {
      console.error('Exception simulating call:', err);
      return { success: false, message: err.message };
    }
  }, [updateData]);

  // Effect principal para inicializar y manejar el ciclo de vida
  useEffect(() => {
    mounted.current = true;

    if (user?.id) {
      // Carga inicial
      updateData(false);
      
      // Iniciar polling automático
      startPolling();
    }

    // Cleanup
    return () => {
      mounted.current = false;
      stopPolling();
    };
  }, [user?.id, updateData, startPolling, stopPolling]);

  // Effect para limpiar el indicador de último cambio después de 10 segundos
  useEffect(() => {
    if (lastBalanceChange) {
      const timer = setTimeout(() => {
        setLastBalanceChange(null);
      }, 10000); // 10 segundos

      return () => clearTimeout(timer);
    }
  }, [lastBalanceChange]);

  return {
    // Estados principales
    balanceStats,
    recentTransactions,
    loading,
    error,
    lastBalanceChange,
    isPolling,

    // Funciones
    refreshBalance,
    canMakeCall,
    simulateCall,
    startPolling,
    stopPolling,

    // Getters computed
    currentBalance: balanceStats?.current_balance || 0,
    balanceStatus: balanceStats?.balance_status || 'empty',
    totalSpentToday: balanceStats?.total_spent_today || 0,
    recentTransactionsCount: balanceStats?.recent_transactions_24h || 0
  };
}
