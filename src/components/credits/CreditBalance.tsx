import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
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
  Shield,
  Info
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatCurrency } from '@/lib/formatters';

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
      
      const { data, error: fetchError } = await supabase.rpc('get_user_credits', {
        target_user_id: user.id
      });

      console.log('Credits fetch result:', { data, fetchError });

      if (fetchError) {
        console.error('Error fetching user credits:', fetchError);
        setError(`Error loading balance: ${fetchError.message}`);
      } else if (data) {
        setCredits({
          id: data.id || '',
          current_balance: data.current_balance || 0,
          warning_threshold: data.warning_threshold || 10,
          critical_threshold: data.critical_threshold || 5,
          is_blocked: data.is_blocked || false,
          updated_at: data.updated_at || new Date().toISOString()
        });
        console.log('Credits loaded successfully:', data);
      } else {
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

  const handleRefresh = () => {
    fetchCredits();
  };

  const status = getBalanceStatus();
  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  if (loading) {
    return (
      <Card className="border border-black">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-3">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-muted-foreground">Loading balance...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-black">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
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

  return (
    <Card className="border border-black bg-white">
      <CardContent className="p-8">
        <div className="space-y-6">
          {/* TOP ROW - Main Elements */}
          <div className="flex items-center justify-between">
            {/* Left: Account Balance Title + Amount + Badge */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-white shadow-sm border">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Account Balance</h3>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <p className={`text-3xl font-bold ${config.balanceColor}`}>
                  {credits ? formatCurrency(credits.current_balance) : '$0.00'}
                </p>
                <IconComponent className={`h-7 w-7 ${config.iconColor}`} />
                <Badge variant={config.badge.variant} className="text-sm font-medium px-3 py-1">
                  {config.badge.text}
                </Badge>
              </div>
            </div>

            {/* Center: Action Buttons */}
            {showActions && (
              <div className="flex items-center space-x-3">
                {onRequestRecharge && (
                  <Button 
                    onClick={onRequestRecharge}
                    variant={status === 'empty' || status === 'critical' ? 'default' : 'outline'}
                    size="sm"
                    className="px-4 py-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {status === 'empty' ? 'Add Funds' : 'Request Recharge'}
                  </Button>
                )}
                
                {(status === 'warning' || status === 'critical' || status === 'empty') && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      alert('Please contact support to recharge your account: support@drscale.com');
                    }}
                    className="px-4 py-2"
                  >
                    Contact Support
                  </Button>
                )}
              </div>
            )}

            {/* Right: Account Thresholds + Timestamp + Refresh */}
            <div className="flex items-center space-x-6">
              {/* Account Thresholds */}
              {credits && (
                <div className="border-l border-gray-200 pl-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Account Thresholds</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Warning:</span>
                      <span className="font-medium text-yellow-700 ml-3">
                        {formatCurrency(credits.warning_threshold)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Critical:</span>
                      <span className="font-medium text-orange-700 ml-3">
                        {formatCurrency(credits.critical_threshold)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Updated + Refresh Button */}
              {credits && (
                <div className="flex items-center space-x-3 border-l border-gray-200 pl-6">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                    <p className="text-xs font-medium">
                      {new Date(credits.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <Button 
                    onClick={handleRefresh} 
                    variant="ghost" 
                    size="sm"
                    disabled={refreshing}
                    className="h-8 w-8 p-0"
                  >
                    {refreshing ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM ROW - Secondary Information */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-center space-x-8 text-center">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  {config.message}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-1 w-1 bg-gray-300 rounded-full"></div>
                <p className="text-xs text-muted-foreground">
                  Available for calls
                </p>
              </div>
              {credits && credits.current_balance > 0 && (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="h-1 w-1 bg-gray-300 rounded-full"></div>
                    <p className="text-xs text-muted-foreground">
                      Estimated {Math.floor(credits.current_balance / 0.02)} minutes remaining
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
