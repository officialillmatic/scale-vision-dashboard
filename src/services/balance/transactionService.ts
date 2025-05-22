
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandling";
import { Transaction } from './balanceBaseService';

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
 * Record a transaction 
 */
export const recordTransaction = async (
  userId: string,
  companyId: string,
  amount: number,
  transactionType: 'deposit' | 'deduction' | 'adjustment',
  description?: string,
  callId?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        company_id: companyId,
        amount: Math.abs(amount),
        transaction_type: transactionType,
        description: description || null,
        call_id: callId || null
      });
    
    if (error) throw error;
    return true;
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to record transaction"
    });
    return false;
  }
};
