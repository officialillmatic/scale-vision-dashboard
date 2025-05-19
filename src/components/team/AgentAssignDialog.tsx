
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Form,
} from '@/components/ui/form';
import { Agent, UserAgent } from '@/services/agentService';
import { CompanyMember } from '@/services/memberService';
import { agentAssignFormSchema, AgentAssignFormValues } from './schemas/agentAssignFormSchema';
import { AgentAssignFormHeader } from './agent-assign-form/AgentAssignFormHeader';
import { AgentAssignFormFields } from './agent-assign-form/AgentAssignFormFields';
import { AgentAssignFormFooter } from './agent-assign-form/AgentAssignFormFooter';
import { Skeleton } from '@/components/ui/skeleton';

interface AgentAssignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<UserAgent>) => Promise<boolean>;
  isSubmitting: boolean;
  teamMembers: CompanyMember[];
  agents: Agent[];
  selectedAgent: Agent | null;
}

export function AgentAssignDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  teamMembers,
  agents,
  selectedAgent
}: AgentAssignDialogProps) {
  const form = useForm<AgentAssignFormValues>({
    resolver: zodResolver(agentAssignFormSchema),
    defaultValues: {
      user_id: '',
      agent_id: selectedAgent?.id || '',
      is_primary: false,
    }
  });

  useEffect(() => {
    if (isOpen && selectedAgent) {
      form.setValue('agent_id', selectedAgent.id);
    }
  }, [isOpen, selectedAgent, form]);

  const handleSubmit = async (values: AgentAssignFormValues) => {
    const success = await onSubmit(values);
    if (success) {
      form.reset();
      onClose();
    }
  };

  const isLoading = !agents || !teamMembers;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <AgentAssignFormHeader />

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <AgentAssignFormFields 
                form={form} 
                teamMembers={teamMembers} 
                agents={agents}
              />
              <AgentAssignFormFooter 
                isSubmitting={isSubmitting} 
                onClose={onClose}
              />
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
