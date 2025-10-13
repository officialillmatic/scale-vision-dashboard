import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Bot } from 'lucide-react';
import { updateAgent } from '@/services/agent/agentMutations';
import { Agent } from '@/services/agentService';

interface EditAgentModalProps {
  isOpen: boolean;
  agent: Agent | null;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Modal for editing an existing custom AI agent. It pre‑populates the form
 * fields with the provided agent’s current values and persists changes
 * through the `updateAgent` service function. Errors are displayed inline.
 */
export function EditAgentModal({ isOpen, agent, onClose, onSuccess }: EditAgentModalProps) {
  // Local form state mirrors the editable fields of the agent. When the
  // modal opens or the agent prop changes, initialise the state.
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive' | 'maintenance',
    rate_per_minute: '0.02'
  });
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || '',
        description: agent.description || '',
        status: (agent.status as 'active' | 'inactive' | 'maintenance') || 'active',
        rate_per_minute: String(agent.rate_per_minute ?? 0.02)
      });
    }
  }, [agent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;
    setError(null);

    // Basic form validation
    if (!formData.name.trim()) {
      setError('Agent name is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Agent description is required');
      return;
    }
    const rate = parseFloat(formData.rate_per_minute);
    if (isNaN(rate) || rate < 0) {
      setError('Rate must be a positive number');
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await updateAgent(agent.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        rate_per_minute: rate,
      });
      if (!updated) {
        throw new Error('Agent could not be updated');
      }
      // Reset and notify parent
      setError(null);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update agent');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    if (!isUpdating) {
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
              <Bot className="h-5 w-5" />
              Edit AI Agent
            </DialogTitle>
            <DialogDescription>
              Modify the details of your custom AI agent below. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Agent Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'inactive' | 'maintenance') =>
                    setFormData(prev => ({ ...prev, status: value }))
                  }
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-rate">Rate per Minute (USD)</Label>
              <Input
                id="edit-rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.rate_per_minute}
                onChange={(e) => setFormData(prev => ({ ...prev, rate_per_minute: e.target.value }))}
                disabled={isUpdating}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isUpdating || !formData.name.trim() || !formData.description.trim() || isNaN(parseFloat(formData.rate_per_minute))
              }
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
