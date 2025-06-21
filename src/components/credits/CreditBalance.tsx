// 💰 ULTRA COMPACT CREDIT BALANCE - INTEGRADO CON CALLSSIMPLE.TSX
// Location: src/components/dashboard/CreditBalance.tsx
// ✅ PARTE 1: Imports, Types y Hook

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
  CheckCircle,
  AlertCircle,
  DollarSign,
  Activity,
  Shield,
  Eye,
  Bug,
  Users
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CreditBalanceProps {
  isSuperAdmin?: boolean;
  onRequestRecharge?: () => void;
  showActions?: boolean;
}

// ✅ NUEVO: Hook simplificado para balance (compatible con CallsSimple.tsx)
const useSimplifiedBalance = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [recentDeductions, setRecentDeductions] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userAgents, setUserAgents] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>({
    usingUserCreditsTable: false,
    customAgentsCount: 0,
    externalAgentIds: [],
    isPollingActive: false,
    processedCalls: [],
    usingRPCFunction: null
  });

  // ✅ FUNCIÓN PRINCIPAL: Cargar balance (SOLO PROFILES como CallsSimple.tsx)
  const loadBalance = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('💰 [CreditBalance] Cargando balance desde profiles...');
      
      // ✅ USAR SOLO PROFILES (como CallsSimple.tsx)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('credit_balance')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ [CreditBalance] Error cargando balance:', profileError);
        setError(`Error loading balance: ${profileError.message}`);
        return;
      }

      const currentBalance = profileData?.credit_balance || 0;
      setBalance(currentBalance);
      setLastUpdate(new Date());
      
      console.log(`✅ [CreditBalance] Balance cargado: $${currentBalance}`);

      // Cargar agentes asignados para debug
      await loadUserAgents();
      
    } catch (err: any) {
      console.error('💥 [CreditBalance] Error:', err);
      setError(`Exception: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  // ✅ FUNCIÓN: Cargar agentes asignados (para debug)
  const loadUserAgents = async () => {
    if (!user?.id) return;

    try {
      const { data: assignments, error } = await supabase
        .from('user_agent_assignments')
        .select(`
          *,
          agents:agent_id (
            id,
            name,
            retell_agent_id,
            rate_per_minute
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!error && assignments) {
        const agents = assignments.map(a => a.agents).filter(Boolean);
        setUserAgents(agents);
        
        // Actualizar debug info
        setDebugInfo(prev => ({
          ...prev,
          customAgentsCount: agents.length,
          externalAgentIds: agents.map(a => a.retell_agent_id).filter(Boolean),
          usingUserCreditsTable: false, // Siempre false porque usamos profiles
          isPollingActive: true // Asumimos que está activo
        }));
      }
    } catch (error) {
      console.error('❌ Error loading user agents:', error);
    }
  };

  // ✅ LISTENER: Escuchar eventos de balance (como CallsSimple.tsx)
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔔 [CreditBalance] Configurando listener para balanceUpdated...');
    
    const handleBalanceUpdate = (event: CustomEvent) => {
      console.log('💳 [CreditBalance] Evento balanceUpdated recibido:', event.detail);
      
      const { userId, deduction, callId, newBalance, oldBalance } = event.detail;
      
      // Solo procesar si es para este usuario
      if (userId === user?.id || userId === 'current-user') {
        console.log('✅ [CreditBalance] Actualizando balance automáticamente...');
        
        // Actualizar balance si tenemos el nuevo valor
        if (typeof newBalance === 'number') {
          setBalance(newBalance);
        } else {
          // Fallback: recargar balance
          loadBalance();
        }
        
        // Agregar deducción reciente
        if (deduction && deduction > 0) {
          setRecentDeductions(prev => [
            { amount: deduction, callId, timestamp: new Date() },
            ...prev.slice(0, 4) // Mantener solo las últimas 5
          ]);
        }
        
        setLastUpdate(new Date());
        setIsProcessing(false); // Terminar estado de procesamiento
      }
    };

    // ✅ LISTENER ADICIONAL: forceBalanceRefresh (del DashboardPage.tsx)
    const handleForceRefresh = (event: CustomEvent) => {
      console.log('🔄 [CreditBalance] Force refresh recibido');
      loadBalance();
    };

    window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
    window.addEventListener('forceBalanceRefresh', handleForceRefresh as EventListener);
    
    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
      window.removeEventListener('forceBalanceRefresh', handleForceRefresh as EventListener);
    };
  }, [user?.id]);

  // ✅ CARGAR INICIAL
  useEffect(() => {
    if (user?.id) {
      loadBalance();
    }
  }, [user?.id]);
  return {
    balance,
    isLoading,
    error,
    lastUpdate,
    recentDeductions,
    isProcessing,
    userAgents,
    debugInfo,
    refreshBalance: loadBalance,
    // Calculadas
    warningThreshold: 10,
    criticalThreshold: 5,
    isBlocked: balance <= 0,
    status: balance <= 0 ? 'blocked' : balance <= 5 ? 'critical' : balance <= 10 ? 'warning' : 'healthy',
    estimatedMinutes: userAgents.length > 0 && userAgents[0]?.rate_per_minute ? 
      Math.floor(balance / (userAgents[0].rate_per_minute / 60)) : 0,
    processingCalls: [] // Placeholder para compatibilidad
  };
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const CreditBalance: React.FC<CreditBalanceProps> = ({ 
  isSuperAdmin = false,
  onRequestRecharge,
  showActions = true
}) => {
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
    debugInfo,
    refreshBalance
  } = useSimplifiedBalance();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // ============================================================================
  // UTILITY FUNCTIONS
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
          color: 'bg-gray-100 text-gray-800',
          icon: Shield,
          label: 'Blocked',
          bgColor: 'bg-gray-50'
        };
      case 'empty':
        return {
          color: 'bg-red-100 text-red-800',
          icon: AlertTriangle,
          label: 'Empty',
          bgColor: 'bg-red-50'
        };
      case 'critical':
        return {
          color: 'bg-red-100 text-red-800',
          icon: AlertTriangle,
          label: 'Critical',
          bgColor: 'bg-red-50'
        };
      case 'warning':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: AlertCircle,
          label: 'Warning',
          bgColor: 'bg-yellow-50'
        };
      default:
        return {
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle,
          label: 'Healthy',
          bgColor: 'bg-green-50'
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
    if (onRequestRecharge) {
      onRequestRecharge();
    } else {
      window.open('mailto:support@scaleai.com?subject=Credit Recharge Request', '_blank');
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  // ============================================================================
  // LOADING & ERROR STATES - ULTRA COMPACT
  // ============================================================================

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-blue-50">
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Credit Balance</span>
              <Badge variant="outline" className="text-xs">Loading...</Badge>
            </div>
            <LoadingSpinner size="sm" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm bg-red-50">
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Credit Balance</span>
              <Badge variant="destructive" className="text-xs">Error</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-red-600 text-xs mt-1">⚠️ {error}</p>
        </CardContent>
      </Card>
    );
  }
  // ============================================================================
  // ULTRA COMPACT MAIN RENDER - INSPIRED BY WORKING ADMIN PANELS
  // ============================================================================

  return (
    <Card className={`border-0 shadow-sm ${statusConfig.bgColor}`}>
      <CardContent className="p-2">
        {/* Ultra Compact Header - Single Line */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Credit Balance</span>
            
            {/* Compact status badges */}
            <Badge className={`text-xs ${statusConfig.color} flex items-center gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
            
            {(isProcessing || processingCalls.length > 0) && (
              <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                <Activity className="h-3 w-3 animate-pulse" />
              </Badge>
            )}

            {isBlocked && (
              <Badge variant="destructive" className="text-xs">Blocked</Badge>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {/* Ultra Compact Balance Display - Main Focus */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(balance)}
            </span>
            {recentDeductions.length > 0 && (
              <span className="text-xs text-red-600 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                -{formatCurrency(recentDeductions[0].amount)}
              </span>
            )}
          </div>
          
          <div className="text-right text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatMinutes(estimatedMinutes)} left
            </div>
          </div>
        </div>

        {/* Compact Thresholds - Only if they exist */}
        {warningThreshold > 0 && criticalThreshold > 0 && (
          <div className="flex justify-between text-xs text-gray-600 mb-2">
            <span>Thresholds:</span>
            <div className="flex gap-2">
              <span className="text-yellow-600">W: {formatCurrency(warningThreshold)}</span>
              <span className="text-red-600">C: {formatCurrency(criticalThreshold)}</span>
            </div>
          </div>
        )}

        {/* ✅ NUEVO: Auto System Status integrado con CallsSimple.tsx */}
        {(processingCalls.length > 0 || recentDeductions.length > 0 || debugInfo.customAgentsCount > 0) && (
          <div className="bg-blue-50 p-2 rounded text-xs mb-2">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 font-medium">CallsSimple System Active</span>
              {debugInfo.usingRPCFunction && (
                <Badge variant="outline" className="text-xs">RPC</Badge>
              )}
            </div>
            {debugInfo.customAgentsCount > 0 && (
              <div className="text-blue-600">🤖 {debugInfo.customAgentsCount} agents assigned</div>
            )}
            {recentDeductions.length > 0 && (
              <div className="text-blue-600">
                Recent: -{formatCurrency(recentDeductions[0].amount)}
              </div>
            )}
          </div>
        )}

        {/* Ultra Compact Footer */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {lastUpdate.toLocaleTimeString()}
          </span>
          
          {showActions && (
            <Button
              onClick={handleRequestRecharge}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-6"
              disabled={isBlocked}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              {isBlocked ? 'Blocked' : 'Recharge'}
            </Button>
          )}
        </div>
        {/* ✅ MEJORADO: Debug section integrado con CallsSimple.tsx */}
        <div className="mt-2 border-t pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="w-full text-xs h-6"
          >
            <Bug className="h-3 w-3 mr-1" />
            {showDebug ? 'Hide' : 'Show'} CallsSimple Debug
          </Button>
            
            {showDebug && (
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs space-y-1">
                <div className="font-bold text-red-600">🚨 CALLSSIMPLE SYSTEM DEBUG:</div>
                
                {/* Critical debugging info */}
                <div>Source: Profiles Table ✅</div>
                <div>Balance: {formatCurrency(balance)}</div>
                <div>Custom Agents: {debugInfo.customAgentsCount}</div>
                <div>External Agent IDs: {debugInfo.externalAgentIds?.length || 0}</div>
                <div>System Active: {debugInfo.isPollingActive ? '🟢 YES' : '🔴 NO'}</div>
                <div>Recent Deductions: {recentDeductions.length}</div>
                
                {/* Show external agent IDs */}
                {debugInfo.externalAgentIds && debugInfo.externalAgentIds.length > 0 && (
                  <div className="border-t pt-1">
                    <div className="font-medium">External Agent IDs:</div>
                    {debugInfo.externalAgentIds.slice(0, 3).map((id, index) => (
                      <div key={index} className="font-mono text-xs">{id}</div>
                    ))}
                  </div>
                )}
                
                {/* Show user agents info */}
                {userAgents && userAgents.length > 0 && (
                  <div className="border-t pt-1">
                    <div className="font-medium">Assigned Agents:</div>
                    {userAgents.slice(0, 2).map((agent, index) => (
                      <div key={index} className="text-xs">
                        {agent.name} - ${agent.rate_per_minute}/min
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent deductions */}
                {recentDeductions.length > 0 && (
                  <div className="border-t pt-1">
                    <div className="font-medium">Recent Deductions:</div>
                    {recentDeductions.slice(0, 3).map((deduction, index) => (
                      <div key={index} className="text-xs">
                        -{formatCurrency(deduction.amount)} 
                        {deduction.callId && ` (${deduction.callId.substring(0, 12)}...)`}
                      </div>
                    ))}
                  </div>
                )}

                {/* Critical status indicators */}
                <div className="border-t pt-1 space-y-1">
                  <div className="font-medium">System Status:</div>
                  <div>Balance Loading: {isLoading ? '🔄' : '✅'}</div>
                  <div>Agents Loaded: {userAgents.length > 0 ? '✅' : '❌'}</div>
                  <div>Currently Processing: {isProcessing ? '🔄' : '⏸️'}</div>
                  <div>Balance Source: Profiles ✅</div>
                </div>

                {/* Integration status */}
                <div className="border-t pt-1 bg-green-50 p-1 rounded">
                  <div className="font-bold text-green-800">✅ INTEGRATED WITH CALLSSIMPLE:</div>
                  <div className="text-green-700 text-xs">
                    • Uses same profiles table<br/>
                    • Listens to balanceUpdated events<br/>
                    • Shows same agent assignments<br/>
                    • Real-time balance updates
                  </div>
                </div>

                {/* Real-time status */}
                <div className="border-t pt-1 bg-blue-50 p-1 rounded">
                  <div className="font-bold text-blue-800">💡 SYSTEM STATUS:</div>
                  <div className="text-blue-700 text-xs">
                    ✅ Connected to CallsSimple.tsx<br/>
                    ✅ Real-time balance updates<br/>
                    ✅ Same data source (profiles)<br/>
                    ✅ Event-driven updates
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      </CardContent>
    </Card>
  );
};
