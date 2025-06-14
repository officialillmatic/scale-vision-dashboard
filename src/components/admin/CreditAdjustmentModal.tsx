import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, Plus, Minus, RefreshCw } from 'lucide-react';

interface CreditAdjustmentModalProps {
  userId: string;
  currentBalance: number;
  onClose: () => void;
  onAdjust: (userId: string, amount: number, description: string, type: 'add' | 'subtract') => Promise<void>;
}

export function CreditAdjustmentModal({
  userId,
  currentBalance,
  onClose,
  onAdjust
}: CreditAdjustmentModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'add' | 'subtract'>('add');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Adjusting credits for user ${userId}: ${type} ${numericAmount}`);
      
      // Usar la función onAdjust que viene del panel principal
      await onAdjust(userId, numericAmount, description, type);
      
      // Si llegamos aquí, la operación fue exitosa
      onClose();
      setAmount('');
      setDescription('');
    } catch (error: any) {
      // El error ya fue manejado en la función onAdjust del panel
      console.error('Credit adjustment failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const newBalance = type === 'add' 
    ? currentBalance + (parseFloat(amount) || 0)
    : currentBalance - (parseFloat(amount) || 0);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Adjust User Credits
          </DialogTitle>
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
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Credits
              </Button>
              <Button
                type="button"
                variant={type === 'subtract' ? 'default' : 'outline'}
                onClick={() => setType('subtract')}
                className="flex-1"
                disabled={isLoading}
              >
                <Minus className="w-4 h-4 mr-1" />
                Subtract Credits
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
              disabled={isLoading}
              required
            />
            {amount && (
              <p className="text-xs text-muted-foreground mt-1">
                New balance will be: <strong>${newBalance.toFixed(2)}</strong>
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reason for adjustment..."
              disabled={isLoading}
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !amount || !description}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Apply {type === 'add' ? 'Credit' : 'Debit'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Versión compatible con props del modal anterior (para transición gradual)
export function CreditAdjustmentModalLegacy({
  open,
  onOpenChange,
  userId,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  onSuccess: () => void;
}) {
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
      console.log('Calling admin_adjust_user_credits with:', {
        p_user_id: userId,
        p_amount: finalAmount,
        p_description: description || `Admin balance ${isPositive ? 'credit' : 'debit'}: ${Math.abs(finalAmount)}`,
        p_admin_id: 'system'
      });

      const { data, error } = await supabase.rpc('admin_adjust_user_credits', {
        p_user_id: userId,
        p_amount: finalAmount,
        p_description: description || `Admin balance ${isPositive ? 'credit' : 'debit'}: ${Math.abs(finalAmount)}`,
        p_admin_id: 'system'
      });

      console.log('admin_adjust_user_credits response:', { data, error });

      if (error) {
        console.error('Credit adjustment error:', error);
        toast.error(`Failed to adjust credits: ${error.message}`);
        return;
      }

      toast.success(`Credits ${isPositive ? 'added' : 'deducted'} successfully`);
      onSuccess();
      onOpenChange(false);
      setAmount('');
      setDescription('');
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error(`Failed to adjust credits: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Adjust User Credits
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
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Reason for adjustment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
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
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Credits
            </Button>
            
            <Button
              onClick={() => handleSubmit(false)}
              disabled={isLoading || !amount}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
