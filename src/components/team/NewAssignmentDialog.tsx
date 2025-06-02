
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AssignmentUser, AssignmentAgent } from '@/services/agent/assignmentHelpers';

interface NewAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userId: string, agentId: string, isPrimary: boolean) => void;
  availableUsers: AssignmentUser[];
  availableAgents: AssignmentAgent[];
  isLoading: boolean;
  isSubmitting: boolean;
}

export function NewAssignmentDialog({
  isOpen,
  onClose,
  onSubmit,
  availableUsers,
  availableAgents,
  isLoading,
  isSubmitting
}: NewAssignmentDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isPrimary, setIsPrimary] = useState<boolean>(false);

  const handleSubmit = () => {
    if (!selectedUserId || !selectedAgentId) {
      return;
    }
    
    onSubmit(selectedUserId, selectedAgentId, isPrimary);
    
    // Reset form
    setSelectedUserId('');
    setSelectedAgentId('');
    setIsPrimary(false);
  };

  const canSubmit = selectedUserId && selectedAgentId && !isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-select">Select Agent</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger id="agent-select">
                  <SelectValue placeholder="Choose an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Primary Agent</Label>
                <div className="text-sm text-muted-foreground">
                  Set this agent as the primary agent for this user
                </div>
              </div>
              <Switch
                checked={isPrimary}
                onCheckedChange={setIsPrimary}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              'Create Assignment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
