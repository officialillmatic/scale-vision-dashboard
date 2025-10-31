
import React from 'react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Agent } from '@/services/agentService';

interface AgentFormFooterProps {
  isSubmitting: boolean;
  onClose: () => void;
  agent: Agent | null;
}

export function AgentFormFooter({
  isSubmitting,
  onClose,
  agent
}: AgentFormFooterProps) {
  return (
    <DialogFooter className="mt-4">
      <Button type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            {agent ? 'Updating...' : 'Creating...'}
          </>
        ) : (
          agent ? 'Update Agent' : 'Create Agent'
        )}
      </Button>
    </DialogFooter>
  );
}
