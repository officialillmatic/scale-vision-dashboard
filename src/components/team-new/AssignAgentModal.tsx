import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Users } from 'lucide-react';
import { assignAgentToUser } from '@/services/agent/agentMutations';
import { Agent } from '@/services/agentService';

interface AssignAgentModalProps {
  isOpen: boolean;
  agent: Agent | null;
  defaultCompanyId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Modal for assigning a custom AI agent to a user. It prompts for the user ID
 * (and optionally company ID) and allows setting the assignment as the
 * user’s primary agent. On submit it calls the `assignAgentToUser` service.
 */
export function AssignAgentModal({ isOpen, agent, defaultCompanyId, onClose, onSuccess }: AssignAgentModalProps) {
  const [userId, setUserId] = useState('');
  const [companyId, setCompanyId] = useState(defaultCompanyId || '');
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;
    setError(null);

    if (!userId.trim()) {
      setError('User ID is required');
      return;
    }

    setIsAssigning(true);
    try {
      const newAssignment = await assignAgentToUser({
        user_id: userId.trim(),
        agent_id: agent.id,
        company_id: companyId.trim() || undefined,
        is_primary: isPrimary,
      });
      if (!newAssignment) {
        throw new Error('Assignment could not be created');
      }
      onSuccess();
      // Reset fields after successful assignment
      setUserId('');
      setCompanyId(defaultCompanyId || '');
      setIsPrimary(false);
    } catch (err: any) {
      setError(err.message || 'Failed to assign agent');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    if (!isAssigning) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assign Agent
            </DialogTitle>
            <DialogDescription>
              Specify the user ID (and optional company ID) to assign this agent. You can also mark the
              agent as primary for the user.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="assign-user">User ID *</Label>
              <Input
                id="assign-user"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={isAssigning}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assign-company">Company ID (optional)</Label>
              <Input
                id="assign-company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={isAssigning}
              />
            </div>

            <div className="space-y-2">
              <Label>Set as Primary?</Label>
              <Select
                value={isPrimary ? 'yes' : 'no'}
                onValueChange={(val: 'yes' | 'no') => setIsPrimary(val === 'yes')}
                disabled={isAssigning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isAssigning}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isAssigning || !userId.trim()}
            >
              {isAssigning ? 'Assigning...' : 'Assign Agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
