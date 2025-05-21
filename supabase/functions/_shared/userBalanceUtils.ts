
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

// Get or create user balance
export async function getUserBalance(supabaseClient: any, userId: string, companyId: string) {
  const { data: userBalance, error: balanceError } = await supabaseClient
    .from('user_balances')
    .select('id, balance, warning_threshold')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (balanceError) {
    console.error('Error checking user balance:', balanceError);
  }

  // Create balance if it doesn't exist
  if (!userBalance) {
    const { data: newBalance, error: createBalanceError } = await supabaseClient
      .from('user_balances')
      .insert({
        user_id: userId,
        company_id: companyId,
        balance: 50, // Start with $50 for demonstration
        warning_threshold: 10
      })
      .select()
      .single();

    if (createBalanceError) {
      console.error('Error creating user balance:', createBalanceError);
      return { error: createBalanceError };
    }
    
    return { 
      balanceId: newBalance.id, 
      balance: newBalance.balance, 
      warningThreshold: newBalance.warning_threshold 
    };
  }

  return { 
    balanceId: userBalance.id, 
    balance: userBalance.balance, 
    warningThreshold: userBalance.warning_threshold || 10 
  };
}

// Update user balance
export async function updateUserBalance(
  supabaseClient: any, 
  balanceId: string, 
  newBalance: number
) {
  const { error: balanceUpdateError } = await supabaseClient
    .from('user_balances')
    .update({ 
      balance: newBalance,
      last_updated: new Date().toISOString()
    })
    .eq('id', balanceId);

  if (balanceUpdateError) {
    console.error('Error updating user balance:', balanceUpdateError);
    return { error: balanceUpdateError };
  }

  return { success: true };
}

// Record transactions
export async function recordTransactions(
  supabaseClient: any, 
  transactions: Array<{
    user_id: string;
    company_id: string;
    amount: number;
    transaction_type: string;
    description: string;
    call_id?: string;
  }>
) {
  if (!transactions || transactions.length === 0) {
    return { success: true };
  }
  
  const { error: transactionError } = await supabaseClient
    .from('transactions')
    .insert(transactions);

  if (transactionError) {
    console.error('Error recording transactions:', transactionError);
    return { error: transactionError };
  }

  return { success: true };
}
