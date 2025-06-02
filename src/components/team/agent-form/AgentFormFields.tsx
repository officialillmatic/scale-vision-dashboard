
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
import { useRetellAgents } from '@/hooks/useRetellAgents';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface AgentFormFieldsProps {
  form: UseFormReturn<AgentFormValues>;
}

export const AgentFormFields = ({ form }: AgentFormFieldsProps) => {
  const { agents, isLoading, error } = useRetellAgents();

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
            <FormLabel>Retell Agent</FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <SelectTrigger className="w-full">
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner />
                      <span>Loading agents...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Select a Retell agent" />
                  )}
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {error ? (
                    <div className="p-2">
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {error}
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : agents.length === 0 && !isLoading ? (
                    <div className="p-2 text-sm text-gray-500">
                      No agents available
                    </div>
                  ) : (
                    agents.map((agent) => (
                      <SelectItem 
                        key={agent.retell_agent_id} 
                        value={agent.retell_agent_id}
                        className="cursor-pointer"
                      >
                        {agent.display_text}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormControl>
            <FormDescription>
              Select a Retell AI agent to associate with this agent profile.
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
