
import React from 'react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface AgentAssignFormFooterProps {
  isSubmitting: boolean;
  onClose: () => void;
}

export function AgentAssignFormFooter({ isSubmitting, onClose }: AgentAssignFormFooterProps) {
  return (
    <DialogFooter className="mt-4">
      <Button type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            Assigning...
          </>
        ) : (
          'Assign Agent'
        )}
      </Button>
    </DialogFooter>
  );
}
