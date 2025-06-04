
import { useCallCreditDeduction } from '@/hooks/useCallCreditDeduction';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CallCompletionData {
  callId: string;
  userId: string;
  cost: number;
  duration: number;
  agentId?: string;
  status: string;
}

export class CallCreditService {
  private static instance: CallCreditService;
  
  public static getInstance(): CallCreditService {
    if (!CallCreditService.instance) {
      CallCreditService.instance = new CallCreditService();
    }
    return CallCreditService.instance;
  }

  async processCallCompletion(callData: CallCompletionData): Promise<boolean> {
    try {
      console.log(`Processing call completion for ${callData.callId}, cost: $${callData.cost}`);

      // Only process completed calls that have a cost
      if (callData.status !== 'completed' || callData.cost <= 0) {
        console.log('Skipping credit deduction - call not completed or no cost');
        return true;
      }

      // Get user's current balance
      const { data: credits, error: balanceError } = await supabase
        .from('user_credits')
        .select('current_balance, is_blocked')
        .eq('user_id', callData.userId)
        .single();

      if (balanceError || !credits) {
        console.error('Failed to fetch user balance:', balanceError);
        return false;
      }

      if (credits.is_blocked) {
        console.log('User account is blocked, cannot process charges');
        return false;
      }

      const newBalance = credits.current_balance - callData.cost;
      const shouldBlock = newBalance <= 0;

      // Update balance
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ 
          current_balance: Math.max(0, newBalance), // Don't allow negative balance
          is_blocked: shouldBlock,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', callData.userId);

      if (updateError) {
        console.error('Failed to update user balance:', updateError);
        return false;
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: callData.userId,
          amount: -callData.cost,
          transaction_type: 'call_charge',
          description: `Call charge for ${callData.callId} (${Math.round(callData.duration)}s)`,
          call_id: callData.callId,
          balance_after: Math.max(0, newBalance)
        });

      if (transactionError) {
        console.error('Failed to create transaction record:', transactionError);
        // Don't fail the process if transaction logging fails
      }

      console.log(`Call credit processing completed. New balance: $${Math.max(0, newBalance).toFixed(2)}`);
      return true;

    } catch (error) {
      console.error('Error processing call completion:', error);
      return false;
    }
  }

  async checkPreCallBalance(userId: string, estimatedCost: number): Promise<boolean> {
    try {
      const { data: credits, error } = await supabase
        .from('user_credits')
        .select('current_balance, is_blocked')
        .eq('user_id', userId)
        .single();

      if (error || !credits) {
        toast.error('Unable to verify account balance. Please try again.');
        return false;
      }

      if (credits.is_blocked) {
        toast.error('Your account is blocked. Please contact support to reactivate.');
        return false;
      }

      if (credits.current_balance < estimatedCost) {
        toast.error(`Insufficient balance. You need $${estimatedCost.toFixed(2)} but only have $${credits.current_balance.toFixed(2)}.`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking pre-call balance:', error);
      toast.error('Unable to verify account balance. Please try again.');
      return false;
    }
  }
}

export const callCreditService = CallCreditService.getInstance();
