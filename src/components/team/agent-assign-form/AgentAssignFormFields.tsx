
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Agent } from '@/services/agentService';
import { CompanyMember } from '@/services/companyService';
import { AgentAssignFormValues } from '../schemas/agentAssignFormSchema';

interface AgentAssignFormFieldsProps {
  form: UseFormReturn<AgentAssignFormValues>;
  teamMembers: CompanyMember[];
  agents: Agent[];
}

export function AgentAssignFormFields({ form, teamMembers, agents }: AgentAssignFormFieldsProps) {
  const activeTeamMembers = teamMembers.filter(member => member.status === 'active');

  return (
    <>
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
    </>
  );
}
