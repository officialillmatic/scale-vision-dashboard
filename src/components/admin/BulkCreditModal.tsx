import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Plus, Minus, RefreshCw } from 'lucide-react';

interface BulkCreditModalProps {
  selectedUserIds: string[];
  onClose: () => void;
  onAdjust: (userId: string, amount: number, description: string, type: 'add' | 'subtract') => Promise<void>;
  onSuccess: () => void;
}

export function BulkCreditModal({
  selectedUserIds,
  onClose,
  onAdjust,
  onSuccess
}: BulkCreditModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (type: 'add' | 'subtract') => {
    if (selectedUserIds.length === 0 || !amount) {
      toast.error('Please select users and enter an amount');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    setIsLoading(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const userId of selectedUserIds) {
        try {
          console.log(`Processing user ${userId} with amount ${numericAmount} (${type})`);
          
          // Usar la función onAdjust que viene del panel principal
          await onAdjust(
            userId, 
            numericAmount, 
            description || `Bulk admin ${type}: ${numericAmount}`, 
            type
          );
          
          successCount++;
        } catch (err: any) {
          errorCount++;
          errors.push(`User ${userId}: ${err.message}`);
          console.error(`Error processing user ${userId}:`, err);
        }
      }

      console.log(`Bulk operation completed: ${successCount} success, ${errorCount} errors`);

      if (errorCount === 0) {
        toast.success(`Successfully ${type === 'add' ? 'added' : 'deducted'} credits for ${successCount} users`);
      } else if (successCount > 0) {
        toast.warning(`Partially completed: ${successCount} succeeded, ${errorCount} failed`);
        console.log('Errors:', errors);
      } else {
        toast.error(`All updates failed. First error: ${errors[0]}`);
        console.log('All errors:', errors);
      }

      if (successCount > 0) {
        onSuccess();
        onClose();
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Credit Adjustment
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
              min="0"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Reason for bulk adjustment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => handleSubmit('add')}
              disabled={isLoading || !amount || selectedUserIds.length === 0}
              className="flex-1"
              variant="default"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Credits
            </Button>
            
            <Button
              onClick={() => handleSubmit('subtract')}
              disabled={isLoading || !amount || selectedUserIds.length === 0}
              className="flex-1"
              variant="destructive"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Minus className="h-4 w-4 mr-2" />
              )}
              Deduct Credits
            </Button>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Modal de Ajuste Individual (para compatibilidad completa)
export function CreditAdjustmentModal({ 
  userId, 
  currentBalance, 
  onClose, 
  onAdjust 
}: {
  userId: string;
  currentBalance: number;
  onClose: () => void;
  onAdjust: (userId: string, amount: number, description: string, type: 'add' | 'subtract') => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'add' | 'subtract'>('add');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    setLoading(true);
    try {
      await onAdjust(userId, parseFloat(amount), description, type);
      onClose();
    } catch (error) {
      // Error ya manejado en onAdjust
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Credits</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Current balance: <strong>${currentBalance.toFixed(2)}</strong>
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="block text-sm font-medium mb-2">Type of Adjustment</Label>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant={type === 'add' ? 'default' : 'outline'}
                onClick={() => setType('add')}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
              <Button
                type="button"
                variant={type === 'subtract' ? 'default' : 'outline'}
                onClick={() => setType('subtract')}
                className="flex-1"
              >
                <Minus className="w-4 h-4 mr-1" />
                Subtract
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reason for adjustment..."
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Apply Adjustment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
