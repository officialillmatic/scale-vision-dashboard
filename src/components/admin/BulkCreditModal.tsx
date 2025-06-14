import { debugLog } from "@/lib/debug";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Plus, Minus } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface BulkCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUserIds: string[];
  onSuccess: () => void;
}

export function BulkCreditModal({
  open,
  onOpenChange,
  selectedUserIds,
  onSuccess
}: BulkCreditModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (isPositive: boolean) => {
    if (selectedUserIds.length === 0 || !amount) {
      toast.error('Please select users and enter an amount');
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
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const userId of selectedUserIds) {
        try {
          debugLog(`Processing user ${userId} with amount ${finalAmount}`);
          
          const { data, error } = await supabase.rpc('admin_update_user_credits', {
            target_user_id: userId,
            amount_change: finalAmount,
            description_text: description || `Bulk admin ${isPositive ? 'credit' : 'debit'}: ${Math.abs(finalAmount)}`
          });

          debugLog(`User ${userId} result:`, { data, error });

          if (error) {
            errorCount++;
            errors.push(`User ${userId}: ${error.message}`);
          } else if (data && data.length > 0 && data[0].success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`User ${userId}: Update failed`);
          }
        } catch (err: any) {
          errorCount++;
          errors.push(`User ${userId}: ${err.message}`);
        }
      }

      debugLog(`Bulk operation completed: ${successCount} success, ${errorCount} errors`);

      if (errorCount === 0) {
        toast.success(`Successfully ${isPositive ? 'added' : 'deducted'} credits for ${successCount} users`);
      } else if (successCount > 0) {
        toast.warning(`Partially completed: ${successCount} succeeded, ${errorCount} failed`);
        debugLog('Errors:', errors);
      } else {
        toast.error(`All updates failed. First error: ${errors[0]}`);
        debugLog('All errors:', errors);
      }

      if (successCount > 0) {
        onSuccess();
        onOpenChange(false);
        setAmount('');
        setDescription('');
      }
    } catch (error: any) {
      console.error('Bulk credit adjustment error:', error);
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
            <Users className="h-5 w-5" />
            Bulk Credit Adjustment (Temporary Function)
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              This will affect <strong>{selectedUserIds.length}</strong> selected users
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Amount per user ($)</Label>
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
              placeholder="Reason for bulk adjustment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => handleSubmit(true)}
              disabled={isLoading || !amount || selectedUserIds.length === 0}
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
              disabled={isLoading || !amount || selectedUserIds.length === 0}
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
