
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandling";

export interface UserBalance {
  id: string;
  user_id: string;
  company_id: string;
  balance: number;
  last_updated: Date;
  created_at: Date;
  warning_threshold: number | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  company_id: string;
  amount: number;
  transaction_type: 'deposit' | 'deduction' | 'adjustment';
  description: string | null;
  call_id: string | null;
  created_at: Date;
}

/**
 * Get the current balance for a user in a company
 */
export const getUserBalance = async (userId: string, companyId: string): Promise<UserBalance | null> => {
  try {
    const { data, error } = await supabase
      .from("user_balances")
      .select("*")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      // Create a balance entry if it doesn't exist
      return createUserBalance(userId, companyId);
    }

    return {
      ...data,
      last_updated: new Date(data.last_updated),
      created_at: new Date(data.created_at),
    };
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to fetch user balance",
      showToast: false
    });
    return null;
  }
};

/**
 * Create a new balance entry for a user in a company
 */
const createUserBalance = async (userId: string, companyId: string, initialBalance = 0): Promise<UserBalance | null> => {
  try {
    const { data, error } = await supabase
      .from("user_balances")
      .insert({
        user_id: userId,
        company_id: companyId,
        balance: initialBalance
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return {
      ...data,
      last_updated: new Date(data.last_updated),
      created_at: new Date(data.created_at),
    };
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to create user balance",
      showToast: false
    });
    return null;
  }
};

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
      const { error: insertError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          company_id: companyId,
          amount: Math.abs(amount),
          transaction_type: transactionType,
          description: description || null,
          call_id: callId || null
        });
      
      if (insertError) throw insertError;
      
      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) throw commitError;
      
      if (transactionType === 'deposit') {
        toast.success(`Successfully added $${amount.toFixed(2)} to user balance`);
      } else if (transactionType === 'deduction') {
        console.log(`Deducted $${amount.toFixed(2)} from user balance for service usage`);
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
 * Get transaction history for a user or company
 */
export const getTransactionHistory = async (
  userId?: string,
  companyId?: string,
  limit = 20
): Promise<Transaction[]> => {
  try {
    let query = supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (userId) {
      query = query.eq("user_id", userId);
    }
    
    if (companyId) {
      query = query.eq("company_id", companyId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return data.map(transaction => ({
      ...transaction,
      created_at: new Date(transaction.created_at)
    }));
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to fetch transaction history",
      showToast: false
    });
    return [];
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

/**
 * Calculate estimated remaining minutes based on current balance and rate
 */
export const calculateRemainingMinutes = (
  balance: number,
  ratePerMinute = 0.02
): number => {
  return Math.floor(balance / ratePerMinute);
};

/**
 * Calculate call cost based on duration and rate
 */
export const calculateCallCost = (
  durationSec: number,
  ratePerMinute = 0.02
): number => {
  const durationMin = durationSec / 60;
  return parseFloat((durationMin * ratePerMinute).toFixed(4));
};
