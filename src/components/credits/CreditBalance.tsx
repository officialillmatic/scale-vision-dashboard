// src/components/credits/CreditBalance.tsx - VERSIÓN CORREGIDA
// Eliminando errores críticos y simplificando

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  Activity
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatCurrency } from '@/lib/formatters';

interface CreditBalanceProps {
  onRequestRecharge?: () => void;
  showActions?: boolean;
}

export function CreditBalance({ onRequestRecharge, showActions = true }: CreditBalanceProps) {
  const { user } = useAuth();
  
  // ✅ ESTADOS UNIFICADOS - UNA SOLA FUENTE DE VERDAD
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balanceLoaded, setBalanceLoaded] = useState(false);
  const [lastDeduction, setLastDeduction] = useState<number | null>(null);
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ FUNCIÓN PARA OBTENER BALANCE - SIN DEPENDENCIAS CIRCULARES
  const fetchBalance = useCallback(async () => {
    if (!user?.id) return null;

    try {
      console.log('💰 Obteniendo balance...');
      
      const { data: creditData, error } = await supabase
        .from('user_credits')
        .select('current_balance')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo balance:', error);
        setError('Error loading balance');
        return null;
      }

      const currentBalance = creditData?.current_balance || 0;
      console.log(`✅ Balance obtenido: $${currentBalance}`);
      
      setBalance(currentBalance);
      setBalanceLoaded(true);
      setError(null);
      
      return currentBalance;
      
    } catch (error) {
      console.error('💥 Error en fetchBalance:', error);
      setError('Failed to load balance');
      return null;
    }
  }, [user?.id]);

  // ✅ CARGAR BALANCE INICIAL
  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      fetchBalance().finally(() => setLoading(false));
    }
  }, [user?.id, fetchBalance]);

  // ✅ LISTENER ÚNICO Y CONSOLIDADO
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔔 Configurando listener para balanceUpdated...');
    
    const handleBalanceUpdate = async (event: CustomEvent) => {
      console.log('💳 Evento balanceUpdated recibido:', event.detail);
      
      const { userId, deduction } = event.detail;
      
      // Verificar que sea para este usuario
      if (userId === user.id || userId === 'current-user' || userId === 'test-user') {
        console.log('✅ Actualizando balance...');
        
        // Actualizar balance local inmediatamente para UX
        if (balanceLoaded) {
          const newBalance = Math.max(0, balance - deduction);
          console.log(`💰 Balance: $${balance} → $${newBalance}`);
          setBalance(newBalance);
        }
        
        // Mostrar indicador visual
        setLastDeduction(deduction);
        setShowUpdateIndicator(true);
        
        // Ocultar indicador después de 5 segundos
        setTimeout(() => {
          setShowUpdateIndicator(false);
          setLastDeduction(null);
        }, 5000);
        
        // Confirmar con BD después de un momento
        setTimeout(async () => {
          await fetchBalance();
        }, 1000);
      }
    };

    window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
    
    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
      console.log('🧹 Listener removido');
    };
  }, [user?.id, balance, balanceLoaded, fetchBalance]);

  // ✅ FUNCIÓN DE REFRESH MANUAL
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBalance();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // ✅ CALCULAR STATUS DEL BALANCE
  const getBalanceStatus = (currentBalance: number) => {
    if (currentBalance <= 0) return 'empty';
    if (currentBalance <= 1) return 'critical';
    if (currentBalance <= 5) return 'warning';
    return 'healthy';
  };

  // ✅ CONFIGURACIÓN DE STATUS
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

  // ✅ VARIABLES COMPUTADAS
  const balanceStatus = getBalanceStatus(balance);
  const config = getStatusConfig(balanceStatus);
  const IconComponent = config.icon;

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
  // RENDER PRINCIPAL
  // ============================================================================
  
  return (
    <Card className="border border-black bg-white rounded-xl shadow-sm relative">
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
                  {formatCurrency(balance)}
                </p>
                {/* Mostrar último descuento */}
                {lastDeduction && showUpdateIndicator && (
                  <p className="text-sm text-red-600 font-medium mt-1 animate-fade-in">
                    Last call: -{formatCurrency(lastDeduction)}
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
              <div className="hidden sm:flex items-center space-x-3">
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
              {/* Botón Request Recharge - Mobile */}
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
              
              {/* Botón Contact Support - Mobile */}
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
                  balance > 0 ? 'bg-green-500' : 'bg-red-500'
                } ${showUpdateIndicator ? 'animate-pulse' : ''}`}></div>
                <p className="text-sm sm:text-base font-medium text-gray-700">
                  {balance > 0 ? 'Available for calls' : 'Service unavailable'}
                </p>
              </div>

              {/* Center: Status Message */}
              <div className="text-center">
                <p className="text-sm sm:text-base font-medium text-gray-600">
                  {config.message}
                </p>
                {balance > 0 && (
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Balance will update automatically during calls
                  </p>
                )}
              </div>

              {/* Right: Controls */}
              <div className="flex items-center justify-center">
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
                    <RefreshCw className={`h-5 w-5 ${showUpdateIndicator ? 'animate-spin' : ''}`} />
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
