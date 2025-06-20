// 💰 COMPACT CREDIT BALANCE - FIXED & FUNCTIONAL
// Location: src/components/dashboard/CreditBalance.tsx
// ✅ FIXED: Compact design, English, working thresholds, real deductions

import React, { useState } from 'react';
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
  Eye
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
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Shield,
          label: 'Blocked',
          bgColor: 'bg-gray-50',
          iconColor: 'text-gray-600'
        };
      case 'empty':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertTriangle,
          label: 'Empty',
          bgColor: 'bg-red-50',
          iconColor: 'text-red-600'
        };
      case 'critical':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertTriangle,
          label: 'Critical',
          bgColor: 'bg-red-50',
          iconColor: 'text-red-600'
        };
      case 'warning':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: AlertCircle,
          label: 'Warning',
          bgColor: 'bg-yellow-50',
          iconColor: 'text-yellow-600'
        };
      default:
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          label: 'Healthy',
          bgColor: 'bg-green-50',
          iconColor: 'text-green-600'
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
  // LOADING & ERROR STATES
  // ============================================================================

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-blue-50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Credit Balance</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                Integrated
              </Badge>
            </div>
            <LoadingSpinner size="sm" />
          </div>
          <div className="text-center py-2">
            <p className="text-blue-600 text-xs">Loading integrated balance...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm bg-red-50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Credit Balance</span>
              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs">
                Error
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-6 w-6 p-0 text-red-600 border-red-200 hover:bg-red-100"
            >
              {isRefreshing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
          <div className="text-center">
            <p className="text-red-600 text-xs font-medium">⚠️ {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // MAIN RENDER - COMPACT DESIGN
  // ============================================================================

  return (
    <Card className={`border-0 shadow-sm ${statusConfig.bgColor} relative overflow-hidden`}>
      <CardContent className="p-3">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Credit Balance</span>
            
            {/* Status indicators */}
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              <Settings className="h-3 w-3 mr-1" />
              Integrated
            </Badge>
            
            {(isProcessing || processingCalls.length > 0) && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                Auto Processing
              </Badge>
            )}

            {isBlocked && (
              <Badge variant="destructive" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Blocked
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Status badge */}
            <Badge className={`text-xs ${statusConfig.color} flex items-center gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-6 w-6 p-0 border-gray-300"
            >
              {isRefreshing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Main Balance Display - HIGHLIGHTED */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(balance)}
              </span>
              {recentDeductions.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <TrendingDown className="h-3 w-3" />
                  <span>-{formatCurrency(recentDeductions[0].amount)}</span>
                </div>
              )}
            </div>
            
            {/* Estimated minutes */}
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="h-3 w-3" />
                <span>{formatMinutes(estimatedMinutes)} left</span>
              </div>
              {userAgents.length > 0 && (
                <span className="text-xs text-gray-500">
                  avg: ${(userAgents.reduce((sum, a) => sum + a.rate_per_minute, 0) / userAgents.length).toFixed(3)}/min
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ✅ FIXED: Personal Thresholds - Now Working */}
        {warningThreshold > 0 && criticalThreshold > 0 && (
          <div className="mb-3 p-2 bg-white/50 rounded-md border border-gray-200/50">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Personal Thresholds:</span>
              <div className="flex gap-3">
                <span className="text-yellow-600">Warning: {formatCurrency(warningThreshold)}</span>
                <span className="text-red-600">Critical: {formatCurrency(criticalThreshold)}</span>
              </div>
            </div>
            {isSuperAdmin && (
              <div className="mt-1 text-xs text-blue-600">
                💡 These thresholds can be customized in Admin Credits
              </div>
            )}
          </div>
        )}

        {/* Auto System Status - Only when active */}
        {(processingCalls.length > 0 || recentDeductions.length > 0 || processedCallsCount > 0) && (
          <div className="mb-3 p-2 bg-blue-50 rounded-md border border-blue-200">
            <div className="flex items-center gap-1 mb-1">
              <Zap className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Auto System Active</span>
              {debugInfo.usingRPCFunction && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                  RPC
                </Badge>
              )}
            </div>
            
            <div className="space-y-1 text-xs text-blue-600">
              {processingCalls.length > 0 && (
                <div>🔄 Processing {processingCalls.length} calls...</div>
              )}
              
              {processedCallsCount > 0 && (
                <div>✅ {processedCallsCount} calls processed automatically</div>
              )}
              
              {recentDeductions.length > 0 && (
                <div>
                  <div className="font-medium">Recent deductions:</div>
                  {recentDeductions.slice(0, 2).map((deduction, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{deduction.callId.substring(0, 8)}...</span>
                      <span>-{formatCurrency(deduction.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-1 border-t border-blue-200 text-xs text-blue-500">
                🔗 Connected to Admin Credits via {debugInfo.usingRPCFunction}
              </div>
            </div>
          </div>
        )}

        {/* Compact Footer */}
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Updated: {lastUpdate.toLocaleTimeString()}
          </div>
          
          <Button
            onClick={handleRequestRecharge}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isBlocked}
          >
            <DollarSign className="h-3 w-3 mr-1" />
            {isBlocked ? 'Blocked' : 'Request Recharge'}
          </Button>
        </div>

        {/* Compact Debug Info for Super Admin */}
        {isSuperAdmin && debugInfo && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
              className="w-full text-xs border-gray-300 hover:bg-gray-50"
            >
              <Eye className="h-3 w-3 mr-1" />
              {showDebug ? 'Hide' : 'Show'} Debug (Super Admin)
            </Button>
            
            {showDebug && (
              <div className="mt-2 p-2 bg-gray-100 rounded-md border border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-1">🔧 Debug Info:</div>
                <div className="text-xs text-gray-600 space-y-1 grid grid-cols-2 gap-1">
                  <div>✅ Table: user_credits</div>
                  <div>✅ RPC: {debugInfo.usingRPCFunction}</div>
                  <div>Agents: {userAgents.length}</div>
                  <div>Polling: {debugInfo.isPollingActive ? '🟢' : '🔴'}</div>
                  <div>Processed: {debugInfo.processedCalls.length}</div>
                  <div>Status: {isBlocked ? '🚫' : '✅'}</div>
                  <div>W: ${warningThreshold}</div>
                  <div>C: ${criticalThreshold}</div>
                </div>
                {debugInfo.processedCalls.length > 0 && (
                  <div className="mt-2 max-h-16 overflow-y-auto">
                    <div className="font-medium text-xs mb-1">Recent processed:</div>
                    <div className="space-y-1">
                      {debugInfo.processedCalls.slice(0, 3).map((callId, index) => (
                        <div key={index} className="text-xs font-mono bg-white/50 p-1 rounded">
                          {callId.substring(0, 16)}...
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
    </Card>
  );
};
