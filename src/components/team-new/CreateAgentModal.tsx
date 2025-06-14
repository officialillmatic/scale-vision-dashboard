import { debugLog } from "@/lib/debug";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Bot } from "lucide-react";

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAgentModal({ isOpen, onClose, onSuccess }: CreateAgentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive' | 'maintenance',
    rate_per_minute: '0.02'
  });
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Agent name is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Agent description is required');
      return;
    }

    setIsCreating(true);
    try {
      // TODO: Implement agent creation
      debugLog('Creating agent:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setFormData({
        name: '',
        description: '',
        status: 'active',
        rate_per_minute: '0.02'
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setFormData({
        name: '',
        description: '',
        status: 'active',
        rate_per_minute: '0.02'
      });
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
              Create Custom AI Agent
            </DialogTitle>
            <DialogDescription>
              Create a new custom AI agent with specific settings and configurations.
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
                <Label htmlFor="name">Agent Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Sales Assistant Pro"
                  disabled={isCreating}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'active' | 'inactive' | 'maintenance') => 
                    setFormData(prev => ({ ...prev, status: value }))
                  }
                  disabled={isCreating}
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
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this agent does and its capabilities..."
                rows={3}
                disabled={isCreating}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rate">Rate per Minute (USD)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.rate_per_minute}
                onChange={(e) => setFormData(prev => ({ ...prev, rate_per_minute: e.target.value }))}
                disabled={isCreating}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !formData.name.trim() || !formData.description.trim()}>
              {isCreating ? 'Creating...' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
