// 💰 COMPONENTE DE BALANCE MEJORADO CON ANIMACIONES
// Ubicación: src/components/dashboard/CreditBalance.tsx
// ✅ MEJORADO: Diseño moderno, animaciones y balance destacado

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CreditCard, 
  Clock, 
  TrendingDown, 
  RefreshCw,
  Zap,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Activity,
  Settings,
  Shield,
  TrendingUp,
  Eye,
  Timer
} from 'lucide-react';
import { useNewBalanceSystem } from '@/hooks/useNewBalanceSystem';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface CreditBalanceProps {
  isSuperAdmin?: boolean;
}

export const CreditBalance: React.FC<CreditBalanceProps> = ({ isSuperAdmin = false }) => {
  const {
    balance,
    warningThreshold,
    criticalThreshold,
    isBlocked,
    isLoading,
    error,
    status,
    estimatedMinutes,
    lastUpdate,
    processingCalls,
    recentDeductions,
    isProcessing,
    userAgents,
    processedCallsCount,
    refreshBalance,
    debugInfo
  } = useNewBalanceSystem();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [balanceAnimation, setBalanceAnimation] = useState(false);
  const [prevBalance, setPrevBalance] = useState(balance);

  // Animación cuando cambia el balance
  useEffect(() => {
    if (balance !== prevBalance && !isLoading) {
      setBalanceAnimation(true);
      const timer = setTimeout(() => setBalanceAnimation(false), 1000);
      setPrevBalance(balance);
      return () => clearTimeout(timer);
    }
  }, [balance, prevBalance, isLoading]);

  // ============================================================================
  // FUNCIONES DE FORMATO Y UTILIDAD
  // ============================================================================

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatMinutes = (minutes: number) => {
    if (minutes === 0) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'blocked':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: Shield,
          label: 'Blocked',
          bgGradient: 'bg-gradient-to-br from-gray-50 to-gray-100',
          iconColor: 'text-gray-600',
          pulse: false,
          balanceColor: 'text-gray-600'
        };
      case 'empty':
        return {
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: AlertTriangle,
          label: 'Empty',
          bgGradient: 'bg-gradient-to-br from-red-50 to-red-100',
          iconColor: 'text-red-600',
          pulse: true,
          balanceColor: 'text-red-700'
        };
      case 'critical':
        return {
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: AlertTriangle,
          label: 'Critical',
          bgGradient: 'bg-gradient-to-br from-red-50 to-orange-50',
          iconColor: 'text-red-600',
          pulse: true,
          balanceColor: 'text-red-700'
        };
      case 'warning':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: AlertCircle,
          label: 'Warning',
          bgGradient: 'bg-gradient-to-br from-yellow-50 to-orange-50',
          iconColor: 'text-yellow-600',
          pulse: false,
          balanceColor: 'text-yellow-700'
        };
      default:
        return {
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: CheckCircle,
          label: 'Healthy',
          bgGradient: 'bg-gradient-to-br from-green-50 to-blue-50',
          iconColor: 'text-green-600',
          pulse: false,
          balanceColor: 'text-green-700'
        };
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshBalance();
    } catch (error) {
      console.error('Error refreshing balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRequestRecharge = () => {
    window.open('mailto:support@scaleai.com?subject=Credit Recharge Request', '_blank');
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // ============================================================================
  // RENDER DE ESTADOS DE ERROR Y CARGA
  // ============================================================================

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-pulse"></div>
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <span className="text-lg font-semibold text-gray-800">Credit Balance</span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs animate-pulse">
                    <Settings className="h-3 w-3 mr-1" />
                    Integrated
                  </Badge>
                </div>
              </div>
            </div>
            <LoadingSpinner size="sm" />
          </div>
          
          <div className="text-center py-8">
            <div className="animate-pulse">
              <div className="h-12 bg-blue-200 rounded-lg w-48 mx-auto mb-4"></div>
              <div className="h-4 bg-blue-100 rounded w-32 mx-auto"></div>
            </div>
            <p className="text-blue-600 text-sm mt-4 animate-pulse">Cargando balance integrado...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-pink-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 to-pink-400/10 animate-pulse"></div>
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <span className="text-lg font-semibold text-red-800">Credit Balance</span>
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs mt-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Error
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-red-600 border-red-300 hover:bg-red-100 transition-all duration-200"
            >
              {isRefreshing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="text-center py-4">
            <div className="text-red-600 text-lg font-semibold mb-2">⚠️ {error}</div>
            <p className="text-red-500 text-sm">Haz clic en actualizar para intentar de nuevo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // RENDER PRINCIPAL - DISEÑO MEJORADO CON ANIMACIONES
  // ============================================================================

  return (
    <Card className={`border-0 shadow-lg ${statusConfig.bgGradient} relative overflow-hidden transition-all duration-500 hover:shadow-xl`}>
      {/* Efectos de fondo animados */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
      
      {/* Pulso para estados críticos */}
      {statusConfig.pulse && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-red-400/5 to-orange-400/5"></div>
      )}

      <CardContent className="p-6 relative">
        {/* Header mejorado */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl transition-all duration-300 ${statusConfig.color.includes('green') ? 'bg-green-100' : statusConfig.color.includes('red') ? 'bg-red-100' : statusConfig.color.includes('yellow') ? 'bg-yellow-100' : 'bg-gray-100'}`}>
              <CreditCard className={`h-6 w-6 ${statusConfig.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-800">Credit Balance</span>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs hover:bg-blue-100 transition-colors">
                  <Settings className="h-3 w-3 mr-1" />
                  Integrado
                </Badge>
                
                {(isProcessing || processingCalls.length > 0) && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs animate-pulse">
                    <Activity className="h-3 w-3 mr-1" />
                    Procesando
                  </Badge>
                )}

                {isBlocked && (
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    <Shield className="h-3 w-3 mr-1" />
                    Cuenta Bloqueada
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge className={`text-sm ${statusConfig.color} flex items-center gap-1 px-3 py-1 transition-all duration-300 hover:scale-105`}>
              <StatusIcon className={`h-4 w-4 ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
              {statusConfig.label}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-10 w-10 p-0 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 hover:scale-105"
            >
              {isRefreshing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : 'hover:rotate-180 transition-transform duration-500'}`} />
              )}
            </Button>
          </div>
        </div>

        {/* Balance principal DESTACADO con animaciones */}
        <div className="mb-6 text-center">
          <div className={`inline-block p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg transition-all duration-500 ${balanceAnimation ? 'scale-105 shadow-xl' : 'hover:scale-102'}`}>
            <div className="flex items-center justify-center gap-3 mb-2">
              <DollarSign className={`h-8 w-8 ${statusConfig.iconColor} ${balanceAnimation ? 'animate-bounce' : ''}`} />
              <span className={`text-5xl font-black ${statusConfig.balanceColor} ${balanceAnimation ? 'animate-pulse' : ''} transition-all duration-300`}>
                {formatCurrency(balance).replace('$', '')}
              </span>
            </div>
            
            {recentDeductions.length > 0 && (
              <div className="flex items-center justify-center gap-2 text-red-600 animate-fade-in">
                <TrendingDown className="h-4 w-4 animate-bounce" />
                <span className="text-sm font-semibold">
                  Último descuento: -{formatCurrency(recentDeductions[0].amount)}
                </span>
              </div>
            )}
          </div>
          
          {/* Minutos estimados mejorados */}
          <div className="mt-4 flex items-center justify-center gap-2 text-gray-700">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-full backdrop-blur-sm">
              <Timer className="h-4 w-4 text-blue-600" />
              <span className="font-semibold">{formatMinutes(estimatedMinutes)} restantes</span>
              {userAgents.length > 0 && (
                <span className="text-xs text-gray-500 ml-2">
                  (promedio: ${(userAgents.reduce((sum, a) => sum + a.rate_per_minute, 0) / userAgents.length).toFixed(3)}/min)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Thresholds personalizados mejorados */}
        <div className="mb-6 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Umbrales Personalizados:
            </span>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-500">Advertencia</div>
                <div className="text-sm font-bold text-yellow-600">{formatCurrency(warningThreshold)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Crítico</div>
                <div className="text-sm font-bold text-red-600">{formatCurrency(criticalThreshold)}</div>
              </div>
            </div>
          </div>
          {isSuperAdmin && (
            <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Estos umbrales se pueden personalizar en Admin Credits
            </div>
          )}
        </div>

        {/* Sistema automático mejorado */}
        {(processingCalls.length > 0 || recentDeductions.length > 0 || processedCallsCount > 0) && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-blue-600 animate-pulse" />
              <span className="text-sm font-bold text-blue-800">Sistema Automático Integrado</span>
              {debugInfo.usingRPCFunction && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  RPC Activo
                </Badge>
              )}
            </div>
            
            <div className="space-y-2 text-sm text-blue-700">
              {processingCalls.length > 0 && (
                <div className="flex items-center gap-2 animate-pulse">
                  <Activity className="h-4 w-4" />
                  Procesando {processingCalls.length} llamadas...
                </div>
              )}
              
              {processedCallsCount > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {processedCallsCount} llamadas procesadas automáticamente
                </div>
              )}
              
              {recentDeductions.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Descuentos automáticos recientes:
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {recentDeductions.slice(0, 3).map((deduction, index) => (
                      <div key={index} className="flex justify-between items-center text-xs bg-white/50 p-2 rounded">
                        <span className="font-mono">{deduction.callId.substring(0, 12)}...</span>
                        <span className="font-bold text-red-600">-{formatCurrency(deduction.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-blue-200 text-xs text-blue-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Conectado al Sistema Admin - {debugInfo.usingRPCFunction}
              </div>
            </div>
          </div>
        )}

        {/* Footer mejorado */}
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Actualizado: {lastUpdate.toLocaleTimeString()}
          </div>
          
          <Button
            onClick={handleRequestRecharge}
            size="sm"
            className={`bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl ${isBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isBlocked}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            {isBlocked ? 'Cuenta Bloqueada' : 'Solicitar Recarga'}
          </Button>
        </div>

        {/* Debug info mejorada para Super Admin */}
        {isSuperAdmin && debugInfo && (
          <div className="mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-xs border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              <Eye className="h-3 w-3 mr-2" />
              {showDetails ? 'Ocultar' : 'Mostrar'} Debug Info (Super Admin)
            </Button>
            
            {showDetails && (
              <div className="mt-3 p-4 bg-gray-100/70 backdrop-blur-sm rounded-xl border border-gray-200 animate-fade-in">
                <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Información de Debug:
                </div>
                <div className="text-xs text-gray-600 space-y-1 grid grid-cols-2 gap-2">
                  <div>✅ Tabla: user_credits</div>
                  <div>✅ RPC: {debugInfo.usingRPCFunction}</div>
                  <div>Agentes: {userAgents.length}</div>
                  <div>Polling: {debugInfo.isPollingActive ? '🟢 Activo' : '🔴 Inactivo'}</div>
                  <div>Llamadas procesadas: {debugInfo.processedCalls.length}</div>
                  <div>Estado: {isBlocked ? '🚫 BLOQUEADO' : '✅ Activo'}</div>
                </div>
                {debugInfo.processedCalls.length > 0 && (
                  <div className="mt-3 max-h-20 overflow-y-auto">
                    <div className="font-semibold text-xs mb-1">Llamadas procesadas:</div>
                    <div className="space-y-1">
                      {debugInfo.processedCalls.slice(0, 5).map((callId, index) => (
                        <div key={index} className="text-xs font-mono bg-white/50 p-1 rounded">
                          {callId.substring(0, 20)}...
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Estilos CSS personalizados para animaciones */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </Card>
  );
};
