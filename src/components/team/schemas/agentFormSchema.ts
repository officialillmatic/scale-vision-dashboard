
import { z } from "zod";

export const agentFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().optional(),
  avatar_url: z.string().url({ message: "Please enter a valid URL" }).optional().nullable(),
  status: z.enum(['active', 'inactive', 'maintenance'], {
    required_error: "Please select a status",
  })
});

export type AgentFormValues = z.infer<typeof agentFormSchema>;
