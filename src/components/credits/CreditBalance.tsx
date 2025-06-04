
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Wallet, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface UserCredit {
  id: string;
  current_balance: number;
  warning_threshold: number;
  critical_threshold: number;
  is_blocked: boolean;
  updated_at: string;
}

interface CreditBalanceProps {
  onRequestRecharge?: () => void;
  showActions?: boolean;
}

export function CreditBalance({ onRequestRecharge, showActions = true }: CreditBalanceProps) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCredits = async () => {
    if (!user?.id) return;

    try {
      setRefreshing(true);
      setError(null);
      
      console.log('Fetching credits for user:', user.id);
      
      // Use the new secure database function
      const { data, error: fetchError } = await supabase.rpc('get_user_credits', {
        target_user_id: user.id
      });

      console.log('Credits fetch result:', { data, fetchError });

      if (fetchError) {
        console.error('Error fetching user credits:', fetchError);
        setError(`Error loading balance: ${fetchError.message}`);
      } else if (data && data.length > 0) {
        const creditData = data[0];
        setCredits({
          id: creditData.id,
          current_balance: creditData.current_balance,
          warning_threshold: creditData.warning_threshold,
          critical_threshold: creditData.critical_threshold,
          is_blocked: creditData.is_blocked,
          updated_at: creditData.updated_at
        });
        console.log('Credits loaded successfully:', creditData);
      } else {
        // No data returned, this should not happen with the new function as it auto-creates records
        console.warn('No credit data returned from function');
        setCredits({
          id: '',
          current_balance: 0,
          warning_threshold: 10,
          critical_threshold: 5,
          is_blocked: false,
          updated_at: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error('Unexpected error fetching credits:', err);
      setError('Unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [user?.id]);

  const getBalanceStatus = () => {
    if (!credits) return 'unknown';
    
    if (credits.current_balance <= 0) return 'empty';
    if (credits.current_balance <= credits.critical_threshold) return 'critical';
    if (credits.current_balance <= credits.warning_threshold) return 'warning';
    return 'healthy';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'empty':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertCircle,
          iconColor: 'text-red-600',
          bgGradient: 'from-red-50 to-red-100/50',
          message: 'Account blocked - No funds available',
          priority: 'high'
        };
      case 'critical':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: AlertTriangle,
          iconColor: 'text-orange-600',
          bgGradient: 'from-orange-50 to-orange-100/50',
          message: 'Critical - Low balance!',
          priority: 'high'
        };
      case 'warning':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: TrendingDown,
          iconColor: 'text-yellow-600',
          bgGradient: 'from-yellow-50 to-yellow-100/50',
          message: 'Warning - Consider recharging',
          priority: 'medium'
        };
      case 'healthy':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          iconColor: 'text-green-600',
          bgGradient: 'from-green-50 to-green-100/50',
          message: 'Account in good standing',
          priority: 'low'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Wallet,
          iconColor: 'text-gray-600',
          bgGradient: 'from-gray-50 to-gray-100/50',
          message: 'Loading balance...',
          priority: 'low'
        };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleRefresh = () => {
    fetchCredits();
  };

  const status = getBalanceStatus();
  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  if (loading) {
    return (
      <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-gray-600">Loading balance...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Error loading balance</p>
              <p className="text-xs text-red-500">{error}</p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-0 shadow-sm bg-gradient-to-br ${config.bgGradient} ${credits?.is_blocked ? 'ring-2 ring-red-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            Account Balance
          </CardTitle>
          <Button 
            onClick={handleRefresh} 
            variant="ghost" 
            size="sm"
            disabled={refreshing}
            className="h-6 w-6 p-0"
          >
            {refreshing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Balance Amount */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {credits ? formatCurrency(credits.current_balance) : '$0.00'}
              </p>
              <p className="text-sm text-gray-500">
                Available for calls
              </p>
            </div>
            <IconComponent className={`h-10 w-10 ${config.iconColor}`} />
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${config.color}`}>
              {config.message}
            </Badge>
            {credits?.is_blocked && (
              <Badge className="text-xs bg-red-100 text-red-800 border-red-200">
                🚫 BLOCKED
              </Badge>
            )}
          </div>

          {/* Thresholds Info */}
          {credits && (
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Warning at:</span>
                <span className="font-medium">{formatCurrency(credits.warning_threshold)}</span>
              </div>
              <div className="flex justify-between">
                <span>Critical at:</span>
                <span className="font-medium">{formatCurrency(credits.critical_threshold)}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {showActions && (
            <div className="flex gap-2 pt-2">
              {onRequestRecharge && (
                <Button 
                  onClick={onRequestRecharge}
                  variant={status === 'empty' || status === 'critical' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {status === 'empty' ? 'Add Funds' : 'Request Recharge'}
                </Button>
              )}
              
              {(status === 'warning' || status === 'critical' || status === 'empty') && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    // Show modal with contact information
                    alert('Please contact support to recharge your account: support@drscale.com');
                  }}
                >
                  Contact Support
                </Button>
              )}
            </div>
          )}

          {/* Last Updated */}
          {credits && (
            <p className="text-xs text-gray-400 text-center">
              Last updated: {new Date(credits.updated_at).toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
