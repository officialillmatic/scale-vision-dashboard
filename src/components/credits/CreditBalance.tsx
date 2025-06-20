// 💰 ULTRA COMPACT CREDIT BALANCE WITH REAL DEBUG
// Location: src/components/dashboard/CreditBalance.tsx
// ✅ ULTRA COMPACT: Inspired by working Admin panels + Real debugging

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
  CheckCircle,
  AlertCircle,
  DollarSign,
  Activity,
  Shield,
  Eye,
  Bug
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
    window.open('mailto:support@scaleai.com?subject=Credit Recharge Request', '_blank');
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

        {/* Compact Auto System Status - Only when active */}
        {(processingCalls.length > 0 || recentDeductions.length > 0 || processedCallsCount > 0) && (
          <div className="bg-blue-50 p-2 rounded text-xs mb-2">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 font-medium">Auto System Active</span>
              {debugInfo.usingRPCFunction && (
                <Badge variant="outline" className="text-xs">RPC</Badge>
              )}
            </div>
            {processingCalls.length > 0 && (
              <div className="text-blue-600">🔄 Processing {processingCalls.length} calls</div>
            )}
            {processedCallsCount > 0 && (
              <div className="text-blue-600">✅ {processedCallsCount} processed</div>
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
          
          <Button
            onClick={handleRequestRecharge}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-6"
            disabled={isBlocked}
          >
            <DollarSign className="h-3 w-3 mr-1" />
            {isBlocked ? 'Blocked' : 'Recharge'}
          </Button>
        </div>

        {/* REAL DEBUG SECTION - Always available for debugging */}
        <div className="mt-2 border-t pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="w-full text-xs h-6"
          >
            <Bug className="h-3 w-3 mr-1" />
            {showDebug ? 'Hide' : 'Show'} System Debug
          </Button>
            
            {showDebug && (
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs space-y-1">
                <div className="font-bold text-red-600">🚨 SYSTEM DEBUG (Regular User):</div>
                
                {/* Critical debugging info */}
                <div>User ID: {debugInfo.usingUserCreditsTable ? '✅' : '❌'}</div>
                <div>RPC Function: {debugInfo.usingRPCFunction || 'NONE'}</div>
                <div>Custom Agents: {debugInfo.customAgentsCount}</div>
                <div>External Agent IDs: {debugInfo.externalAgentIds?.length || 0}</div>
                <div>Polling Active: {debugInfo.isPollingActive ? '🟢 YES' : '🔴 NO'}</div>
                <div>Processed Calls: {debugInfo.processedCalls?.length || 0}</div>
                
                {/* Show external agent IDs */}
                {debugInfo.externalAgentIds && debugInfo.externalAgentIds.length > 0 && (
                  <div className="border-t pt-1">
                    <div className="font-medium">External Agent IDs:</div>
                    {debugInfo.externalAgentIds.map((id, index) => (
                      <div key={index} className="font-mono text-xs">{id}</div>
                    ))}
                  </div>
                )}
                
                {/* Show processed calls */}
                {debugInfo.processedCalls && debugInfo.processedCalls.length > 0 && (
                  <div className="border-t pt-1">
                    <div className="font-medium">Processed Calls:</div>
                    {debugInfo.processedCalls.slice(0, 3).map((callId, index) => (
                      <div key={index} className="font-mono text-xs">{callId.substring(0, 20)}...</div>
                    ))}
                  </div>
                )}

                {/* Critical status indicators */}
                <div className="border-t pt-1 space-y-1">
                  <div className="font-medium">System Status:</div>
                  <div>Balance Loading: {isLoading ? '🔄' : '✅'}</div>
                  <div>Agents Loaded: {userAgents.length > 0 ? '✅' : '❌'}</div>
                  <div>Currently Processing: {isProcessing ? '🔄' : '⏸️'}</div>
                  <div>Processing Queue: {processingCalls.length}</div>
                  <div>Recent Deductions: {recentDeductions.length}</div>
                </div>

                {/* Real-time status */}
                <div className="border-t pt-1 bg-yellow-50 p-1 rounded">
                  <div className="font-bold text-yellow-800">💡 NEXT STEPS TO DEBUG:</div>
                  <div className="text-yellow-700">
                    1. Make a test call with Test Agent<br/>
                    2. Wait for it to appear in "My Calls"<br/>
                    3. Watch console logs every 5 seconds<br/>
                    4. Check if polling finds the call<br/>
                    5. Verify agent ID matches
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
