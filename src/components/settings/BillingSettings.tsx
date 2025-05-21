
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type TransactionType = 'deposit' | 'deduction' | 'adjustment';

export const BillingSettings = () => {
  const { user, company } = useAuth();
  const { isCompanyOwner, checkRole } = useRole();
  const isAdmin = checkRole('admin');
  const { members, isLoading: isLoadingMembers } = useTeamMembers(company?.id);
  const queryClient = useQueryClient();

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [transactionType, setTransactionType] = useState<TransactionType>("deposit");
  const [description, setDescription] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const updateBalanceMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        },
        body: JSON.stringify({
          targetUserId: selectedUserId,
          amount: parseFloat(amount),
          transactionType,
          description
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update balance');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Successfully ${transactionType}ed ${data.transactionAmount} to user balance`);
      
      // Reset form
      setAmount("");
      setDescription("");
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      queryClient.invalidateQueries({ queryKey: ['user-transactions'] });
    },
    onError: (error) => {
      toast.error(`Error updating balance: ${error.message}`);
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    updateBalanceMutation.mutate();
  };

  // Only company admins and owners can manage billing
  if (!isAdmin && !isCompanyOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing Settings</CardTitle>
          <CardDescription>Manage user balances and transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You don't have permission to manage billing settings.
            Please contact your company administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Settings</CardTitle>
        <CardDescription>Manage user balances and transaction history</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Update User Balance</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="user">Select User</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                  disabled={isLoadingMembers || isProcessing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map(member => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.user_details?.email || member.user_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="transaction-type">Transaction Type</Label>
                <Select
                  value={transactionType}
                  onValueChange={(value) => setTransactionType(value as TransactionType)}
                  disabled={isProcessing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select transaction type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Deposit (Add Funds)</SelectItem>
                    <SelectItem value="deduction">Deduction (Remove Funds)</SelectItem>
                    <SelectItem value="adjustment">Adjustment (Set Exact Amount)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  disabled={isProcessing}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
                  disabled={isProcessing}
                />
              </div>
            </div>
            
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Update Balance'}
            </Button>
          </form>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Balance Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure when users will see low balance warnings and other balance-related settings.
          </p>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="threshold">Low Balance Warning Threshold ($)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="threshold"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="10.00"
                  disabled={true}
                />
                <Button variant="outline" disabled={true}>Save</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Users will see a warning when their balance falls below this amount.
                This feature will be available in a future update.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
