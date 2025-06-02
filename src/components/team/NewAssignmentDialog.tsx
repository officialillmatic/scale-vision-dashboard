
import React, { useState, useEffect } from 'react';
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
  selectedAgent?: any; // Agent from the agents table
  isLoading: boolean;
  isSubmitting: boolean;
}

export function NewAssignmentDialog({
  isOpen,
  onClose,
  onSubmit,
  availableUsers,
  availableAgents,
  selectedAgent,
  isLoading,
  isSubmitting
}: NewAssignmentDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isPrimary, setIsPrimary] = useState<boolean>(false);

  // When dialog opens with a selected agent, find the corresponding retell_agent
  useEffect(() => {
    if (isOpen && selectedAgent) {
      console.log('🔍 [NewAssignmentDialog] Selected agent:', selectedAgent);
      
      // Find the corresponding retell_agent based on retell_agent_id
      const matchingRetellAgent = availableAgents.find(agent => 
        agent.retell_agent_id === selectedAgent.retell_agent_id
      );
      
      if (matchingRetellAgent) {
        console.log('🔍 [NewAssignmentDialog] Found matching retell agent:', matchingRetellAgent);
        setSelectedAgentId(matchingRetellAgent.id);
      } else {
        console.warn('🔍 [NewAssignmentDialog] No matching retell agent found for:', selectedAgent.retell_agent_id);
      }
    }
  }, [isOpen, selectedAgent, availableAgents]);

  const handleSubmit = () => {
    if (!selectedUserId || !selectedAgentId) {
      return;
    }
    
    console.log('🔍 [NewAssignmentDialog] Submitting assignment:', {
      userId: selectedUserId,
      agentId: selectedAgentId,
      isPrimary
    });
    
    onSubmit(selectedUserId, selectedAgentId, isPrimary);
    
    // Reset form
    setSelectedUserId('');
    setSelectedAgentId('');
    setIsPrimary(false);
  };

  const handleClose = () => {
    // Reset form when closing
    setSelectedUserId('');
    setSelectedAgentId('');
    setIsPrimary(false);
    onClose();
  };

  const canSubmit = selectedUserId && selectedAgentId && !isSubmitting;

  console.log('🔍 [NewAssignmentDialog] Render state:', {
    isOpen,
    isLoading,
    availableUsersCount: availableUsers.length,
    availableAgentsCount: availableAgents.length,
    selectedUserId,
    selectedAgentId,
    selectedAgent: selectedAgent?.name,
    canSubmit
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {selectedAgent 
              ? `Assign ${selectedAgent.name} to User`
              : 'Create New Assignment'
            }
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User ({availableUsers.length} available)</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name ? `${user.full_name} (${user.email})` : user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-select">
                {selectedAgent 
                  ? `Agent: ${selectedAgent.name}`
                  : `Select Agent (${availableAgents.length} available)`
                }
              </Label>
              <Select 
                value={selectedAgentId} 
                onValueChange={setSelectedAgentId}
                disabled={!!selectedAgent}
              >
                <SelectTrigger id="agent-select">
                  <SelectValue placeholder={selectedAgent ? selectedAgent.name : "Choose an agent..."} />
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
          <Button variant="outline" onClick={handleClose}>
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
