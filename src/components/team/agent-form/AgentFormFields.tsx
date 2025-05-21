
import React from 'react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { AgentFormValues } from '../schemas/agentFormSchema';

interface AgentFormFieldsProps {
  form: UseFormReturn<AgentFormValues>;
}

export const AgentFormFields = ({ form }: AgentFormFieldsProps) => {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Virtual Assistant" {...field} />
            </FormControl>
            <FormDescription>
              The name of the AI agent visible to users.
            </FormDescription>
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
                placeholder="An AI assistant that helps with customer support..." 
                {...field} 
                value={field.value || ''}
              />
            </FormControl>
            <FormDescription>
              A brief description of the agent's purpose and abilities.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="avatar_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Avatar URL</FormLabel>
            <FormControl>
              <Input 
                placeholder="https://example.com/avatar.png" 
                {...field} 
                value={field.value || ''}
              />
            </FormControl>
            <FormDescription>
              A URL to an image to use as the agent's avatar.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="rate_per_minute"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Rate Per Minute ($)</FormLabel>
            <FormControl>
              <Input 
                type="number"
                step="0.01"
                placeholder="0.02" 
                {...field} 
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  field.onChange(value);
                }}
                value={field.value === undefined ? '' : field.value}
              />
            </FormControl>
            <FormDescription>
              The cost per minute for using this agent.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="retell_agent_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Agent ID</FormLabel>
            <FormControl>
              <Input 
                placeholder="agent_123456789" 
                {...field} 
                value={field.value || ''}
              />
            </FormControl>
            <FormDescription>
              The internal reference ID for this agent.
            </FormDescription>
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
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              The current status of the agent.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};
