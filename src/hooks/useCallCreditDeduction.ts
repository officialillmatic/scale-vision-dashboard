
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CallCostData {
  callId: string;
  cost: number;
  duration: number;
  agentId?: string;
}

interface CreditDeductionResult {
  success: boolean;
  remainingBalance: number;
  error?: string;
}

export function useCallCreditDeduction() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const checkSufficientBalance = useCallback(async (requiredAmount: number): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data: credits, error } = await supabase
        .from('user_credits')
        .select('current_balance, is_blocked')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking balance:', error);
        return false;
      }

      if (!credits) {
        toast.error('No credit account found. Please contact support.');
        return false;
      }

      if (credits.is_blocked) {
        toast.error('Account is blocked. Please contact support to reactivate.');
        return false;
      }

      if (credits.current_balance < requiredAmount) {
        toast.error(`Insufficient balance. You need $${requiredAmount.toFixed(2)} but only have $${credits.current_balance.toFixed(2)}.`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in balance check:', error);
      return false;
    }
  }, [user?.id]);

  const deductCredits = useCallback(async (callCostData: CallCostData): Promise<CreditDeductionResult> => {
    if (!user?.id) {
      return { success: false, remainingBalance: 0, error: 'User not authenticated' };
    }

    setIsProcessing(true);

    try {
      // Start a transaction
      const { data: currentCredits, error: fetchError } = await supabase
        .from('user_credits')
        .select('current_balance, warning_threshold, critical_threshold, is_blocked')
        .eq('user_id', user.id)
        .single();

      if (fetchError || !currentCredits) {
        throw new Error('Failed to fetch current balance');
      }

      if (currentCredits.is_blocked) {
        return { 
          success: false, 
          remainingBalance: currentCredits.current_balance, 
          error: 'Account is blocked' 
        };
      }

      if (currentCredits.current_balance < callCostData.cost) {
        return { 
          success: false, 
          remainingBalance: currentCredits.current_balance, 
          error: 'Insufficient balance' 
        };
      }

      const newBalance = currentCredits.current_balance - callCostData.cost;
      const shouldBlock = newBalance <= 0;

      // Update user balance
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ 
          current_balance: newBalance,
          is_blocked: shouldBlock,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error('Failed to update balance');
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: -callCostData.cost, // Negative for deduction
          transaction_type: 'call_charge',
          description: `Call charge for ${callCostData.callId} (${Math.round(callCostData.duration)}s)`,
          call_id: callCostData.callId,
          balance_after: newBalance
        });

      if (transactionError) {
        console.error('Failed to create transaction record:', transactionError);
        // Don't fail the deduction if transaction logging fails
      }

      // Show appropriate warnings
      if (shouldBlock) {
        toast.error('Your account has been blocked due to insufficient funds. Please contact support to recharge.');
      } else if (newBalance <= currentCredits.critical_threshold) {
        toast.warning(`Critical balance warning! You have $${newBalance.toFixed(2)} remaining. Please recharge immediately.`);
      } else if (newBalance <= currentCredits.warning_threshold) {
        toast.warning(`Low balance warning! You have $${newBalance.toFixed(2)} remaining. Consider recharging soon.`);
      }

      console.log(`Credits deducted successfully: $${callCostData.cost.toFixed(2)}. Remaining balance: $${newBalance.toFixed(2)}`);

      return { 
        success: true, 
        remainingBalance: newBalance 
      };

    } catch (error: any) {
      console.error('Error deducting credits:', error);
      toast.error('Failed to process call charges. Please contact support.');
      return { 
        success: false, 
        remainingBalance: 0, 
        error: error.message 
      };
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id]);

  const estimateCallCost = useCallback((durationSeconds: number, ratePerMinute: number = 0.02): number => {
    const minutes = durationSeconds / 60;
    return minutes * ratePerMinute;
  }, []);

  const getBalanceStatus = useCallback(async () => {
    if (!user?.id) return null;

    try {
      const { data: credits, error } = await supabase
        .from('user_credits')
        .select('current_balance, warning_threshold, critical_threshold, is_blocked')
        .eq('user_id', user.id)
        .single();

      if (error || !credits) {
        return null;
      }

      return {
        balance: credits.current_balance,
        isBlocked: credits.is_blocked,
        isLow: credits.current_balance <= credits.warning_threshold,
        isCritical: credits.current_balance <= credits.critical_threshold,
        warningThreshold: credits.warning_threshold,
        criticalThreshold: credits.critical_threshold
      };
    } catch (error) {
      console.error('Error fetching balance status:', error);
      return null;
    }
  }, [user?.id]);

  return {
    checkSufficientBalance,
    deductCredits,
    estimateCallCost,
    getBalanceStatus,
    isProcessing
  };
}
