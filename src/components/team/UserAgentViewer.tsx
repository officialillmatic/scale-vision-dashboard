
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useAgents } from '@/hooks/useAgents';
import { AgentsTable } from './AgentsTable';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info, PhoneCall } from 'lucide-react';
import { useUserBalance } from '@/hooks/useUserBalance';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function UserAgentViewer() {
  const { company } = useAuth();
  const navigate = useNavigate();
  
  const {
    agents,
    isLoadingAgents,
  } = useAgents();

  const {
    balance,
    isLoading: isLoadingBalance,
    remainingMinutes,
    isLowBalance
  } = useUserBalance();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Balance Summary */}
      {!isLoadingBalance && balance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className={isLowBalance ? "border-amber-400" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Your Current Balance</p>
                  <h3 className="text-2xl font-bold mt-1">{formatCurrency(balance.balance)}</h3>
                </div>
                <div className={`p-3 rounded-full ${isLowBalance ? 'bg-amber-100' : 'bg-green-100'}`}>
                  <PhoneCall className={`h-5 w-5 ${isLowBalance ? 'text-amber-500' : 'text-green-500'}`} />
                </div>
              </div>
              
              {isLowBalance && (
                <Alert variant="warning" className="mt-3 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
                    Your balance is running low. This may impact your ability to make calls.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">Approximate Minutes Remaining: <span className="font-medium text-foreground">{remainingMinutes}</span></p>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 px-6 py-3 flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Need more funds? Contact your administrator.
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate('/analytics')}>
                View Usage
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
      
      {/* User View - Only Assigned Agents */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Your AI Agents</h2>
        </div>
        
        <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            AI agents handle your calls and customer interactions. They've been configured and assigned specifically for your use.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardContent className="p-0">
            {isLoadingAgents ? (
              <div className="p-6 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              agents.length > 0 ? (
                <AgentsTable
                  agents={agents}
                  isLoading={isLoadingAgents}
                  isAdmin={false}
                  showRates={false}
                />
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <p>You don't have any agents assigned to you yet.</p>
                  <p className="mt-1 text-sm">Please contact your administrator to get access to AI agents.</p>
                </div>
              )
            )}
          </CardContent>
          {agents.length > 0 && (
            <CardFooter className="bg-muted/50 px-6 py-3 text-sm text-muted-foreground">
              These agents are assigned to you by your administrator. Contact them for any changes or issues.
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
