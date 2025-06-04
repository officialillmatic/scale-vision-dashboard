
import React, { useState } from 'react';
import { useCallCreditDeduction } from '@/hooks/useCallCreditDeduction';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Phone, DollarSign } from 'lucide-react';

interface CallCreditGuardProps {
  estimatedDuration?: number; // in seconds
  ratePerMinute?: number;
  onCallApproved: () => void;
  children: React.ReactNode;
}

export function CallCreditGuard({ 
  estimatedDuration = 120, // 2 minutes default
  ratePerMinute = 0.02,
  onCallApproved,
  children 
}: CallCreditGuardProps) {
  const { user } = useAuth();
  const { checkSufficientBalance, estimateCallCost, getBalanceStatus } = useCallCreditDeduction();
  const [isChecking, setIsChecking] = useState(false);
  const [balanceStatus, setBalanceStatus] = useState<any>(null);

  const estimatedCost = estimateCallCost(estimatedDuration, ratePerMinute);

  const handleCallAttempt = async () => {
    if (!user?.id) {
      return;
    }

    setIsChecking(true);
    
    try {
      // Check balance status
      const status = await getBalanceStatus();
      setBalanceStatus(status);

      if (!status) {
        return;
      }

      if (status.isBlocked) {
        return; // Toast will be shown by the hook
      }

      // Check if sufficient balance for estimated call
      const hasSufficientBalance = await checkSufficientBalance(estimatedCost);
      
      if (hasSufficientBalance) {
        onCallApproved();
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Show warning if balance is low but not blocked
  const showBalanceWarning = balanceStatus && !balanceStatus.isBlocked && (balanceStatus.isLow || balanceStatus.isCritical);

  return (
    <div className="space-y-4">
      {showBalanceWarning && (
        <Alert variant={balanceStatus.isCritical ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {balanceStatus.isCritical 
              ? `Critical balance warning! You have $${balanceStatus.balance.toFixed(2)} remaining.`
              : `Low balance warning! You have $${balanceStatus.balance.toFixed(2)} remaining.`
            }
            {` Estimated cost for this call: $${estimatedCost.toFixed(4)}`}
          </AlertDescription>
        </Alert>
      )}

      {balanceStatus?.isBlocked ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your account is blocked due to insufficient funds. Please contact support to recharge your account.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>
              Estimated cost: ${estimatedCost.toFixed(4)} 
              ({Math.round(estimatedDuration / 60)} min @ ${ratePerMinute}/min)
            </span>
          </div>
          
          <Button 
            onClick={handleCallAttempt}
            disabled={isChecking || balanceStatus?.isBlocked}
            className="w-full"
          >
            {isChecking ? (
              'Checking Balance...'
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Start Call
              </>
            )}
          </Button>
        </div>
      )}

      {children}
    </div>
  );
}
