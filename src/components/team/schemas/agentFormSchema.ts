
import { z } from 'zod';

export const agentFormSchema = z.object({
  name: z.string().min(1, 'Agent name is required'),
  description: z.string().optional(),
  avatar_url: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'), // Remove 'maintenance' to match Agent interface
});

export type AgentFormValues = z.infer<typeof agentFormSchema>;
