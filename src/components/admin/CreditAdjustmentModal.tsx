
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, Plus, Minus } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface CreditAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  onSuccess: () => void;
}

export function CreditAdjustmentModal({
  open,
  onOpenChange,
  userId,
  onSuccess
}: CreditAdjustmentModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (isPositive: boolean) => {
    if (!userId || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    const finalAmount = isPositive ? numericAmount : -numericAmount;

    setIsLoading(true);
    try {
      console.log('Calling admin_update_user_credits with:', {
        target_user_id: userId,
        amount_change: finalAmount,
        description_text: description || `Admin balance ${isPositive ? 'credit' : 'debit'}: ${Math.abs(finalAmount)}`
      });

      const { data, error } = await supabase.rpc('admin_update_user_credits', {
        target_user_id: userId,
        amount_change: finalAmount,
        description_text: description || `Admin balance ${isPositive ? 'credit' : 'debit'}: ${Math.abs(finalAmount)}`
      });

      console.log('admin_update_user_credits response:', { data, error });

      if (error) {
        console.error('Credit adjustment error:', error);
        toast.error(`Failed to adjust credits: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        const result = data[0];
        console.log('Result from function:', result);
        
        if (result.success) {
          toast.success(`Credits ${isPositive ? 'added' : 'deducted'} successfully. New balance: $${result.new_balance}`);
          onSuccess();
          onOpenChange(false);
          setAmount('');
          setDescription('');
        } else {
          toast.error(`Failed to adjust credits: ${result.message}`);
        }
      } else {
        toast.success(`Credits ${isPositive ? 'added' : 'deducted'} successfully`);
        onSuccess();
        onOpenChange(false);
        setAmount('');
        setDescription('');
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error(`Failed to adjust credits: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Adjust User Credits (Temporary Function)
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Reason for adjustment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => handleSubmit(true)}
              disabled={isLoading || !amount}
              className="flex-1"
              variant="default"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Credits
                </>
              )}
            </Button>
            
            <Button
              onClick={() => handleSubmit(false)}
              disabled={isLoading || !amount}
              className="flex-1"
              variant="destructive"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Minus className="h-4 w-4 mr-2" />
                  Deduct Credits
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
