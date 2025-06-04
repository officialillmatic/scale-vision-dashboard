
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader, Users, AlertTriangle } from 'lucide-react';

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
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !amount || selectedUserIds.length === 0) return;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_bulk_adjust_credits', {
        p_user_ids: selectedUserIds,
        p_amount: numericAmount,
        p_description: description || `Bulk balance adjustment: ${numericAmount > 0 ? '+' : ''}${numericAmount}`,
        p_admin_id: user.id
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Bulk operation completed successfully! Updated ${data.success_count} users.`);
        onSuccess();
        onOpenChange(false);
      } else {
        const errorMessage = data?.errors?.length > 0 
          ? `Completed with errors: ${data.success_count} successful, ${data.error_count} failed`
          : data?.error || 'Failed to complete bulk operation';
        
        if (data?.success_count > 0) {
          toast.warning(errorMessage);
          onSuccess();
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error: any) {
      toast.error(`Failed to perform bulk operation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
  };

  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Credit Adjustment
          </DialogTitle>
        </DialogHeader>
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This action will affect {selectedUserIds.length} selected users. Please review carefully before proceeding.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-amount">Amount ($)</Label>
            <Input
              id="bulk-amount"
              type="number"
              step="0.01"
              placeholder="Enter amount (positive to add, negative to deduct)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">
              This amount will be applied to all {selectedUserIds.length} selected users
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-description">Description</Label>
            <Textarea
              id="bulk-description"
              placeholder="Reason for bulk balance adjustment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-medium mb-1">Summary:</p>
            <p className="text-sm text-gray-600">
              • {selectedUserIds.length} users selected
              {amount && (
                <>
                  <br />• {parseFloat(amount) > 0 ? 'Adding' : 'Deducting'} ${Math.abs(parseFloat(amount) || 0).toFixed(2)} {parseFloat(amount) > 0 ? 'to' : 'from'} each account
                  <br />• Total amount: ${(Math.abs(parseFloat(amount) || 0) * selectedUserIds.length).toFixed(2)}
                </>
              )}
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !amount || selectedUserIds.length === 0}>
              {loading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Apply to {selectedUserIds.length} Users
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
