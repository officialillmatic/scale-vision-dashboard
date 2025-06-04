
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader, DollarSign, Plus, Minus } from 'lucide-react';

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
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    if (open && userId) {
      fetchUserInfo();
    } else {
      resetForm();
    }
  }, [open, userId]);

  const fetchUserInfo = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('admin_user_credits_view')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserInfo(data);
    } catch (error: any) {
      toast.error(`Failed to fetch user info: ${error.message}`);
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setUserInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !user?.id || !amount) return;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_adjust_user_credits', {
        p_user_id: userId,
        p_amount: numericAmount,
        p_description: description || `Admin balance adjustment: ${numericAmount > 0 ? '+' : ''}${numericAmount}`,
        p_admin_id: user.id
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Balance updated successfully. New balance: $${data.new_balance.toFixed(2)}`);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(data?.error || 'Failed to update balance');
      }
    } catch (error: any) {
      toast.error(`Failed to update balance: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust User Credits</DialogTitle>
        </DialogHeader>
        
        {userInfo && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{userInfo.email}</p>
                {userInfo.name && <p className="text-sm text-gray-600">{userInfo.name}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className="text-lg font-bold">${userInfo.current_balance.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Enter amount (positive to add, negative to deduct)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(10)}
              >
                <Plus className="h-3 w-3 mr-1" />
                $10
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(50)}
              >
                <Plus className="h-3 w-3 mr-1" />
                $50
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(-10)}
              >
                <Minus className="h-3 w-3 mr-1" />
                $10
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(-50)}
              >
                <Minus className="h-3 w-3 mr-1" />
                $50
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Reason for balance adjustment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !amount}>
              {loading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Update Balance
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
