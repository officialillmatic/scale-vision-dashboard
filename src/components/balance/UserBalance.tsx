
import React from 'react';
import { useUserBalance } from '@/hooks/useUserBalance.tsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Coins, Clock3, Calendar, Info } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatCurrency } from '@/lib/formatters';
import { useRole } from '@/hooks/useRole';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UserBalanceProps {
  className?: string;
}

export const UserBalance: React.FC<UserBalanceProps> = ({ className }) => {
  const {
    balance,
    remainingMinutes,
    isLowBalance,
    isLoading,
    transactions
  } = useUserBalance();

  const { isCompanyOwner, checkRole } = useRole();
  const isAdmin = isCompanyOwner || checkRole('admin');

  const recentTransactions = transactions?.slice(0, 3) || [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Your Balance</CardTitle>
          <CardDescription>Loading balance information...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  // Warning level for progress bar
  const warningLevel = balance?.warning_threshold ? balance.warning_threshold / (balance.warning_threshold * 2) * 100 : 25;
  const balancePercent = balance?.warning_threshold ? 
    Math.min(100, (balance.balance / (balance.warning_threshold * 2)) * 100) : 
    balance?.balance ? Math.min(100, (balance.balance / 50) * 100) : 0;

  // Calculate usage statistics
  const currentMonthCalls = transactions?.filter(tx => 
    tx.transaction_type === 'deduction' && 
    new Date(tx.created_at).getMonth() === new Date().getMonth()
  ) || [];
  
  const currentMonthUsage = currentMonthCalls.reduce((sum, tx) => sum + tx.amount, 0);
  const currentMonthCallCount = currentMonthCalls.length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Your Balance</CardTitle>
            <CardDescription>Current funds available for calls</CardDescription>
          </div>
          <Coins className="h-8 w-8 text-primary opacity-80" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <div className="text-3xl font-bold">
              {formatCurrency(balance?.balance || 0)}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              <span>{remainingMinutes} estimated minutes remaining</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Balance</span>
              {isLowBalance && (
                <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  Low balance
                </span>
              )}
            </div>
            <Progress 
              value={balancePercent} 
              className={`h-2 ${isLowBalance ? 'bg-amber-100 dark:bg-amber-950' : ''}`}
            />
          </div>
          
          {!isAdmin && (
            <Alert variant="default" className="mt-2 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Payments are handled outside of this platform. Please contact your administrator to add funds to your account.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Current Month Usage Summary */}
          <div className="mt-2 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Current Month Usage
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                <div className="text-xs text-gray-500 dark:text-gray-400">Calls Made</div>
                <div className="text-lg font-medium">{currentMonthCallCount}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Cost</div>
                <div className="text-lg font-medium">{formatCurrency(currentMonthUsage)}</div>
              </div>
            </div>
          </div>

          {recentTransactions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Recent Transactions</h4>
              <div className="space-y-2">
                {recentTransactions.map(transaction => (
                  <div key={transaction.id} className="flex justify-between text-sm">
                    <div className="text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString()}
                      {transaction.description && ` - ${transaction.description.substring(0, 20)}...`}
                    </div>
                    <div className={transaction.transaction_type === 'deposit' ? 'text-green-600 dark:text-green-400' : ''}>
                      {transaction.transaction_type === 'deposit' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      {isLowBalance && (
        <CardFooter className="bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
          <p>Your balance is low. Please contact your administrator to add funds.</p>
        </CardFooter>
      )}
    </Card>
  );
};
