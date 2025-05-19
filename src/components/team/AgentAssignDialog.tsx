
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Agent, UserAgent } from '@/services/agentService';
import { CompanyMember } from '@/services/companyService';
import { Checkbox } from '@/components/ui/checkbox';

interface AgentAssignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<UserAgent>) => Promise<boolean>;
  isSubmitting: boolean;
  teamMembers: CompanyMember[];
  agents: Agent[];
  selectedAgent: Agent | null;
}

const formSchema = z.object({
  user_id: z.string().min(1, { message: "Please select a team member" }),
  agent_id: z.string().min(1, { message: "Please select an agent" }),
  is_primary: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export function AgentAssignDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  teamMembers,
  agents,
  selectedAgent
}: AgentAssignDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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

  const handleSubmit = async (values: FormValues) => {
    const success = await onSubmit(values);
    if (success) {
      form.reset();
      onClose();
    }
  };

  const activeTeamMembers = teamMembers.filter(member => member.status === 'active');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Agent to Team Member</DialogTitle>
          <DialogDescription>
            Assign an AI agent to a team member. Each member can have multiple agents,
            but only one primary agent.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Member</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeTeamMembers.length > 0 ? (
                        activeTeamMembers.map(member => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.user_details?.email}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-members" disabled>
                          No active members available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {agents.length > 0 ? (
                        agents.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-agents" disabled>
                          No agents available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_primary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Make Primary Agent
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      This will be the default agent for this team member
                    </p>
                  </div>
                </FormItem>
              )}
            />

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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
