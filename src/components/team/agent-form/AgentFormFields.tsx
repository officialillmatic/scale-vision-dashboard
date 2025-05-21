
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { AgentFormValues } from "../schemas/agentFormSchema";

interface AgentFormFieldsProps {
  form: UseFormReturn<AgentFormValues>;
}

export function AgentFormFields({ form }: AgentFormFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Agent name" {...field} />
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
                placeholder="Brief description of the agent's capabilities" 
                {...field} 
                value={field.value || ""}
              />
            </FormControl>
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
                value={field.value || ""} 
              />
            </FormControl>
            <FormDescription>
              Optional URL to an image for this agent
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
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      
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
                placeholder="0.02" 
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                value={field.value || 0.02}
              />
            </FormControl>
            <FormDescription>
              Cost per minute for using this agent
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
            <FormLabel>Retell Agent ID</FormLabel>
            <FormControl>
              <Input 
                placeholder="External agent ID from Retell.ai" 
                {...field} 
                value={field.value || ""} 
              />
            </FormControl>
            <FormDescription>
              ID of the corresponding agent in the Retell.ai platform
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
