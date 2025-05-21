
import { z } from "zod";

export const agentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  avatar_url: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance"]),
  rate_per_minute: z.number().min(0, "Rate cannot be negative").default(0.02),
  retell_agent_id: z.string().optional()
});

export type AgentFormValues = z.infer<typeof agentFormSchema>;
