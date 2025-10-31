
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader, DollarSign, CreditCard, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function BillingSettings() {
  const { company } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const [isUpdating, setIsUpdating] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const handleUpdateBalance = async () => {
    if (!amount || !selectedUserId || !company?.id) {
      toast.error('Please fill in all required fields');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsUpdating(true);
    try {
      console.log('Calling admin_update_user_credits from BillingSettings:', {
        target_user_id: selectedUserId,
        amount_change: numericAmount,
        description_text: description || `Admin balance adjustment: ${numericAmount > 0 ? '+' : ''}${numericAmount}`
      });

      // Usar la función temporal admin_update_user_credits
      const { data, error } = await supabase.rpc('admin_update_user_credits', {
        target_user_id: selectedUserId,
        amount_change: numericAmount,
        description_text: description || `Admin balance adjustment: ${numericAmount > 0 ? '+' : ''}${numericAmount}`
      });

      console.log('admin_update_user_credits response:', { data, error });

      if (error) {
        console.error('Balance update error:', error);
        toast.error(`Failed to update balance: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          toast.success(`Balance updated successfully. New balance: $${result.new_balance}`);
          setAmount('');
          setDescription('');
          setSelectedUserId('');
        } else {
          toast.error(`Failed to update balance: ${result.message}`);
        }
      } else {
        toast.success('Balance updated successfully');
        setAmount('');
        setDescription('');
        setSelectedUserId('');
      }
      
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error(`Failed to update balance: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Only super administrators can access billing settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Admin Balance Management (Temporary Function)
            <Badge variant="destructive" className="ml-2">
              ADMIN ONLY
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Enter user ID"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="Enter amount (positive to add, negative to deduct)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Reason for balance adjustment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleUpdateBalance}
            disabled={isUpdating || !amount || !selectedUserId}
            className="w-full"
          >
            {isUpdating ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Updating Balance...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Update User Balance
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Super Admin Privileges (Temporary)</h4>
              <p className="text-sm text-blue-700">
                Using temporary function for testing. As a super administrator, you have access to:
              </p>
              <ul className="list-disc list-inside text-sm text-blue-700 mt-2">
                <li>Adjust user balances across all companies</li>
                <li>View global billing and transaction data</li>
                <li>Manage billing settings for all users</li>
                <li>Access detailed financial reports</li>
              </ul>
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Usage Guidelines:</p>
              <ul className="space-y-1">
                <li>• Use positive amounts to add credits to user accounts</li>
                <li>• Use negative amounts to deduct credits from user accounts</li>
                <li>• Always provide a clear description for audit purposes</li>
                <li>• Balance changes are logged as transactions for transparency</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
