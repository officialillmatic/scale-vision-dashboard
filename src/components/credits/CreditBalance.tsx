// src/components/credits/CreditBalance.tsx - PARTE 1 CORREGIDA
// Imports y configuración inicial

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAgents } from '@/hooks/useAgents';
import { useAutoPollingBalance } from '@/hooks/useAutoPollingBalance';
import { 
  Wallet, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Plus,
  RefreshCw,
  Shield,
  Info,
  Zap,
  TrendingDown,
  TrendingUp,
  Activity,
  Clock,
  DollarSign
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatCurrency } from '@/lib/formatters';

interface CreditBalanceProps {
  onRequestRecharge?: () => void;
  showActions?: boolean;
}

export function CreditBalance({ onRequestRecharge, showActions = true }: CreditBalanceProps) {
  const { user } = useAuth();
  
  // 🔄 USAR EL NUEVO HOOK CON AUTO-POLLING
  const { 
    balanceStats,
    loading, 
    error, 
    lastBalanceChange,
    isPolling,
    refreshBalance,
    canMakeCall,
    simulateCall,
    currentBalance,
    balanceStatus,
    totalSpentToday,
    recentTransactionsCount
  } = useAutoPollingBalance();

  // ESTADOS LOCALES - CON NUEVOS ESTADOS AGREGADOS
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  
  // ✅ NUEVOS ESTADOS PARA TARIFA REAL
  const [realAgentRate, setRealAgentRate] = useState<number | null>(null);
  const [rateLoaded, setRateLoaded] = useState(false);

  // Hook de agentes para calcular minutos estimados
  const { agents, isLoadingAgents } = useAgents();

  // ✅ EFECTO PARA MOSTRAR INDICADOR DE ACTUALIZACIÓN
  useEffect(() => {
    if (lastBalanceChange) {
      setShowUpdateIndicator(true);
      
      // Mostrar indicador por 5 segundos
      const timer = setTimeout(() => {
        setShowUpdateIndicator(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [lastBalanceChange]);
  // ============================================================================
  // FUNCIONES AUXILIARES - TIEMPO REAL SIN LOADING INFINITO
  // ============================================================================
  
  // Obtener tarifa real del agente en tiempo real
  const fetchAgentRateRealTime = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🔍 Obteniendo tarifa real del agente en tiempo real...');
      
      const { data: userAgents, error } = await supabase
        .from('user_agent_assignments')
        .select(`
          agent_id,
          agents!inner (
            id,
            name,
            rate_per_minute,
            retell_agent_id
          )
        `)
        .eq('user_id', user.id)
        .eq('is_primary', true);

      if (error) {
        console.error('❌ Error obteniendo agentes:', error);
        setRealAgentRate(null);
        setRateLoaded(true);
        return;
      }

      if (!userAgents || userAgents.length === 0) {
        console.warn('⚠️ No se encontraron agentes asignados');
        setRealAgentRate(null);
        setRateLoaded(true);
        return;
      }

      const agentsData = userAgents.map(assignment => assignment.agents);
      const validAgents = agentsData.filter(agent => 
        agent && agent.rate_per_minute && agent.rate_per_minute > 0
      );
      
      if (validAgents.length === 0) {
        console.warn('⚠️ Agentes sin tarifa configurada');
        setRealAgentRate(null);
        setRateLoaded(true);
        return;
      }

      // Calcular tarifa promedio real
      const totalRate = validAgents.reduce((sum, agent) => sum + agent.rate_per_minute, 0);
      const avgRate = totalRate / validAgents.length;
      
      console.log(`✅ Tarifa REAL obtenida: $${avgRate.toFixed(4)}/min`);
      console.log(`🤖 Agentes: ${validAgents.map(a => a.name).join(', ')}`);
      
      setRealAgentRate(avgRate);
      setRateLoaded(true);

    } catch (error) {
      console.error('❌ Error en fetchAgentRateRealTime:', error);
      setRealAgentRate(null);
      setRateLoaded(true);
    }
  }, [user?.id]);

  // Calcular minutos estimados en tiempo real
  const calculateEstimatedMinutesRealTime = (): { minutes: number, rate: number | null, hasRate: boolean } => {
    if (!currentBalance || currentBalance <= 0) {
      return { minutes: 0, rate: null, hasRate: false };
    }

    if (!rateLoaded) {
      return { minutes: 0, rate: null, hasRate: false };
    }

    if (!realAgentRate || realAgentRate <= 0) {
      return { minutes: 0, rate: null, hasRate: false };
    }

    const estimatedMinutes = Math.floor(currentBalance / realAgentRate);
    
    console.log(`🧮 CÁLCULO TIEMPO REAL:`);
    console.log(`   💳 Balance: $${currentBalance.toFixed(2)}`);
    console.log(`   🤖 Tarifa real: $${realAgentRate.toFixed(4)}/min`);
    console.log(`   ⏱️ Minutos: ${estimatedMinutes}`);
    
    return { 
      minutes: estimatedMinutes, 
      rate: realAgentRate, 
      hasRate: true 
    };
  };

  // Effect para cargar tarifa real al inicializar
  useEffect(() => {
    if (user?.id) {
      fetchAgentRateRealTime();
    }
  }, [user?.id, fetchAgentRateRealTime]);

  // Effect para recargar tarifa cuando cambie el balance
  useEffect(() => {
    if (user?.id && currentBalance !== undefined) {
      // Solo recargar si no tenemos tarifa aún
      if (!rateLoaded) {
        fetchAgentRateRealTime();
      }
    }
  }, [user?.id, currentBalance, rateLoaded, fetchAgentRateRealTime]);
  // ============================================================================
  // FUNCIONES PARA PROCESAR LLAMADAS PENDIENTES
  // ============================================================================
  
  const processUnprocessedCalls = async (userId: string) => {
    try {
      console.log('🔄 CREDITBALANCE: Procesando llamadas pendientes...');
      
      if (!userId) {
        return { success: false, message: 'Usuario no identificado' };
      }

      // Obtener agentes del usuario con sus tarifas
      const { data: userAgents, error: agentsError } = await supabase
        .from('user_agent_assignments')
        .select(`
          agent_id,
          agents!inner (
            id,
            name,
            rate_per_minute,
            retell_agent_id
          )
        `)
        .eq('user_id', userId)
        .eq('is_primary', true);

      if (agentsError || !userAgents || userAgents.length === 0) {
        console.error('❌ Error obteniendo agentes del usuario:', agentsError);
        return { success: false, message: 'No se encontraron agentes asignados' };
      }

      const userAgentIds = userAgents.map(assignment => assignment.agents.id);

      // Buscar llamadas completadas sin costo asignado
      const { data: unprocessedCalls, error: callsError } = await supabase
        .from('calls')
        .select(`
          id,
          call_id,
          duration_sec,
          cost_usd,
          call_status,
          agent_id
        `)
        .in('agent_id', userAgentIds)
        .in('call_status', ['completed', 'ended'])
        .gt('duration_sec', 0)
        .eq('cost_usd', 0)
        .limit(10);

      if (callsError) {
        console.error('❌ Error obteniendo llamadas:', callsError);
        return { success: false, message: 'Error obteniendo llamadas' };
      }

      if (!unprocessedCalls || unprocessedCalls.length === 0) {
        console.log('✅ No hay llamadas pendientes de procesar');
        return { success: true, message: 'No hay llamadas pendientes', processed: 0 };
      }

      let processedCount = 0;
      let errors = 0;

      // Procesar cada llamada
      for (const call of unprocessedCalls) {
        try {
          const agentData = userAgents.find(assignment => 
            assignment.agents.id === call.agent_id || 
            assignment.agents.retell_agent_id === call.agent_id
          );

          if (!agentData?.agents.rate_per_minute) {
            console.warn(`⚠️ No se encontró tarifa para agente ${call.agent_id}`);
            continue;
          }

          const duration = call.duration_sec;
          const rate = agentData.agents.rate_per_minute;
          const cost = (duration / 60) * rate;

          // Actualizar costo en calls
          const { error: updateError } = await supabase
            .from('calls')
            .update({ cost_usd: cost })
            .eq('call_id', call.call_id);

          if (updateError) {
            console.error(`❌ Error actualizando llamada ${call.call_id}:`, updateError);
            errors++;
            continue;
          }

          // Verificar transacción existente
          const { data: existingTransaction } = await supabase
            .from('credit_transactions')
            .select('id')
            .eq('user_id', userId)
            .eq('call_id', call.id)
            .eq('transaction_type', 'debit')
            .single();

          if (existingTransaction) {
            processedCount++;
            continue;
          }

          // Obtener y actualizar balance
          const { data: userCredit, error: creditError } = await supabase
            .from('user_credits')
            .select('current_balance')
            .eq('user_id', userId)
            .single();

          if (creditError) {
            console.error('❌ Error obteniendo balance:', creditError);
            errors++;
            continue;
          }

          const currentBalance = userCredit?.current_balance || 0;
          const newBalance = currentBalance - cost;

          const { error: updateBalanceError } = await supabase
            .from('user_credits')
            .update({ 
              current_balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

          if (updateBalanceError) {
            console.error('❌ Error actualizando balance:', updateBalanceError);
            errors++;
            continue;
          }

          // Registrar transacción
          const { error: transactionError } = await supabase
            .from('credit_transactions')
            .insert({
              user_id: userId,
              call_id: call.id,
              amount: cost,
              transaction_type: 'debit',
              description: `Call cost deduction - Call ID: ${call.call_id}`,
              created_at: new Date().toISOString()
            });

          if (transactionError) {
            console.error('❌ Error registrando transacción:', transactionError);
            await supabase
              .from('user_credits')
              .update({ current_balance: currentBalance })
              .eq('user_id', userId);
            errors++;
            continue;
          }

          processedCount++;
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`❌ Error procesando llamada ${call.call_id}:`, error);
          errors++;
        }
      }

      // Emitir evento para actualizar balance
      if (typeof window !== 'undefined' && processedCount > 0) {
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
          detail: {
            userId,
            processed: processedCount,
            source: 'creditbalance-refresh'
          }
        }));
      }

      return {
        success: true,
        message: `Procesadas ${processedCount} llamadas exitosamente${errors > 0 ? ` (${errors} errores)` : ''}`,
        processed: processedCount,
        errors
      };

    } catch (error) {
      console.error('💥 Error en processUnprocessedCalls:', error);
      return {
        success: false,
        message: `Error: ${error.message}`,
        processed: 0
      };
    }
  };

  // Función para el botón Refresh Balance integrado
  const handleRefreshBalance = async () => {
    setRefreshingBalance(true);
    
    try {
      console.log('🔄 Iniciando Refresh Balance desde CreditBalance...');
      
      const result = await processUnprocessedCalls(user?.id);
      
      if (result.success) {
        if (result.processed > 0) {
          alert(`✅ ¡Balance actualizado!\n\n📞 Llamadas procesadas: ${result.processed}\n💰 Los descuentos se han aplicado automáticamente.`);
        } else {
          alert('✅ Tu balance está actualizado\n\nNo hay llamadas pendientes de procesar.');
        }
      } else {
        alert(`❌ Error actualizando balance:\n\n${result.message}`);
      }
      
    } catch (error) {
      console.error('❌ Error en handleRefreshBalance:', error);
      alert('❌ Error inesperado actualizando balance');
    } finally {
      setRefreshingBalance(false);
    }
  };
  // ============================================================================
  // FUNCIONES DE CONFIGURACIÓN
  // ============================================================================

  // Obtener configuración de estado del balance
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'empty':
        return {
          badge: { variant: 'destructive' as const, text: 'Account Blocked' },
          icon: Shield,
          iconColor: 'text-red-500',
          balanceColor: 'text-red-600',
          message: 'Add funds to reactivate your account'
        };
      case 'critical':
        return {
          badge: { variant: 'destructive' as const, text: 'Critical Balance' },
          icon: AlertTriangle,
          iconColor: 'text-orange-500',
          balanceColor: 'text-orange-600',
          message: 'Urgent: Add funds to prevent service interruption'
        };
      case 'warning':
        return {
          badge: { variant: 'outline' as const, text: 'Low Balance' },
          icon: AlertCircle,
          iconColor: 'text-yellow-500',
          balanceColor: 'text-yellow-700',
          message: 'Consider adding funds soon'
        };
      case 'healthy':
        return {
          badge: { variant: 'outline' as const, text: 'Good Standing' },
          icon: CheckCircle,
          iconColor: 'text-emerald-500',
          balanceColor: 'text-emerald-700',
          message: 'Your account is in good standing'
        };
      default:
        return {
          badge: { variant: 'outline' as const, text: 'Loading...' },
          icon: Wallet,
          iconColor: 'text-gray-500',
          balanceColor: 'text-gray-700',
          message: 'Loading balance information...'
        };
    }
  };

  // Función de refresh manual
  const handleRefresh = async () => {
    setRefreshing(true);
    refreshBalance();
    
    // Simular delay mínimo para UX
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // ============================================================================
  // VARIABLES COMPUTADAS
  // ============================================================================
  
  const config = getStatusConfig(balanceStatus);
  const IconComponent = config.icon;
  const lastDeduction = lastBalanceChange && lastBalanceChange.isDeduction 
    ? lastBalanceChange.difference 
    : null;
  // ============================================================================
  // RENDERS CONDICIONALES
  // ============================================================================

  // Super Admin View
  if (user?.user_metadata?.role === 'super_admin') {
    return (
      <Card className="border border-black bg-blue-50 rounded-xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-blue-100 border border-blue-200">
                <Shield className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-900">Super Admin Account</h3>
                <p className="text-sm text-blue-700 mt-1">
                  You have full access to manage all user credits and system administration
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-semibold">
              Administrator
            </Badge>
          </div>
          
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-blue-700">
                  All system features available
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/admin/credits'}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Info className="h-4 w-4 mr-2" />
                Manage User Credits
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading State
  if (loading) {
    return (
      <Card className="border border-black rounded-xl">
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center justify-center space-x-3">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-muted-foreground">Loading balance...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error State
  if (error) {
    return (
      <Card className="border border-black rounded-xl">
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center justify-between flex-col sm:flex-row space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-900">Unable to load balance</p>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="shrink-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  // ============================================================================
  // RENDER PRINCIPAL DEL COMPONENTE
  // ============================================================================
  
  return (
    <Card className="border border-black bg-white rounded-xl shadow-sm relative">
      {/* 🔄 INDICADOR DE AUTO-POLLING EN TIEMPO REAL */}
      <div className="absolute top-2 left-2 z-10">
        <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full transition-all duration-300 ${
          isPolling 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-gray-100 text-gray-600 border border-gray-200'
        }`}>
          <Activity className={`h-3 w-3 ${isPolling ? 'animate-pulse' : ''}`} />
          <span>{isPolling ? 'Live' : 'Offline'}</span>
        </div>
      </div>

      {/* ✅ INDICADOR DE ACTUALIZACIÓN EN TIEMPO REAL */}
      {showUpdateIndicator && lastDeduction && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center space-x-2 bg-red-100 border border-red-300 rounded-lg px-3 py-1 text-xs font-medium text-red-800 animate-bounce">
            <TrendingDown className="h-3 w-3" />
            <span>Call cost: -{formatCurrency(lastDeduction)}</span>
            <Zap className="h-3 w-3" />
          </div>
        </div>
      )}
      
      <CardContent className="p-3 sm:p-8">
        {/* LAYOUT RESPONSIVO */}
        <div className="flex flex-col sm:space-y-8">
          
          {/* ROW 1: Account Balance + Icon + Amount + Status + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            
            {/* Left: Account Balance + Icon + Amount */}
            <div className="flex items-center justify-center sm:justify-start space-x-3 mb-4 sm:mb-0">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 relative">
                <Wallet className="h-6 w-6 text-blue-600" />
                {/* Indicador de actualización en el ícono */}
                {showUpdateIndicator && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping"></div>
                )}
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Account Balance</h3>
                <p className={`text-2xl sm:text-4xl font-bold ${config.balanceColor} mt-1 transition-all duration-300`}>
                  {formatCurrency(currentBalance)}
                </p>
                {/* Mostrar último descuento */}
                {lastDeduction && showUpdateIndicator && (
                  <p className="text-sm text-red-600 font-medium mt-1 animate-fade-in">
                    Last call: -{formatCurrency(lastDeduction)}
                  </p>
                )}
                {/* Mostrar gastos del día */}
                {totalSpentToday > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Today: -{formatCurrency(totalSpentToday)}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop: Status Badge */}
            <div className="hidden sm:flex items-center justify-center">
              <div className="flex items-center space-x-3">
                <IconComponent className={`h-8 w-8 ${config.iconColor}`} />
                <Badge 
                  variant={config.badge.variant} 
                  className="text-base font-semibold px-4 py-2 rounded-lg"
                >
                  {config.badge.text}
                </Badge>
              </div>
            </div>

            {/* Desktop: Action Buttons - CON REFRESH BALANCE INTEGRADO */}
            {showActions && (
              <div className="hidden sm:flex items-center space-x-3">
                {/* Botón Refresh Balance */}
                <Button
                  onClick={handleRefreshBalance}
                  disabled={refreshingBalance || loading}
                  variant="outline"
                  size="sm"
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  {refreshingBalance ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-1">Processing...</span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-1" />
                      Refresh Balance
                    </>
                  )}
                </Button>

                {/* Botón Request Recharge */}
                {onRequestRecharge && (
                  <Button 
                    onClick={onRequestRecharge}
                    variant={balanceStatus === 'empty' || balanceStatus === 'critical' ? 'default' : 'outline'}
                    size="sm"
                    className="px-4 py-2 rounded-lg font-semibold"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {balanceStatus === 'empty' ? 'Add Funds' : 'Request Recharge'}
                  </Button>
                )}
                
                {/* Botón Contact Support solo si es crítico */}
                {(balanceStatus === 'warning' || balanceStatus === 'critical' || balanceStatus === 'empty') && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      alert('Please contact support to recharge your account: support@drscaleai.com');
                    }}
                    className="px-4 py-2 rounded-lg font-semibold"
                  >
                    Contact Support
                  </Button>
                )}
              </div>
            )}
          </div>
