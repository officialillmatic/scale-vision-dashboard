
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AgentFormValues } from '../schemas/agentFormSchema';
import { useRetellAgents } from '@/hooks/useRetellAgents';

interface AgentFormFieldsProps {
  form: UseFormReturn<AgentFormValues>;
}

export function AgentFormFields({ form }: AgentFormFieldsProps) {
  const { agents: retellAgents, isLoading: isLoadingRetellAgents } = useRetellAgents();

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Agent Name *</FormLabel>
            <FormControl>
              <Input placeholder="Enter agent name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Enter agent description" 
                {...field} 
                value={field.value || ''}
                className="min-h-[80px]"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="rate_per_minute"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rate per Minute ($)</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.02"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="avatar_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Avatar URL</FormLabel>
            <FormControl>
              <Input 
                placeholder="Enter avatar URL" 
                {...field} 
                value={field.value || ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="retell_agent_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Retell Agent</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              defaultValue={field.value}
              disabled={isLoadingRetellAgents}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a Retell agent" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="bg-white z-50">
                {retellAgents.map((agent) => (
                  <SelectItem key={agent.retell_agent_id} value={agent.retell_agent_id}>
                    {agent.display_text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
