
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UseFormReturn } from 'react-hook-form';
import type { CompanyMember } from '@/services/memberService';

interface Agent {
  id: string;
  name: string;
  description?: string;
  status: string;
}

interface AgentAssignFormFieldsProps {
  form: UseFormReturn<any>;
  members: CompanyMember[];
  agents: Agent[];
}

export function AgentAssignFormFields({ form, members, agents }: AgentAssignFormFieldsProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="userId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Team Member</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{member.full_name || member.email}</span>
                      <Badge variant="outline" className="ml-2">
                        {member.role}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="agentId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Agent</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {agents.filter(agent => agent.status === 'active').map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{agent.name}</span>
                      {agent.description && (
                        <span className="text-xs text-muted-foreground">{agent.description}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
