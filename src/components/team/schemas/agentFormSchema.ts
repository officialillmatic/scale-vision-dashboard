
import { z } from 'zod';

export const agentFormSchema = z.object({
  name: z.string().min(1, {
    message: "Name is required"
  }),
  description: z.string().optional(),
  avatar_url: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')),
  status: z.enum(["active", "inactive", "maintenance"]),
  rate_per_minute: z.number().min(0, { message: "Rate must be non-negative" }).optional(),
  retell_agent_id: z.string().optional()
});

export type AgentFormValues = z.infer<typeof agentFormSchema>;
