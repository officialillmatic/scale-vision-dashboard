
import React from 'react';
import { useUserBalance } from '@/hooks/useUserBalance';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Coins, Clock3 } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatCurrency } from '@/lib/formatters';

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
              indicatorClassName={isLowBalance ? 'bg-amber-500' : ''}
            />
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
