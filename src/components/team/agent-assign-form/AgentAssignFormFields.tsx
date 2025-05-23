
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Agent } from "@/services/agentService";
import { CompanyMember } from "@/services/memberService";
import { AgentAssignFormValues } from "../schemas/agentAssignFormSchema";

interface AgentAssignFormFieldsProps {
  form: UseFormReturn<AgentAssignFormValues>;
  teamMembers: CompanyMember[];
  agents: Agent[];
  selectedAgent?: Agent | null;
}

export const AgentAssignFormFields = ({ 
  form, 
  teamMembers, 
  agents, 
  selectedAgent 
}: AgentAssignFormFieldsProps) => {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="user_id"
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
                {teamMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.user_details?.name || member.user_details?.email || 'Unknown User'}
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
        name="agent_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Agent</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              defaultValue={selectedAgent?.id || field.value}
              disabled={!!selectedAgent}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
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
};
