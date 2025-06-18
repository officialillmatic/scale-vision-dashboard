// src/components/credits/CreditBalance.tsx - PARTE 1
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
  Clock
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

  // ESTADOS LOCALES
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
  // FUNCIONES AUXILIARES
  // ============================================================================
  
  // Calcular tarifa promedio real del usuario
  const calculateAverageRate = (): number => {
    if (!user?.id) {
      console.log('⚠️ No user ID available for rate calculation');
      return 0.02; // Fallback genérico
    }

    // Obtener agentes del usuario desde useAgents hook
    if (!agents || agents.length === 0) {
      console.log('⚠️ No agents available, usando tarifa fallback');
      return 0.02; // Fallback si no hay agentes cargados
    }

    // Filtrar agentes que tienen tarifa configurada
    const agentsWithRates = agents.filter(agent => 
      agent.rate_per_minute && 
      agent.rate_per_minute > 0
    );
    
    console.log('🎯 Agentes con tarifas encontrados:', agentsWithRates.length);
    console.log('📊 Tarifas de agentes:', agentsWithRates.map(a => ({
      name: a.name,
      rate: a.rate_per_minute
    })));

    if (agentsWithRates.length === 0) {
      console.log('⚠️ No agents with valid rates, usando tarifa fallback');
      return 0.02; // Fallback si no hay tarifas válidas
    }

    // Calcular promedio ponderado (todos los agentes tienen el mismo peso)
    const totalRate = agentsWithRates.reduce((sum, agent) => 
      sum + agent.rate_per_minute!, 0
    );
    const averageRate = totalRate / agentsWithRates.length;
    
    console.log(`💰 Tarifa promedio calculada: $${averageRate.toFixed(4)}/min`);
    console.log(`📋 Basado en ${agentsWithRates.length} agentes con tarifas válidas`);
    
    return averageRate;
  };

  // Calcular minutos estimados con tarifas reales
  const calculateEstimatedMinutes = (): number => {
    if (!currentBalance || currentBalance <= 0) {
      console.log('💰 Balance insuficiente para calcular minutos');
      return 0;
    }

    const averageRate = calculateAverageRate();
    
    if (averageRate <= 0) {
      console.log('⚠️ Tarifa promedio inválida, no se pueden calcular minutos');
      return 0;
    }

    const estimatedMinutes = Math.floor(currentBalance / averageRate);
    
    console.log(`🧮 CÁLCULO DE MINUTOS ESTIMADOS:`);
    console.log(`   💳 Balance actual: $${currentBalance.toFixed(2)}`);
    console.log(`   💰 Tarifa promedio: $${averageRate.toFixed(4)}/min`);
    console.log(`   ⏱️ Minutos estimados: ${estimatedMinutes}`);
    console.log(`   🔢 Cálculo: $${currentBalance.toFixed(2)} ÷ $${averageRate.toFixed(4)} = ${estimatedMinutes} min`);
    
    return estimatedMinutes;
  };

  // Función para obtener agentes en tiempo real
  const fetchUserAgentsWithRates = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🔍 Obteniendo agentes del usuario con tarifas...');
      
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
        return;
      }

      if (userAgents && userAgents.length > 0) {
        const agentsData = userAgents.map(assignment => assignment.agents);
        console.log('✅ Agentes obtenidos para cálculo de minutos:', agentsData);
        
        // Forzar recálculo de minutos estimados
        const validAgents = agentsData.filter(agent => agent && agent.rate_per_minute && agent.rate_per_minute > 0);
        
        if (validAgents.length > 0) {
          const totalRate = validAgents.reduce((sum, agent) => sum + agent.rate_per_minute, 0);
          const avgRate = totalRate / validAgents.length;
          console.log(`📊 Tarifa promedio actualizada: $${avgRate.toFixed(4)}/min`);
        }
      }

    } catch (error) {
      console.error('❌ Error en fetchUserAgentsWithRates:', error);
    }
  }, [user?.id]);

  // Effect para cargar agentes al inicializar el componente
  useEffect(() => {
    if (user?.id && !isLoadingAgents && fetchUserAgentsWithRates) {
      fetchUserAgentsWithRates().catch(error => {
        console.error('Error en useEffect fetchUserAgentsWithRates:', error);
      });
    }
  }, [user?.id, isLoadingAgents, fetchUserAgentsWithRates]);
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
  const estimatedMinutes = calculateEstimatedMinutes();
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

            {/* Desktop: Action Buttons */}
            {showActions && (
              <div className="hidden sm:flex items-center space-x-4">
                {onRequestRecharge && (
                  <Button 
                    onClick={onRequestRecharge}
                    variant={balanceStatus === 'empty' || balanceStatus === 'critical' ? 'default' : 'outline'}
                    size="lg"
                    className="px-6 py-3 rounded-lg font-semibold"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    {balanceStatus === 'empty' ? 'Add Funds' : 'Request Recharge'}
                  </Button>
                )}
                
                {(balanceStatus === 'warning' || balanceStatus === 'critical' || balanceStatus === 'empty') && (
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => {
                      alert('Please contact support to recharge your account: support@drscaleai.com');
                    }}
                    className="px-6 py-3 rounded-lg font-semibold"
                  >
                    Contact Support
                  </Button>
                )}
              </div>
            )}
          </div>
          {/* ROW 2: Mobile Status Badge (centered) */}
          <div className="flex sm:hidden items-center justify-center space-x-3 mb-4">
            <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
            <Badge 
              variant={config.badge.variant} 
              className="text-sm font-semibold px-3 py-1 rounded-lg"
            >
              {config.badge.text}
            </Badge>
          </div>

          {/* ROW 3: Mobile Action Buttons */}
          {showActions && (
            <div className="flex sm:hidden flex-col space-y-3 mb-4">
              {onRequestRecharge && (
                <Button 
                  onClick={onRequestRecharge}
                  variant={balanceStatus === 'empty' || balanceStatus === 'critical' ? 'default' : 'outline'}
                  size="lg"
                  className="w-full py-3 rounded-lg font-semibold"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {balanceStatus === 'empty' ? 'Add Funds' : 'Request Recharge'}
                </Button>
              )}
              
              {(balanceStatus === 'warning' || balanceStatus === 'critical' || balanceStatus === 'empty') && (
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => {
                    alert('Please contact support to recharge your account: support@drscaleai.com');
                  }}
                  className="w-full py-3 rounded-lg font-semibold"
                >
                  Contact Support
                </Button>
              )}
            </div>
          )}

          {/* BOTTOM ROW - Secondary Information */}
          <div className="border-t border-gray-100 pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              
              {/* Left: Availability Status */}
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <div className={`h-3 w-3 rounded-full ${
                  currentBalance > 0 ? 'bg-green-500' : 'bg-red-500'
                } ${showUpdateIndicator ? 'animate-pulse' : ''}`}></div>
                <p className="text-sm sm:text-base font-medium text-gray-700">
                  {currentBalance > 0 ? 'Available for calls' : 'Service unavailable'}
                </p>
                {/* Mostrar conteo de transacciones recientes */}
                {recentTransactionsCount > 0 && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    {recentTransactionsCount} recent
                  </span>
                )}
              </div>

              {/* Center: Status Message + Estimado */}
              <div className="text-center">
                <p className="text-sm sm:text-base font-medium text-gray-600">
                  {config.message}
                </p>
                {currentBalance > 0 && (
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    {isLoadingAgents ? (
                      <span className="flex items-center justify-center gap-1">
                        <LoadingSpinner size="sm" />
                        Calculating minutes...
                      </span>
                    ) : (
                      <>
                        Estimated {estimatedMinutes.toLocaleString()} minutes remaining
                        {estimatedMinutes > 0 && (
                          <span className="text-xs text-blue-600 ml-2">
                            (avg ${calculateAverageRate().toFixed(3)}/min)
                          </span>
                        )}
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Right: Thresholds + Controls */}
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
                {balanceStats && (
                  <div className="text-center sm:text-right">
                    <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm font-medium">
                      <span className="text-yellow-700">
                        Warning: {formatCurrency(balanceStats.warning_threshold)}
                      </span>
                      <span className="text-orange-700">
                        Critical: {formatCurrency(balanceStats.critical_threshold)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Updated {new Date(balanceStats.updated_at).toLocaleDateString()}
                      {/* Indicador de tiempo real */}
                      {isPolling && (
                        <span className="ml-2 text-green-600 font-medium">• Live</span>
                      )}
                      {showUpdateIndicator && (
                        <span className="ml-2 text-blue-600 font-medium animate-pulse">• Updated</span>
                      )}
                    </p>
                  </div>
                )}
                
                <Button 
                  onClick={handleRefresh} 
                  variant="ghost" 
                  size="sm"
                  disabled={refreshing}
                  className="h-10 w-10 p-0 rounded-lg"
                >
                  {refreshing ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <RefreshCw className={`h-5 w-5 ${isPolling ? 'text-green-600' : ''} ${showUpdateIndicator ? 'animate-spin' : ''}`} />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
