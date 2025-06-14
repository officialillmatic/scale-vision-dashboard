import { debugLog } from "@/lib/debug";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandling";
import { getUserBalance } from './balanceBaseService';
import { recordTransaction } from './transactionService';

/**
 * Update a user's balance and record the transaction
 */
export const updateUserBalance = async (
  userId: string,
  companyId: string,
  amount: number,
  transactionType: 'deposit' | 'deduction' | 'adjustment',
  description?: string,
  callId?: string
): Promise<boolean> => {
  try {
    // Start a transaction
    const { error: transactionError } = await supabase.rpc('begin_transaction');
    if (transactionError) throw transactionError;

    try {
      // First, ensure the user has a balance entry
      const currentBalance = await getUserBalance(userId, companyId);
      
      if (!currentBalance) {
        throw new Error("Could not retrieve or create user balance");
      }
      
      // Calculate the new balance
      const newBalance = transactionType === 'deduction' 
        ? Number(currentBalance.balance) - Math.abs(amount) 
        : Number(currentBalance.balance) + Math.abs(amount);
      
      // Update the balance
      const { error: updateError } = await supabase
        .from("user_balances")
        .update({ 
          balance: newBalance,
          last_updated: new Date().toISOString()
        })
        .eq("user_id", userId)
        .eq("company_id", companyId);
      
      if (updateError) throw updateError;
      
      // Record the transaction
      const success = await recordTransaction(
        userId,
        companyId,
        Math.abs(amount),
        transactionType,
        description,
        callId
      );
      
      if (!success) throw new Error("Failed to record transaction");
      
      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) throw commitError;
      
      if (transactionType === 'deposit') {
        toast.success(`Successfully added $${amount.toFixed(2)} to user balance`);
      } else if (transactionType === 'deduction') {
        debugLog(`Deducted $${amount.toFixed(2)} from user balance for service usage`);
      } else {
        toast.success(`Successfully adjusted user balance by $${amount.toFixed(2)}`);
      }
      
      return true;
    } catch (error) {
      // Rollback on any error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to update user balance",
    });
    return false;
  }
};

/**
 * Check if a user has sufficient balance for a specific operation
 */
export const hasSufficientBalance = async (
  userId: string, 
  companyId: string, 
  requiredAmount: number
): Promise<boolean> => {
  try {
    const balance = await getUserBalance(userId, companyId);
    return balance ? balance.balance >= requiredAmount : false;
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to check user balance",
      showToast: false
    });
    return false;
  }
};
