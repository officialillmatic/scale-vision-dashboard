
import { z } from "zod";

export const agentAssignFormSchema = z.object({
  user_id: z.string().min(1, { message: "Please select a team member" }),
  agent_id: z.string().min(1, { message: "Please select an agent" }),
  company_id: z.string().min(1, { message: "Company ID is required" }),
  is_primary: z.boolean().default(false),
});

export type AgentAssignFormValues = z.infer<typeof agentAssignFormSchema>;
