
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Agent } from '@/services/agentService';
import { agentFormSchema, AgentFormValues } from './schemas/agentFormSchema';
import { AgentFormHeader } from './agent-form/AgentFormHeader';
import { AgentFormFields } from './agent-form/AgentFormFields';
import { AgentFormFooter } from './agent-form/AgentFormFooter';

interface AgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Agent>) => Promise<boolean>;
  isSubmitting: boolean;
  agent: Agent | null;
}

export function AgentDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  agent
}: AgentDialogProps) {
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: agent?.name || '',
      description: agent?.description || '',
      avatar_url: agent?.avatar_url || '',
      status: (agent?.status as 'active' | 'inactive') || 'active' // Cast to correct type
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: agent?.name || '',
        description: agent?.description || '',
        avatar_url: agent?.avatar_url || '',
        status: (agent?.status as 'active' | 'inactive') || 'active' // Cast to correct type
      });
    }
  }, [form, isOpen, agent]);

  const handleSubmit = async (values: AgentFormValues) => {
    const success = await onSubmit(values);
    if (success) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <AgentFormHeader agent={agent} />
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <AgentFormFields form={form} />
            <AgentFormFooter 
              isSubmitting={isSubmitting} 
              onClose={onClose}
              agent={agent}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
